"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, {
  type PackingItem,
  type PackingType,
  type TripPackingSelection,
  type Wish,
  type TripWishSelection,
  type DayItemRecord,
} from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { PRIORITY_SORT_ORDER, PACKING_TABS } from "@/lib/constants";
import { auth, isSyncEnabled, canCollaborate } from "@/lib/auth";
import {
  pushPackingItem,
  pushPackingSelection,
  deletePackingItemRemote,
  deletePackingSelectionRemote,
  pushPackingItemMirror,
  deletePackingItemMirrorRemote,
  pushDayItem,
  pushWish,
  pushSelection,
  pushWishMirror,
} from "@/lib/wish-sync";
import { useTrips } from "@/hooks/use-trips";
import { useParkData } from "@/hooks/use-park-data";
import { addDayItemsBatch } from "@/hooks/use-day-items";

// Parses a free-text 12-hour reservation time (e.g. "7:00 PM") to 24-hour
// HH:MM for DayItem scheduling — same regex as Preview's
// handleScheduleReservation (web/src/app/preview/page.tsx), duplicated here
// since usePackingItems and the Preview page hook can't share a React-free
// utility without a larger refactor of either.
function reservationTimeTo24Hour(reservationTime: string): string {
  let time24 = reservationTime;
  const match = reservationTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let hour = parseInt(match[1]);
    const min = match[2];
    const period = match[3].toUpperCase();
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    time24 = `${hour.toString().padStart(2, "0")}:${min}`;
  }
  return time24;
}

// ==================== SYNC HELPERS ====================
// Catalog (item content, account-scoped) stays Apple-gated — it's this
// account's own cross-device catalog. Trip selections + the content mirror
// (what makes a collaborator's item visible to other members) work for any
// signed-in identity — see auth.ts canCollaborate() vs isSyncEnabled().

function syncPackingItem(item: PackingItem) {
  const user = auth.currentUser;
  if (!user || !isSyncEnabled(user)) return;
  pushPackingItem(item, user.uid).catch(
    (err) => console.error("[use-packing-items] sync push failed:", err)
  );
}

function syncDeletePackingItem(id: string) {
  const user = auth.currentUser;
  if (!user || !isSyncEnabled(user)) return;
  deletePackingItemRemote(id, user.uid).catch(
    (err) => console.error("[use-packing-items] sync delete failed:", err)
  );
}

function syncPackingSelection(sel: TripPackingSelection) {
  const user = auth.currentUser;
  if (!user || !canCollaborate(user)) return;
  pushPackingSelection(sel, user.uid).catch(
    (err) => console.error("[use-packing-items] sync selection push failed:", err)
  );
}

function syncDeletePackingSelection(id: string, tripId: string) {
  const user = auth.currentUser;
  if (!user || !canCollaborate(user)) return;
  deletePackingSelectionRemote(id, user.uid, tripId).catch(
    (err) => console.error("[use-packing-items] sync selection delete failed:", err)
  );
}

function syncPackingItemMirror(tripId: string, item: PackingItem) {
  const user = auth.currentUser;
  if (!user || !canCollaborate(user)) return;
  pushPackingItemMirror(tripId, item, user.uid).catch(
    (err) => console.error("[use-packing-items] sync mirror push failed:", err)
  );
}

function syncDeletePackingItemMirror(tripId: string, itemId: string) {
  const user = auth.currentUser;
  if (!user || !canCollaborate(user)) return;
  deletePackingItemMirrorRemote(tripId, itemId, user.uid).catch(
    (err) => console.error("[use-packing-items] sync mirror delete failed:", err)
  );
}

// ==================== TYPES ====================

export interface PackingFormData {
  name: string;
  notes?: string;
  category: string;
  priority: string;
  price?: string;
  url?: string;
  photos?: string[];
  photoSets?: import("@/lib/db").PhotoSet[];
  linkedWishIds?: string[];
  linkedParkDataIds?: string[];
  reservationTime?: string;
  reservationConfirmation?: string;
  partySize?: number;
  diningType?: "reservation" | "walk-up" | "mobile-order";
  dietaryNotes?: string;
}

/** Catalog item enriched with per-trip completion state */
export interface PackingItemWithStatus extends PackingItem {
  selectionId: string;
  completed: boolean;
  userId?: string;
  authorUid?: string;
}

// ==================== MAIN HOOK ====================

export function usePackingItems() {
  const { currentTripId, currentUserId, activeUserFilter, activePackingTabs, packingShowCompleted } =
    useAppStore();
  const { currentTrip } = useTrips();
  const { items: parkDataItems } = useParkData();

  // Lookup for resolving a Dining item's linkedParkDataIds[0] to park/land,
  // same pattern as use-play-pool.ts's dining pool-item resolution.
  const parkDataMap = useMemo(() => {
    const map = new Map<string, { park: string; land: string }>();
    for (const item of parkDataItems) {
      map.set(item.id, { park: item.park, land: item.land });
    }
    return map;
  }, [parkDataItems]);

  // Step 1: Get all selections for the current trip
  const selections = useLiveQuery(
    () =>
      currentTripId
        ? db.tripPackingSelections
            .where("tripId")
            .equals(currentTripId)
            .toArray()
        : [],
    [currentTripId]
  );

  // Step 2: Join selections with catalog items
  const allItems = useLiveQuery(
    async () => {
      if (!selections || selections.length === 0) return [];
      const itemIds = selections.map((s) => s.itemId);
      const items = await db.packingItems.where("id").anyOf(itemIds).toArray();
      const selMap = new Map(selections.map((s) => [s.itemId, s]));
      return items
        .filter((item) => selMap.has(item.id))
        .map((item) => ({
          ...item,
          selectionId: selMap.get(item.id)!.id,
          completed: selMap.get(item.id)!.completed,
          userId: selMap.get(item.id)!.userId,
          authorUid: selMap.get(item.id)!.authorUid,
        })) as PackingItemWithStatus[];
    },
    [selections]
  );

  // Step 3: Client-side filtering and sorting by active tabs (multi-select)
  const filteredItems = useMemo(() => {
    if (!allItems) return [];

    const tabSet = new Set(activePackingTabs);
    let result = allItems.filter((item) => tabSet.has(item.type));

    // Filter: user
    if (activeUserFilter) {
      const filterSet = new Set(activeUserFilter);
      result = result.filter((item) => filterSet.has(item.userId ?? "user_primary"));
    }

    if (!packingShowCompleted) {
      result = result.filter((item) => !item.completed);
    }

    result.sort((a, b) => {
      const priorityDiff =
        (PRIORITY_SORT_ORDER[a.priority] ?? 4) -
        (PRIORITY_SORT_ORDER[b.priority] ?? 4);
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [allItems, activeUserFilter, activePackingTabs, packingShowCompleted]);

  // Stats
  const stats = useMemo(() => {
    const items = allItems ?? [];
    const total = items.length;
    const completed = items.filter((i) => i.completed).length;
    const percentComplete =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    const byType: Record<string, { total: number; completed: number }> = {};
    for (const tab of PACKING_TABS) {
      const typeItems = items.filter((i) => i.type === tab.id);
      byType[tab.id] = {
        total: typeItems.length,
        completed: typeItems.filter((i) => i.completed).length,
      };
    }

    return { total, completed, percentComplete, byType };
  }, [allItems]);

  // ==================== CRUD ====================

  /**
   * When a Dining item is saved with a reservation/mobile-order time,
   * auto-schedule it onto Preview's Timeline and auto-create + link a Wish
   * (filling "Link to Wish" for free) so the user doesn't have to do either
   * step manually. No-ops for any other type or when the trigger conditions
   * aren't met. Runs after the item itself has already been written.
   */
  const maybeAutoScheduleAndLinkDining = async (itemId: string, item: PackingItem) => {
    if (item.type !== "dining") return;
    if (item.diningType !== "reservation" && item.diningType !== "mobile-order") return;
    if (!item.reservationTime) return;
    if (!currentTripId) return;

    const linkedParkDataId = item.linkedParkDataIds?.[0];
    const resolved = linkedParkDataId ? parkDataMap.get(linkedParkDataId) : undefined;
    const park = resolved?.park;
    const land = resolved?.land;

    // ---- Auto-schedule onto Preview's Timeline ----
    // Trip start date is the deliberate default — Prepare has no per-item
    // date field or day-context to schedule against otherwise.
    const targetDate = currentTrip?.startDate;
    if (targetDate) {
      const time24 = reservationTimeTo24Hour(item.reservationTime);
      const existing = await db.dayItems.where("sourceId").equals(itemId).first();
      if (existing) {
        await db.dayItems.update(existing.id, { scheduledTime: time24, updatedAt: Date.now() });
        const updated = await db.dayItems.get(existing.id);
        const user = auth.currentUser;
        if (updated && user && canCollaborate(user)) {
          pushDayItem(updated as DayItemRecord, user.uid).catch(() => {});
        }
      } else {
        await addDayItemsBatch(currentTripId, targetDate, currentUserId, [{
          title: item.name,
          itemType: "dining",
          scheduledTime: time24,
          durationMinutes: 90,
          park,
          land,
          parkDataId: linkedParkDataId,
          priority: item.priority,
          sourceId: itemId,
        }]);
      }
    }

    // ---- Auto-create + link a Wish ----
    // Only when the item doesn't already have one — never clobber a
    // manually-set or previously auto-created link.
    if (!item.linkedWishIds?.length) {
      const now = Date.now();
      const wishId = `wish_${now}_${Math.random().toString(36).slice(2, 6)}`;
      const wish: Wish = {
        id: wishId,
        title: item.name,
        tags: ["eats"],
        priority: item.priority,
        park,
        land,
        parkDataId: linkedParkDataId,
        sourceType: "app",
        createdAt: now,
        updatedAt: now,
        userId: currentUserId,
      };
      const selection: TripWishSelection = {
        id: `${currentTripId}__${wishId}`,
        tripId: currentTripId,
        wishId,
        completed: false,
        status: "idea",
        addedAt: now,
        updatedAt: now,
        userId: currentUserId,
      };
      await db.transaction("rw", [db.wishes, db.tripWishSelections, db.packingItems], async () => {
        await db.wishes.add(wish);
        await db.tripWishSelections.add(selection);
        await db.packingItems.update(itemId, { linkedWishIds: [wishId] });
      });

      const user = auth.currentUser;
      if (user && isSyncEnabled(user)) {
        pushWish(wish, user.uid).catch(() => {
          db.wishes.update(wishId, { pendingSync: 1 } as Partial<Wish>);
        });
      } else {
        db.wishes.update(wishId, { pendingSync: 1 } as Partial<Wish>);
      }
      if (user && canCollaborate(user)) {
        pushSelection(selection, user.uid).catch(() => {});
        pushWishMirror(currentTripId, wish, user.uid).catch(() => {});
      }

      const updatedItem = await db.packingItems.get(itemId);
      if (updatedItem) syncPackingItem(updatedItem);
    }
  };

  /** Create a new catalog item AND select it for the current trip */
  const addItem = async (data: PackingFormData, type?: PackingType) => {
    if (!currentTripId) return null;
    const itemType = type ?? activePackingTabs[0];
    const tab = PACKING_TABS.find((t) => t.id === itemType);
    const prefix = tab?.idPrefix ?? "item_";
    const itemId = `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    const item: PackingItem = {
      id: itemId,
      type: itemType,
      name: data.name,
      notes: data.notes || undefined,
      category: data.category,
      priority: data.priority,
      price: data.price || undefined,
      url: data.url || undefined,
      photos: data.photos?.length ? data.photos : undefined,
      linkedWishIds: data.linkedWishIds?.length ? data.linkedWishIds : undefined,
      linkedParkDataIds: data.linkedParkDataIds?.length ? data.linkedParkDataIds : undefined,
      reservationTime: data.reservationTime || undefined,
      reservationConfirmation: data.reservationConfirmation || undefined,
      partySize: data.partySize || undefined,
      diningType: data.diningType || undefined,
      dietaryNotes: data.dietaryNotes || undefined,
      createdAt: now,
      updatedAt: now,
      userId: currentUserId,
    };

    const selection: TripPackingSelection = {
      id: `${currentTripId}__${itemId}`,
      tripId: currentTripId,
      itemId,
      completed: false,
      addedAt: now,
      updatedAt: now,
      userId: currentUserId,
    };

    await db.transaction(
      "rw",
      [db.packingItems, db.tripPackingSelections],
      async () => {
        await db.packingItems.add(item);
        await db.tripPackingSelections.add(selection);
      }
    );
    syncPackingItem(item);
    syncPackingSelection(selection);
    syncPackingItemMirror(currentTripId, item);
    await maybeAutoScheduleAndLinkDining(itemId, item);
    return itemId;
  };

  /** Update a catalog item (name, notes, photo, etc.) */
  const updateItem = async (id: string, updates: Partial<PackingItem>) => {
    await db.packingItems.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    const updated = await db.packingItems.get(id);
    if (updated) syncPackingItem(updated);
    if (updated) await maybeAutoScheduleAndLinkDining(id, updated);

    // Re-push the trip mirror too, if this item is currently selected into
    // the active trip.
    if (currentTripId) {
      const sel = await db.tripPackingSelections.get(`${currentTripId}__${id}`);
      if (sel && updated) syncPackingItemMirror(currentTripId, updated);
    }
  };

  /** Toggle completed on the junction record (per-trip state) */
  const toggleCompleted = async (itemId: string) => {
    if (!currentTripId) return;
    const selId = `${currentTripId}__${itemId}`;
    const sel = await db.tripPackingSelections.get(selId);
    if (!sel) return;
    await db.tripPackingSelections.update(selId, {
      completed: !sel.completed,
      updatedAt: Date.now(),
    });
    const updated = await db.tripPackingSelections.get(selId);
    if (updated) syncPackingSelection(updated);
  };

  /** Remove item from current trip only (catalog entry preserved) */
  const unselectItem = async (itemId: string) => {
    if (!currentTripId) return;
    const selId = `${currentTripId}__${itemId}`;
    await db.tripPackingSelections.delete(selId);
    syncDeletePackingSelection(selId, currentTripId);
    syncDeletePackingItemMirror(currentTripId, itemId);
  };

  /** Delete item from catalog AND all trip selections */
  const deleteCatalogItem = async (itemId: string) => {
    const affectedSels = await db.tripPackingSelections
      .where("itemId").equals(itemId).toArray();
    await db.transaction(
      "rw",
      [db.packingItems, db.tripPackingSelections],
      async () => {
        await db.tripPackingSelections
          .where("itemId")
          .equals(itemId)
          .delete();
        await db.packingItems.delete(itemId);
      }
    );
    syncDeletePackingItem(itemId);
    affectedSels.forEach((s) => {
      syncDeletePackingSelection(s.id, s.tripId);
      syncDeletePackingItemMirror(s.tripId, itemId);
    });
  };

  /** Select an existing catalog item for the current trip */
  const selectExistingItem = async (itemId: string) => {
    if (!currentTripId) return;
    const selId = `${currentTripId}__${itemId}`;
    const existing = await db.tripPackingSelections.get(selId);
    if (existing) return;
    const now = Date.now();
    const sel: TripPackingSelection = {
      id: selId,
      tripId: currentTripId,
      itemId,
      completed: false,
      addedAt: now,
      updatedAt: now,
      userId: currentUserId,
    };
    await db.tripPackingSelections.add(sel);
    syncPackingSelection(sel);
    const item = await db.packingItems.get(itemId);
    if (item) syncPackingItemMirror(currentTripId, item);
  };

  const getItemById = async (id: string) => {
    return db.packingItems.get(id);
  };

  return {
    items: filteredItems,
    allItems: allItems ?? [],
    stats,
    addItem,
    updateItem,
    toggleCompleted,
    unselectItem,
    deleteCatalogItem,
    selectExistingItem,
    getItemById,
    loading: allItems === undefined,
  };
}

// ==================== CATALOG HOOK ====================

/** Returns catalog items of a given type NOT yet selected for the current trip */
export function useCatalogItems(type: PackingType) {
  const { currentTripId } = useAppStore();

  const unselectedItems = useLiveQuery(
    async () => {
      if (!currentTripId) return [];
      const selectedIds = new Set(
        (
          await db.tripPackingSelections
            .where("tripId")
            .equals(currentTripId)
            .toArray()
        ).map((s) => s.itemId)
      );
      const allOfType = await db.packingItems
        .where("type")
        .equals(type)
        .toArray();
      return allOfType.filter((item) => !selectedIds.has(item.id));
    },
    [currentTripId, type]
  );

  return {
    items: unselectedItems ?? [],
    loading: unselectedItems === undefined,
  };
}
