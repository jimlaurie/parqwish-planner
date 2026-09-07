"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, {
  type Trip,
  type DayItemRecord,
  type Wish,
} from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { useAllTripPhotos } from "@/hooks/use-all-trip-photos";

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

      // Packing data — only the selections are needed here (stats read
      // completed off the selection row); the actual PackingItem records
      // are fetched separately by useAllTripPhotos for photo data.
      const packingSelections = await db.tripPackingSelections
        .where("tripId")
        .equals(currentTripId)
        .toArray();

      // Day items (all dates for this trip)
      const itineraryItems = await db.dayItems
        .where("tripId")
        .equals(currentTripId)
        .toArray();

      return {
        trip,
        wishSelections,
        wishes,
        packingSelections,
        itineraryItems,
      };
    },
    [currentTripId]
  );

  // Photos come from useAllTripPhotos (src/hooks/use-all-trip-photos.ts) —
  // the same source the Catalog Photo Gallery reads from, so the two never
  // drift apart. Only the simpler {id, url, full, caption} shape is needed
  // here; richer per-photo metadata (date, category, links) lives on the
  // TripPhotoEntry the gallery consumes directly.
  const { photos: allTripPhotos } = useAllTripPhotos(currentTripId);

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
    // Sourced from useAllTripPhotos — see the hook call above. Same
    // composite ids (wish_/packing_/dayitem_/tphoto_) as before, so
    // excludedPhotoIds and every other consumer of these ids keeps working
    // unchanged.

    const allPhotos = allTripPhotos.map((p) => ({ id: p.id, url: p.url, full: p.full, caption: p.caption }));

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
  }, [rawData, activeUserFilter, allTripPhotos]);

  return {
    data: publishData,
    loading: rawData === undefined,
  };
}
