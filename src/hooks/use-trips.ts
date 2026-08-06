"use client";

import { useLiveQuery } from "dexie-react-hooks";
import db, { type Trip } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { auth, isSyncEnabled } from "@/lib/auth";
import { createSharedTrip, pushTrip, deleteTripRemote, deleteSelectionRemote } from "@/lib/wish-sync";

export function useTrips() {
  const { currentTripId, setCurrentTripId } = useAppStore();

  const trips = useLiveQuery(async () => {
    const all = await db.trips.toArray();
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  });

  const currentTrip = useLiveQuery(
    () => (currentTripId ? db.trips.get(currentTripId) : undefined),
    [currentTripId]
  );

  // Separate template trips from regular trips
  const regularTrips = (trips ?? []).filter((t) => !t.isTemplate);
  const templateTrips = (trips ?? []).filter((t) => t.isTemplate);

  // Categorize regular trips by timing
  const today = new Date().toISOString().split("T")[0];
  const futureTrips = regularTrips.filter(
    (t) => !t.isArchived && (t.startDate === "" || t.startDate >= today)
  );
  const recentTrips = regularTrips.filter(
    (t) => !t.isArchived && t.endDate !== "" && t.endDate < today
  );
  const archivedTrips = regularTrips.filter((t) => t.isArchived);

  const createTrip = async (data: {
    name: string;
    startDate: string;
    endDate: string;
    isTemplate?: boolean;
  }) => {
    const id = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const trip: Trip = {
      id,
      name: data.name,
      startDate: data.isTemplate ? "" : data.startDate,
      endDate: data.isTemplate ? "" : data.endDate,
      isTemplate: data.isTemplate ?? false,
      phase: "plan",
      createdAt: now,
      updatedAt: now,
    };
    await db.trips.add(trip);
    setCurrentTripId(id);
    const user = auth.currentUser;
    if (user && isSyncEnabled(user)) {
      // Awaited (not fire-and-forget) — the trip's key and keyWrap need to
      // exist remotely before the caller can do anything sync-dependent
      // with it, like immediately opening Collaborate and generating an
      // invite. Falls back to the startSync() self-heal sweep if it fails.
      // displayName comes from the sign-in provider (Apple/Google often
      // supply one) — absent for anonymous/email-link; falls back to the
      // uid-slice display in the roster until the owner sets one manually.
      await createSharedTrip(trip, user.uid, user.displayName ?? undefined).catch(() => {});
    }
    return id;
  };

  const updateTrip = async (id: string, data: Partial<Omit<Trip, "id" | "createdAt">>) => {
    await db.trips.update(id, { ...data, updatedAt: Date.now() });
    const user = auth.currentUser;
    if (user && isSyncEnabled(user)) {
      const updated = await db.trips.get(id);
      if (updated) pushTrip(updated, user.uid).catch(() => {});
    }
  };

  const createFromTemplate = async (
    templateId: string,
    name: string,
    startDate: string,
    endDate: string
  ) => {
    const template = await db.trips.get(templateId);
    if (!template) return null;

    const id = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    // Copy template data but with new dates and non-template flag
    const trip: Trip = {
      ...template,
      id,
      name,
      startDate,
      endDate,
      isTemplate: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.trips.add(trip);

    // Also clone wish selections from the template
    const wishSelections = await db.tripWishSelections
      .where("tripId")
      .equals(templateId)
      .toArray();
    if (wishSelections.length > 0) {
      const cloned = wishSelections.map((s) => ({
        ...s,
        id: `${id}__${s.wishId}`,
        tripId: id,
        addedAt: now,
      }));
      await db.tripWishSelections.bulkAdd(cloned);
    }

    // Clone packing selections from the template
    const packingSelections = await db.tripPackingSelections
      .where("tripId")
      .equals(templateId)
      .toArray();
    if (packingSelections.length > 0) {
      const cloned = packingSelections.map((s) => ({
        ...s,
        id: `${id}__${s.itemId}`,
        tripId: id,
        completed: false,
        addedAt: now,
      }));
      await db.tripPackingSelections.bulkAdd(cloned);
    }

    setCurrentTripId(id);
    return id;
  };

  const saveAsTemplate = async (tripId: string, templateName: string) => {
    const trip = await db.trips.get(tripId);
    if (!trip) return null;
    return createTrip({
      name: templateName,
      startDate: "",
      endDate: "",
      isTemplate: true,
    });
  };

  const archiveTrip = async (id: string, fileName?: string) => {
    await db.trips.update(id, { isArchived: true, archiveFileName: fileName, updatedAt: Date.now() });
    if (currentTripId === id) setCurrentTripId(null);
    const user = auth.currentUser;
    if (user && isSyncEnabled(user)) {
      const updated = await db.trips.get(id);
      if (updated) pushTrip(updated, user.uid).catch(() => {});
    }
  };

  const unarchiveTrip = async (id: string) => {
    await db.trips.update(id, { isArchived: false, updatedAt: Date.now() });
    const user = auth.currentUser;
    if (user && isSyncEnabled(user)) {
      const updated = await db.trips.get(id);
      if (updated) pushTrip(updated, user.uid).catch(() => {});
    }
  };

  /** Remove all trip data except the trip record itself (name + dates preserved). */
  const clearTrip = async (id: string) => {
    await db.transaction(
      "rw",
      [db.tripWishSelections, db.tripPackingSelections, db.dayItems, db.scheduledEvents, db.trails],
      async () => {
        await db.tripWishSelections.where("tripId").equals(id).delete();
        await db.tripPackingSelections.where("tripId").equals(id).delete();
        await db.dayItems.where("tripId").equals(id).delete();
        await db.scheduledEvents.where("tripId").equals(id).delete();
        await db.trails.where("tripId").equals(id).delete();
      }
    );
  };

  /** Permanently delete the trip and all its associated data. */
  const deleteTrip = async (id: string) => {
    const user = auth.currentUser;
    // Collect selection IDs before deleting locally so we can tombstone them in Firestore
    const selectionIds = (await db.tripWishSelections.where("tripId").equals(id).toArray()).map(s => s.id);

    await db.transaction(
      "rw",
      [db.trips, db.tripWishSelections, db.tripPackingSelections, db.dayItems, db.scheduledEvents, db.trails],
      async () => {
        await db.tripWishSelections.where("tripId").equals(id).delete();
        await db.tripPackingSelections.where("tripId").equals(id).delete();
        await db.dayItems.where("tripId").equals(id).delete();
        await db.scheduledEvents.where("tripId").equals(id).delete();
        await db.trails.where("tripId").equals(id).delete();
        await db.trips.delete(id);
      }
    );
    if (currentTripId === id) setCurrentTripId(null);

    if (user && isSyncEnabled(user)) {
      deleteTripRemote(id, user.uid).catch(() => {});
      selectionIds.forEach(sid => {
        deleteSelectionRemote(sid, user.uid, id).catch(() => {});
      });
    }
  };

  return {
    trips: trips ?? [],
    regularTrips,
    templateTrips,
    futureTrips,
    recentTrips,
    archivedTrips,
    currentTrip,
    createTrip,
    updateTrip,
    createFromTemplate,
    saveAsTemplate,
    archiveTrip,
    unarchiveTrip,
    clearTrip,
    deleteTrip,
    loading: trips === undefined,
  };
}
