"use client";

// ==================== ALL TRIP PHOTOS ====================
// Every photo attached to a trip, from all four sources, with the richer
// metadata (date, category, linked item) the Catalog Photo Gallery needs for
// filtering — usePublishData's allPhotos is a thin projection of this same
// data for its simpler {id, url, full, caption} needs. Keep both in sync by
// changing category/date resolution here, not in two places.

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Wish, type PackingItem, type TripPhoto } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { WISH_TAGS, getTagById } from "@shared/constants/tags";
import { PACKING_TABS, getPackingTab } from "@shared/constants/packing";

export interface TripPhotoEntry {
  id: string; // composite: wish_<id>_<n> | packing_<id>_<n> | dayitem_<id>_<n> | tphoto_<id>_<n>
  url: string;
  full: string;
  caption: string;
  date: string | null; // YYYY-MM-DD — null when the source item isn't scheduled to a specific day
  sourceType: "wish" | "packing" | "dayitem" | "tripPhoto";
  itemId: string; // the underlying wish/packingItem/dayItem/tripPhoto's own id
  categoryId: string;
  categoryLabel: string;
  categoryIcon: string;
  linkedItemTitle: string;
  // TripPhoto-only — passthrough for the multi-item linker UI
  linkedParkDataIds?: string[];
  linkedWishIds?: string[];
}

// One category chip set spanning both wish tags and packing types, since a
// photo can come from either side (e.g. "Dining" and "Shopping" exist as
// both a wish tag and a packing type — see WISH_TAGS/PACKING_TABS).
export const PHOTO_CATEGORY_CHIPS = [
  ...WISH_TAGS.map((t) => ({ id: t.id, label: t.label, icon: t.icon })),
  ...PACKING_TABS.filter((t) => t.id !== "dining" && t.id !== "shopping").map((t) => ({ id: t.id, label: t.label, icon: t.icon })),
];

function wishCategory(wish: Wish) {
  const tagId = wish.tags?.find((t) => getTagById(t)) ?? "other";
  const tag = getTagById(tagId) ?? getTagById("other")!;
  return { categoryId: tag.id, categoryLabel: tag.label, categoryIcon: tag.icon };
}

function packingCategory(item: PackingItem) {
  const tab = getPackingTab(item.type);
  return {
    categoryId: item.type,
    categoryLabel: tab?.label ?? item.type,
    categoryIcon: tab?.icon ?? "📦",
  };
}

export function useAllTripPhotos(tripId: string | null) {
  const { activeUserFilter } = useAppStore();

  const rawData = useLiveQuery(
    async () => {
      if (!tripId) return null;

      const wishSelections = await db.tripWishSelections.where("tripId").equals(tripId).toArray();
      const wishes = (await db.wishes.bulkGet(wishSelections.map((s) => s.wishId))).filter(
        (w): w is Wish => w !== undefined
      );

      const packingSelections = await db.tripPackingSelections.where("tripId").equals(tripId).toArray();
      const packingItems = (await db.packingItems.bulkGet(packingSelections.map((s) => s.itemId))).filter(
        (p): p is PackingItem => p !== undefined
      );

      const itineraryItems = await db.dayItems.where("tripId").equals(tripId).toArray();

      // Wishes scheduled onto Preview without a Plan-page selection row — see
      // the identical comment in use-publish-data.ts's rawData builder.
      const planLinkedWishIds = new Set(wishSelections.map((s) => s.wishId));
      const scheduledOnlyWishIds = [...new Set(
        itineraryItems
          .filter((i) => i.itemType === "wish" && i.sourceId && !planLinkedWishIds.has(i.sourceId))
          .map((i) => i.sourceId!)
      )];
      const scheduledOnlyWishes = scheduledOnlyWishIds.length > 0
        ? (await db.wishes.bulkGet(scheduledOnlyWishIds)).filter((w): w is Wish => w !== undefined)
        : [];

      const tripPhotos = await db.tripPhotos.where("tripId").equals(tripId).toArray();

      return { wishSelections, wishes, packingSelections, packingItems, itineraryItems, scheduledOnlyWishes, tripPhotos };
    },
    [tripId]
  );

  const photos = useMemo<TripPhotoEntry[]>(() => {
    if (!rawData) return [];

    const filterSet = activeUserFilter ? new Set(activeUserFilter) : null;
    const matchesFilter = (userId: string | undefined) => !filterSet || filterSet.has(userId ?? "user_primary");

    const wishIds = new Set(rawData.wishSelections.filter((s) => matchesFilter(s.userId)).map((s) => s.wishId));
    const wishes = rawData.wishes.filter((w) => wishIds.has(w.id));
    const itemIds = new Set(rawData.packingSelections.filter((s) => matchesFilter(s.userId)).map((s) => s.itemId));
    const packingItems = rawData.packingItems.filter((p) => itemIds.has(p.id));
    const itineraryItems = rawData.itineraryItems.filter((i) => matchesFilter(i.userId));

    // Best-effort date resolution for wish/packing-item photos: these are
    // trip-level catalog records with no date of their own, so look up
    // whichever day(s) they were actually scheduled via a matching DayItem's
    // sourceId. Earliest match wins if scheduled more than once; null (shown
    // regardless of the selected date filter) if never scheduled at all.
    const earliestDateBySourceId = new Map<string, string>();
    for (const item of itineraryItems) {
      if (!item.sourceId) continue;
      const existing = earliestDateBySourceId.get(item.sourceId);
      if (!existing || item.date < existing) earliestDateBySourceId.set(item.sourceId, item.date);
    }

    const out: TripPhotoEntry[] = [];

    const pushWishPhotos = (wish: Wish) => {
      const cat = wishCategory(wish);
      const date = earliestDateBySourceId.get(wish.id) ?? null;
      const sets = wish.photoSets?.length ? wish.photoSets : (wish.photos ?? []).map((p) => ({ thumbnail: p, display: p, full: p }));
      sets.forEach((ps, idx) => {
        out.push({
          id: `wish_${wish.id}_${idx}`, url: ps.display, full: ps.full, caption: wish.title,
          date, sourceType: "wish", itemId: wish.id, linkedItemTitle: wish.title, ...cat,
        });
      });
    };

    for (const wish of wishes) pushWishPhotos(wish);

    const scheduledOnlyMap = new Map(rawData.scheduledOnlyWishes.map((w) => [w.id, w]));
    const seenScheduled = new Set<string>();
    for (const item of itineraryItems) {
      if (item.itemType !== "wish" || !item.sourceId) continue;
      const wish = scheduledOnlyMap.get(item.sourceId);
      if (!wish || seenScheduled.has(wish.id)) continue;
      seenScheduled.add(wish.id);
      pushWishPhotos(wish);
    }

    for (const item of packingItems) {
      const cat = packingCategory(item);
      const date = earliestDateBySourceId.get(item.id) ?? null;
      const sets = item.photoSets?.length ? item.photoSets : (item.photos ?? []).map((p) => ({ thumbnail: p, display: p, full: p }));
      sets.forEach((ps, idx) => {
        out.push({
          id: `packing_${item.id}_${idx}`, url: ps.display, full: ps.full, caption: item.name,
          date, sourceType: "packing", itemId: item.id, linkedItemTitle: item.name, ...cat,
        });
      });
    }

    // DayItem photos (local capture + the photo-zip cloud-sync-only fallback
    // tier — see the identical note in use-publish-data.ts).
    for (const item of itineraryItems) {
      if (!item.photos?.length) continue;
      const tab = PACKING_TABS.find((t) => t.id === item.itemType);
      const wishTag = getTagById(item.itemType);
      item.photos.forEach((photo, idx) => {
        out.push({
          id: `dayitem_${item.id}_${idx}`, url: photo, full: photo, caption: item.title,
          date: item.date, sourceType: "dayitem", itemId: item.id, linkedItemTitle: item.title,
          categoryId: item.itemType,
          categoryLabel: tab?.label ?? wishTag?.label ?? item.itemType,
          categoryIcon: tab?.icon ?? wishTag?.icon ?? "📌",
        });
      });
    }

    // Standalone device-imported photos — not user-scoped, always shown.
    for (const photo of rawData.tripPhotos) {
      photo.photoSets.forEach((ps, idx) => {
        out.push({
          id: `tphoto_${photo.id}_${idx}`, url: ps.display, full: ps.full, caption: photo.caption ?? "",
          date: photo.date, sourceType: "tripPhoto", itemId: photo.id,
          linkedItemTitle: photo.caption ?? "Unlinked photo",
          categoryId: "unlinked", categoryLabel: "Unlinked", categoryIcon: "📷",
          linkedParkDataIds: photo.linkedParkDataIds ?? (photo.linkedParkDataId ? [photo.linkedParkDataId] : []),
          linkedWishIds: photo.linkedWishIds ?? (photo.linkedWishId ? [photo.linkedWishId] : []),
        });
      });
    }

    return out;
  }, [rawData, activeUserFilter]);

  return { photos, loading: rawData === undefined };
}

export type { TripPhoto };
