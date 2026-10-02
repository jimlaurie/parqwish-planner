"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { WISH_TAGS, PACKING_TABS } from "@/lib/constants";
import { useParkData } from "@/hooks/use-park-data";
import type { DayItemType } from "@shared/types/day-item";

// ==================== TYPES ====================

export type PoolSourceType = "wish" | "ride" | "place" | "dining" | "shopping" | "outfit" | "equipment" | "sundry";

/** Which Available Items section an item is listed under. Display only —
 *  scheduling still goes by sourceType, so a show or dining *wish* is still
 *  scheduled as a wish (which is what ParQwish Pal expects when it marks
 *  the wish done), it's just listed with the other shows / dining. */
export type PoolGroup = PoolSourceType | "show";

export interface PoolItem {
  id: string;
  sourceType: PoolSourceType;
  group: PoolGroup;
  title: string;
  subtitle?: string;
  park?: string;
  land?: string;
  parkDataId?: string;
  priority: string;
  icon: string;
  reservationTime?: string;
}

// Shared by every "add this pool item to the timeline" call site (drag-drop,
// quick-schedule, the Add-to-Day modal) so the mapping only needs updating
// in one place.
export const POOL_TYPE_TO_DAY_ITEM_TYPE: Record<PoolSourceType, DayItemType> = {
  wish: "wish",
  ride: "ride",
  place: "place",
  dining: "dining",
  shopping: "shopping",
  outfit: "outfit",
  equipment: "equipment",
  sundry: "sundry",
};

// Wish tag → Available Items section, in precedence order (a wish tagged
// both Rides and Dining lists under Rides).
const WISH_TAG_GROUPS: [string, PoolGroup][] = [
  ["rides", "ride"], ["shows", "show"], ["eats", "dining"], ["shopping", "shopping"], ["place", "place"],
];

function wishGroup(tags: string[] | undefined): PoolGroup {
  return WISH_TAG_GROUPS.find(([tag]) => tags?.includes(tag))?.[1] ?? "wish";
}

// Packing types whose "completed" means *packed*, not *done* — a packed
// sunscreen or jacket still belongs in the pool so it can be scheduled.
const PACKED_NOT_DONE = new Set(["outfit", "equipment", "sundry"]);

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

  // Get all trip packing items — every type; the timeline pool covers the
  // full catalog (outfits/equipment/sundries included), not just dining and
  // shopping.
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
        .filter((x) => x.item != null)
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
      const isPlace = !isRide && (wish.tags?.includes("place") ?? false);
      const icon = isRide ? "🎢" : (tagDef?.icon ?? "⭐");

      pool.push({
        id: wish.id,
        sourceType: isRide ? "ride" : isPlace ? "place" : "wish",
        group: wishGroup(wish.tags),
        title: wish.title,
        subtitle: wish.land ? `${wish.park ?? ""} · ${wish.land}`.trim() : undefined,
        park: wish.park,
        land: wish.land,
        parkDataId: wish.parkDataId,
        priority: wish.priority,
        icon,
      });
    }

    // Packing catalog — dining, shopping, outfits, equipment, sundries.
    // Only dining/shopping items carry park/land (they're the only packing
    // types ever linked to a real park location); outfits/equipment/
    // sundries fall back to their packing category as the subtitle.
    for (const item of tripPacking ?? []) {
      if (item.completed && !PACKED_NOT_DONE.has(item.type)) continue;

      const tabDef = PACKING_TABS.find((t) => t.id === item.type);
      const icon = tabDef?.icon ?? "🎒";

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
        sourceType: item.type,
        group: item.type,
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
