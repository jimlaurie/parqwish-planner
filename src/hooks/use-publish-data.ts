"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, {
  type Trip,
  type DayItemRecord,
  type Wish,
  type PackingItem,
} from "@/lib/db";
import { useAppStore } from "@/lib/store";

// ==================== TYPES ====================

export interface DayData {
  date: string; // "YYYY-MM-DD"
  displayDate: string; // "Mon, Apr 1"
  items: DayItemRecord[];
  plannedWishes: { id: string; title: string; completed: boolean; tags?: string[] }[];
  total: number;
  completed: number;
  percentComplete: number;
}

export interface PublishData {
  trip: Trip;
  days: DayData[];
  totalWishes: number;
  completedWishes: number;
  totalItineraryItems: number;
  completedItineraryItems: number;
  totalPackingItems: number;
  completedPackingItems: number;
  parkBreakdown: Record<string, { count: number; completed: number }>;
  landBreakdown: Record<string, { count: number; completed: number }>;
  allPhotos: { id: string; url: string; full: string; caption: string }[];
  wishSelections: Array<{ wishId: string; completed: boolean }>;
  wishes: Wish[];
}

// ==================== HELPERS ====================

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00"); // noon to avoid timezone issues
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ==================== MAIN HOOK ====================

export function usePublishData() {
  const { currentTripId, activeUserFilter } = useAppStore();

  const rawData = useLiveQuery(
    async () => {
      if (!currentTripId) return null;

      const trip = await db.trips.get(currentTripId);
      if (!trip) return null;

      // Wish data
      const wishSelections = await db.tripWishSelections
        .where("tripId")
        .equals(currentTripId)
        .toArray();
      const wishIds = wishSelections.map((s) => s.wishId);
      const wishes = (await db.wishes.bulkGet(wishIds)).filter(
        (w): w is Wish => w !== undefined
      );

      // Packing data
      const packingSelections = await db.tripPackingSelections
        .where("tripId")
        .equals(currentTripId)
        .toArray();
      const itemIds = packingSelections.map((s) => s.itemId);
      const packingItems = (await db.packingItems.bulkGet(itemIds)).filter(
        (p): p is PackingItem => p !== undefined
      );

      // Day items (all dates for this trip)
      const itineraryItems = await db.dayItems
        .where("tripId")
        .equals(currentTripId)
        .toArray();

      // A wish can be scheduled onto this trip's Preview timeline (a
      // DayItem with itemType "wish", sourceId = the wish's own id)
      // without also being added to the Plan page (a tripWishSelections
      // row) — e.g. a photo-zip import that matched an existing catalog
      // wish by name and picked up a photo the wish already had. Fetch
      // those separately so their photos can still surface on Publish,
      // without folding them into the Plan-scoped wish stats above.
      const planLinkedWishIds = new Set(wishIds);
      const scheduledOnlyWishIds = [...new Set(
        itineraryItems
          .filter((i) => i.itemType === "wish" && i.sourceId && !planLinkedWishIds.has(i.sourceId))
          .map((i) => i.sourceId!)
      )];
      const scheduledOnlyWishes = scheduledOnlyWishIds.length > 0
        ? (await db.wishes.bulkGet(scheduledOnlyWishIds)).filter((w): w is Wish => w !== undefined)
        : [];

      // Standalone photos imported from the device (Camera Roll, PhotoPass
      // downloads) — not tied to any wish/packing/day item.
      const tripPhotos = await db.tripPhotos.where("tripId").equals(currentTripId).toArray();

      return {
        trip,
        wishSelections,
        wishes,
        packingSelections,
        packingItems,
        itineraryItems,
        scheduledOnlyWishes,
        tripPhotos,
      };
    },
    [currentTripId]
  );

  const publishData = useMemo<PublishData | null>(() => {
    if (!rawData) return null;

    const { trip } = rawData;

    // Apply active user filter (null = show all users)
    const filterSet = activeUserFilter ? new Set(activeUserFilter) : null;
    const matchesFilter = (userId: string | undefined) =>
      !filterSet || filterSet.has(userId ?? "user_primary");

    const wishSelections = rawData.wishSelections.filter((s) => matchesFilter(s.userId));
    const wishIds = new Set(wishSelections.map((s) => s.wishId));
    const wishes = rawData.wishes.filter((w) => wishIds.has(w.id));

    const packingSelections = rawData.packingSelections.filter((s) => matchesFilter(s.userId));
    const itemIds = new Set(packingSelections.map((s) => s.itemId));
    const packingItems = rawData.packingItems.filter((p) => itemIds.has(p.id));

    const itineraryItems = rawData.itineraryItems.filter((i) => matchesFilter(i.userId));

    // ==================== WISH STATS ====================

    const totalWishes = wishSelections.length;
    const completedWishes = wishSelections.filter((s) => s.completed).length;

    // ==================== PACKING STATS ====================

    const totalPackingItems = packingSelections.length;
    const completedPackingItems = packingSelections.filter(
      (s) => s.completed
    ).length;

    // ==================== ITINERARY STATS ====================

    const totalItineraryItems = itineraryItems.length;
    const completedItineraryItems = itineraryItems.filter(
      (i) => i.completed
    ).length;

    // ==================== DAY BREAKDOWN ====================

    const dates = getDatesBetween(trip.startDate, trip.endDate);
    const itemsByDate: Record<string, DayItemRecord[]> = {};
    for (const item of itineraryItems) {
      if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
      itemsByDate[item.date].push(item);
    }

    // Build planned wishes list (trip-level, attached to all days)
    const plannedWishes = wishes.map((w) => {
      const sel = wishSelections.find((s) => s.wishId === w.id);
      return {
        id: w.id,
        title: w.title,
        completed: sel?.completed ?? false,
        tags: w.tags,
      };
    });

    const days: DayData[] = dates.map((date) => {
      const dayItems = (itemsByDate[date] ?? []).sort((a, b) => {
        const timeCompare = (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "");
        if (timeCompare !== 0) return timeCompare;
        return a.sortOrder - b.sortOrder;
      });
      const total = dayItems.length;
      const completed = dayItems.filter((i) => i.completed).length;
      return {
        date,
        displayDate: formatDisplayDate(date),
        items: dayItems,
        plannedWishes,
        total,
        completed,
        percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    // ==================== PARK & LAND ANALYTICS ====================

    const parkBreakdown: Record<string, { count: number; completed: number }> =
      {};
    const landBreakdown: Record<string, { count: number; completed: number }> =
      {};

    for (const item of itineraryItems) {
      if (item.park) {
        if (!parkBreakdown[item.park]) {
          parkBreakdown[item.park] = { count: 0, completed: 0 };
        }
        parkBreakdown[item.park].count++;
        if (item.completed) parkBreakdown[item.park].completed++;
      }
      if (item.land) {
        if (!landBreakdown[item.land]) {
          landBreakdown[item.land] = { count: 0, completed: 0 };
        }
        landBreakdown[item.land].count++;
        if (item.completed) landBreakdown[item.land].completed++;
      }
    }

    // ==================== PHOTOS ====================

    const allPhotos: { id: string; url: string; full: string; caption: string }[] = [];

    for (const wish of wishes) {
      if (wish.photoSets && wish.photoSets.length > 0) {
        wish.photoSets.forEach((ps, idx) => {
          allPhotos.push({ id: `wish_${wish.id}_${idx}`, url: ps.display, full: ps.full, caption: wish.title });
        });
      } else if (wish.photos && wish.photos.length > 0) {
        wish.photos.forEach((photo, idx) => {
          allPhotos.push({ id: `wish_${wish.id}_${idx}`, url: photo, full: photo, caption: wish.title });
        });
      }
    }

    for (const item of packingItems) {
      if (item.photoSets && item.photoSets.length > 0) {
        item.photoSets.forEach((ps, idx) => {
          allPhotos.push({ id: `packing_${item.id}_${idx}`, url: ps.display, full: ps.full, caption: item.name });
        });
      } else if (item.photos && item.photos.length > 0) {
        item.photos.forEach((photo, idx) => {
          allPhotos.push({ id: `packing_${item.id}_${idx}`, url: photo, full: photo, caption: item.name });
        });
      }
    }

    // DayItems get photos two ways: local capture, and the photo-zip import
    // fallback (linkPhotoManifest's linkToDayItem tier, for items that only
    // ever arrived via live cloud sync and have no catalog Wish/PackingItem
    // to attach to). Neither wish.photos nor packingItem.photos cover this —
    // without this loop those photos are stored but never shown anywhere.
    for (const item of itineraryItems) {
      if (item.photos && item.photos.length > 0) {
        item.photos.forEach((photo, idx) => {
          allPhotos.push({ id: `dayitem_${item.id}_${idx}`, url: photo, full: photo, caption: item.title });
        });
      }
    }

    // A wish scheduled on this trip's Preview timeline without also being
    // added to the Plan page (see rawData's scheduledOnlyWishIds comment)
    // still needs its photos to count as this trip's photos — filtered by
    // the same active-user rule as the rest of this trip's DayItems.
    const scheduledOnlyWishMap = new Map(rawData.scheduledOnlyWishes.map((w) => [w.id, w]));
    const seenScheduledWishIds = new Set<string>();
    for (const item of itineraryItems) {
      if (item.itemType !== "wish" || !item.sourceId) continue;
      const wish = scheduledOnlyWishMap.get(item.sourceId);
      if (!wish || seenScheduledWishIds.has(wish.id)) continue;
      seenScheduledWishIds.add(wish.id);
      if (wish.photoSets && wish.photoSets.length > 0) {
        wish.photoSets.forEach((ps, idx) => {
          allPhotos.push({ id: `wish_${wish.id}_${idx}`, url: ps.display, full: ps.full, caption: wish.title });
        });
      } else if (wish.photos && wish.photos.length > 0) {
        wish.photos.forEach((photo, idx) => {
          allPhotos.push({ id: `wish_${wish.id}_${idx}`, url: photo, full: photo, caption: wish.title });
        });
      }
    }

    // Standalone photos imported from the device (Camera Roll, PhotoPass
    // downloads) via the Photos tab's "From your device" mode — not tied to
    // any catalog item, so no active-user filtering applies to them.
    for (const photo of rawData.tripPhotos) {
      photo.photoSets.forEach((ps, idx) => {
        allPhotos.push({ id: `tphoto_${photo.id}_${idx}`, url: ps.display, full: ps.full, caption: photo.caption ?? "" });
      });
    }

    return {
      trip,
      days,
      totalWishes,
      completedWishes,
      totalItineraryItems,
      completedItineraryItems,
      totalPackingItems,
      completedPackingItems,
      parkBreakdown,
      landBreakdown,
      allPhotos,
      wishSelections: wishSelections.map((s) => ({ wishId: s.wishId, completed: s.completed })),
      wishes,
    };
  }, [rawData, activeUserFilter]);

  return {
    data: publishData,
    loading: rawData === undefined,
  };
}
