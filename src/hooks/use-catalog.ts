"use client";

import { useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import type { Wish, PackingItem, PackingType } from "@/lib/db";

// ==================== TYPES ====================

export interface CatalogWish extends Wish {
  tripCount: number;
  tripIds: string[];
  tripNames: string[];
}

export interface CatalogPackingItem extends PackingItem {
  tripCount: number;
  tripIds: string[];
  tripNames: string[];
}

// ==================== HOOK ====================

export function useCatalog() {
  // Load all wishes
  const allWishes = useLiveQuery(() => db.wishes.toArray(), []);

  // Load all packing items
  const allPackingItems = useLiveQuery(() => db.packingItems.toArray(), []);

  // Load all wish selections (for trip count)
  const allWishSelections = useLiveQuery(
    () => db.tripWishSelections.toArray(),
    []
  );

  // Load all packing selections (for trip count)
  const allPackingSelections = useLiveQuery(
    () => db.tripPackingSelections.toArray(),
    []
  );

  // Load all trips for trip name lookup
  const allTrips = useLiveQuery(() => db.trips.toArray(), []);

  // Build trip name map: tripId → trip name
  const tripNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const trip of allTrips ?? []) {
      map.set(trip.id, trip.name);
    }
    return map;
  }, [allTrips]);

  // Build wish trip counts
  const wishTripCounts = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    for (const sel of allWishSelections ?? []) {
      if (!counts.has(sel.wishId)) counts.set(sel.wishId, new Set());
      counts.get(sel.wishId)!.add(sel.tripId);
    }
    return counts;
  }, [allWishSelections]);

  // Build packing trip counts
  const packingTripCounts = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    for (const sel of allPackingSelections ?? []) {
      if (!counts.has(sel.itemId)) counts.set(sel.itemId, new Set());
      counts.get(sel.itemId)!.add(sel.tripId);
    }
    return counts;
  }, [allPackingSelections]);

  // Wishes with trip counts and names
  const wishes = useMemo<CatalogWish[]>(() => {
    if (!allWishes) return [];
    return allWishes.map((w) => {
      const tripSet = wishTripCounts.get(w.id);
      const ids = tripSet ? Array.from(tripSet) : [];
      return {
        ...w,
        tripCount: ids.length,
        tripIds: ids,
        tripNames: ids.map((id) => tripNameMap.get(id) ?? ""),
      };
    });
  }, [allWishes, wishTripCounts, tripNameMap]);

  // Packing items with trip counts and names
  const packingItems = useMemo<CatalogPackingItem[]>(() => {
    if (!allPackingItems) return [];
    return allPackingItems.map((item) => {
      const tripSet = packingTripCounts.get(item.id);
      const ids = tripSet ? Array.from(tripSet) : [];
      return {
        ...item,
        tripCount: ids.length,
        tripIds: ids,
        tripNames: ids.map((id) => tripNameMap.get(id) ?? ""),
      };
    });
  }, [allPackingItems, packingTripCounts, tripNameMap]);

  // Get packing items filtered by type
  const getPackingByType = useCallback(
    (type: PackingType) => packingItems.filter((item) => item.type === type),
    [packingItems]
  );

  // Delete wish forever (removes from catalog + all trip selections)
  const deleteWishForever = useCallback(async (wishId: string) => {
    await db.transaction("rw", [db.wishes, db.tripWishSelections], async () => {
      await db.wishes.delete(wishId);
      const selections = await db.tripWishSelections
        .where("wishId")
        .equals(wishId)
        .toArray();
      await db.tripWishSelections.bulkDelete(selections.map((s) => s.id));
    });
  }, []);

  // Delete packing item forever (removes from catalog + all trip selections)
  const deletePackingItemForever = useCallback(async (itemId: string) => {
    await db.transaction(
      "rw",
      [db.packingItems, db.tripPackingSelections],
      async () => {
        await db.packingItems.delete(itemId);
        const selections = await db.tripPackingSelections
          .where("itemId")
          .equals(itemId)
          .toArray();
        await db.tripPackingSelections.bulkDelete(selections.map((s) => s.id));
      }
    );
  }, []);

  return {
    wishes,
    packingItems,
    getPackingByType,
    deleteWishForever,
    deletePackingItemForever,
    loading:
      allWishes === undefined ||
      allPackingItems === undefined ||
      allWishSelections === undefined ||
      allPackingSelections === undefined ||
      allTrips === undefined,
  };
}
