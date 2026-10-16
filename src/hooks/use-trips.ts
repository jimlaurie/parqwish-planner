"use client";

import { useLiveQuery } from "dexie-react-hooks";
import db, { type Trip, type TripWishSelection, type TripPackingSelection } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { auth, isSyncEnabled } from "@/lib/auth";
import {
  startSharedTripCreate, whenTripCreated, pushTrip, deleteTripRemote, deleteSelectionRemote,
  pushSelection, pushWishMirror, pushPackingSelection, pushPackingItemMirror,
} from "@/lib/wish-sync";
import { templateContentFrom, newTripRecord, copyWishSelections, copyPackingSelections } from "@/lib/trip-template";
import { parkToday } from "@/lib/dates";

// ==================== TEMPLATE COPYING ====================

function newTripId(): string {
  return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Pushes a new trip's copied selections, plus the wish and packing item
 * content collaborators need to read them, once the trip itself exists in
 * Cloud Sync (its security rules check the trip doc).
 */
async function syncCopiedSelections(
  tripId: string,
  wishCopies: TripWishSelection[],
  packCopies: TripPackingSelection[],
  uid: string,
): Promise<void> {
  await whenTripCreated(tripId);
  const pushes = [
    ...wishCopies.map(async (sel) => {
      await pushSelection(sel, uid);
      const wish = await db.wishes.get(sel.wishId);
      if (wish) await pushWishMirror(tripId, wish, uid);
    }),
    ...packCopies.map(async (sel) => {
      await pushPackingSelection(sel, uid);
      const item = await db.packingItems.get(sel.itemId);
      if (item) await pushPackingItemMirror(tripId, item, uid);
    }),
  ];
  const failed = (await Promise.allSettled(pushes)).filter((r) => r.status === "rejected");
  if (failed.length) console.error(`[use-trips] ${failed.length} copied selection(s) didn't sync for ${tripId}:`, failed[0]);
}

/**
 * Saves a new trip or template holding copies of another trip's wishes and
 * packing (fresh: nothing done or packed), then creates it in Cloud Sync
 * like any new trip and syncs the copies.
 */
async function addTripWithCopies(trip: Trip, sourceTripId: string): Promise<void> {
  const user = auth.currentUser;
  const [wishSels, packSels] = await Promise.all([
    db.tripWishSelections.where("tripId").equals(sourceTripId).toArray(),
    db.tripPackingSelections.where("tripId").equals(sourceTripId).toArray(),
  ]);
  const wishCopies = copyWishSelections(wishSels, trip.id, trip.createdAt, user?.uid);
  const packCopies = copyPackingSelections(packSels, trip.id, trip.createdAt, user?.uid);
  await db.transaction("rw", db.trips, db.tripWishSelections, db.tripPackingSelections, async () => {
    await db.trips.add(trip);
    if (wishCopies.length) await db.tripWishSelections.bulkPut(wishCopies);
    if (packCopies.length) await db.tripPackingSelections.bulkPut(packCopies);
  });
  if (user && isSyncEnabled(user)) {
    startSharedTripCreate(trip, user.uid, user.displayName ?? undefined);
    syncCopiedSelections(trip.id, wishCopies, packCopies, user.uid)
      .catch((err) => console.error("[use-trips] copied selection sync failed:", err));
  }
}

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

  // Categorize regular trips by timing (the park's today: in UTC a trip
  // happening today moved to Recent at 5 PM Pacific)
  const today = parkToday();
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
    /** Travel details and notes filled in before the trip existed (the Edit Trip page's draft). */
    details?: Pick<Trip, "flights" | "hotels" | "transports" | "notes">;
  }) => {
    const id = newTripId();
    const now = Date.now();
    const trip: Trip = {
      ...data.details,
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
      // Not awaited: the trip is already saved locally, and a Firestore
      // write can take arbitrarily long to be acknowledged on a poor
      // connection — awaiting it here left the New Trip modal stuck on
      // "Creating...". createInvite waits on the pending upload instead, so
      // an invite can never point at a trip that doesn't exist remotely yet.
      // displayName comes from the sign-in provider (Apple/Google often
      // supply one) — absent for anonymous/email-link; falls back to the
      // uid-slice display in the roster until the owner sets one manually.
      startSharedTripCreate(trip, user.uid, user.displayName ?? undefined);
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

  /** A new trip from a template: its wishes, packing and travel details, with the given name and dates. */
  const createFromTemplate = async (
    templateId: string,
    name: string,
    startDate: string,
    endDate: string
  ) => {
    const template = await db.trips.get(templateId);
    if (!template) return null;
    const trip = newTripRecord(
      { id: newTripId(), name, startDate, endDate, isTemplate: false, now: Date.now() },
      templateContentFrom(template),
    );
    await addTripWithCopies(trip, templateId);
    setCurrentTripId(trip.id);
    return trip.id;
  };

  /** Saves a trip's reusable content (see trip-template.ts) as a new template. Stays on the current trip. */
  const saveAsTemplate = async (tripId: string, templateName: string) => {
    const source = await db.trips.get(tripId);
    if (!source) return null;
    const template = newTripRecord(
      { id: newTripId(), name: templateName, startDate: "", endDate: "", isTemplate: true, now: Date.now() },
      templateContentFrom(source),
    );
    await addTripWithCopies(template, tripId);
    return template.id;
  };

  /** Stars one template as the default (or none, with null); at most one is ever starred. */
  const setDefaultTemplate = async (templateId: string | null) => {
    const templates = await db.trips.filter((t) => t.isTemplate).toArray();
    for (const t of templates) {
      const want = t.id === templateId;
      if (!!t.isDefaultTemplate !== want) await updateTrip(t.id, { isDefaultTemplate: want });
    }
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
    setDefaultTemplate,
    archiveTrip,
    unarchiveTrip,
    clearTrip,
    deleteTrip,
    loading: trips === undefined,
  };
}
