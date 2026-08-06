"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { WISH_TAGS, PACKING_TABS } from "@/lib/constants";
import { useParkData } from "@/hooks/use-park-data";

// ==================== TYPES ====================

export interface PoolItem {
  id: string;
  sourceType: "wish" | "ride" | "dining" | "shopping";
  title: string;
  subtitle?: string;
  park?: string;
  land?: string;
  parkDataId?: string;
  priority: string;
  icon: string;
  reservationTime?: string;
}

// ==================== HOOK ====================

export function usePlayPool(date: string | null) {
  const { currentTripId } = useAppStore();
  const { items: parkDataItems } = useParkData();

  // Build lookup map for park data (dining/shopping land resolution)
  const parkDataMap = useMemo(() => {
    const map = new Map<string, { park: string; land: string }>();
    for (const item of parkDataItems) {
      map.set(item.id, { park: item.park, land: item.land });
    }
    return map;
  }, [parkDataItems]);

  // Get all trip wishes
  const tripWishes = useLiveQuery(
    async () => {
      if (!currentTripId) return [];
      const selections = await db.tripWishSelections
        .where("tripId")
        .equals(currentTripId)
        .toArray();
      if (selections.length === 0) return [];

      const wishIds = selections.map((s) => s.wishId);
      const wishes = await db.wishes.bulkGet(wishIds);

      return selections
        .map((sel, i) => ({ sel, wish: wishes[i] }))
        .filter((x) => x.wish != null)
        .map(({ sel, wish }) => ({
          ...wish!,
          selectionStatus: sel.status,
          completed: sel.completed,
        }));
    },
    [currentTripId]
  );

  // Get all trip packing items (dining + shopping only)
  const tripPacking = useLiveQuery(
    async () => {
      if (!currentTripId) return [];
      const selections = await db.tripPackingSelections
        .where("tripId")
        .equals(currentTripId)
        .toArray();
      if (selections.length === 0) return [];

      const itemIds = selections.map((s) => s.itemId);
      const items = await db.packingItems.bulkGet(itemIds);

      return selections
        .map((sel, i) => ({ sel, item: items[i] }))
        .filter((x) => x.item != null && (x.item!.type === "dining" || x.item!.type === "shopping"))
        .map(({ sel, item }) => ({
          ...item!,
          completed: sel.completed,
        }));
    },
    [currentTripId]
  );

  // Exclude wishes that have linked packing children (show children instead)
  const wishIdsWithChildren = useMemo<Set<string>>(() => {
    const ids = new Set<string>();
    for (const item of tripPacking ?? []) {
      if (item.linkedWishIds) {
        for (const wid of item.linkedWishIds) ids.add(wid);
      }
    }
    return ids;
  }, [tripPacking]);

  // Build pool — all non-completed items (duplicates allowed in day plan)
  const poolItems = useMemo<PoolItem[]>(() => {
    const pool: PoolItem[] = [];

    // Wishes
    for (const wish of tripWishes ?? []) {
      if (wish.completed) continue;
      if (wishIdsWithChildren.has(wish.id)) continue;

      const firstTag = wish.tags?.[0];
      const tagDef = WISH_TAGS.find((t) => t.id === firstTag);
      const isRide = wish.tags?.includes("rides") ?? false;
      const icon = isRide ? "🎢" : (tagDef?.icon ?? "⭐");

      pool.push({
        id: wish.id,
        sourceType: isRide ? "ride" : "wish",
        title: wish.title,
        subtitle: wish.land ? `${wish.park ?? ""} · ${wish.land}`.trim() : undefined,
        park: wish.park,
        land: wish.land,
        parkDataId: wish.parkDataId,
        priority: wish.priority,
        icon,
      });
    }

    // Dining / shopping
    for (const item of tripPacking ?? []) {
      if (item.completed) continue;
      if (item.type !== "dining" && item.type !== "shopping") continue;

      const tabDef = PACKING_TABS.find((t) => t.id === item.type);
      const icon = tabDef?.icon ?? (item.type === "dining" ? "🍽️" : "🛍️");

      let resolvedPark: string | undefined;
      let resolvedLand: string | undefined;
      if (item.linkedParkDataIds && item.linkedParkDataIds.length > 0) {
        const firstLinked = parkDataMap.get(item.linkedParkDataIds[0]);
        if (firstLinked) {
          resolvedPark = firstLinked.park;
          resolvedLand = firstLinked.land;
        }
      }

      pool.push({
        id: item.id,
        sourceType: item.type as "dining" | "shopping",
        title: item.name,
        subtitle: resolvedLand
          ? `${resolvedPark ?? ""} · ${resolvedLand}`.trim()
          : item.category,
        park: resolvedPark,
        land: resolvedLand,
        parkDataId: item.linkedParkDataIds?.[0],
        priority: item.priority,
        icon,
        reservationTime: item.type === "dining" ? item.reservationTime : undefined,
      });
    }

    return pool;
  }, [tripWishes, tripPacking, wishIdsWithChildren, parkDataMap]);

  return {
    poolItems,
    loading: tripWishes === undefined || tripPacking === undefined,
  };
}
