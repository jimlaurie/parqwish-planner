// ==================== SYNC TRANSLATE ====================
// Bidirectional translation between PWA normalized model and sync wire format.
// PWA model: Wish + TripWishSelection + ItineraryItem + PackingItem + TripPackingSelection
// Wire format: SyncRide, SyncShow, SyncDining, SyncWish, SyncPackingItem, etc.

import db from "./db";
import type { Wish, TripWishSelection } from "./db";
import type { PackingItem, TripPackingSelection } from "./db";
import type { ItineraryItem, DayItemRecord } from "./db";
import { getParkData } from "./park-data";
import type {
  SyncPayload,
  SyncRide,
  SyncPlace,
  SyncShow,
  SyncDining,
  SyncWish,
  SyncPackingItem,
  SyncShoppingItem,
  SyncPhoto,
  PhotoManifestEntry,
  SyncTrail,
  SyncScheduledEvent,
  SyncDayItem,
} from "./sync-types";
import { hasRequiredFields } from "@shared/validation";
import {
  normalizeParkKey,
  parkKeyToDisplayName,
  generateSyncId,
  wishTagToSyncCategory,
  emptyPayload,
} from "@shared/sync-helpers";
import {
  toSyncRide,
  toSyncShow,
  toSyncDining,
  toSyncWish,
  toSyncPackingItem,
  toSyncShoppingItem,
} from "@shared/sync-mappers";
import { auth } from "./auth";
import { pushWish, pushPackingItem } from "./wish-sync";
import { recompressDataURL, compressDataURLMultiRes } from "./image-utils";

// ==================== INTERNAL TYPES ====================

interface TripData {
  wishMap: Map<string, Wish>;
  selectionMap: Map<string, TripWishSelection>;
  packingMap: Map<string, PackingItem>;
  packSelectionMap: Map<string, TripPackingSelection>;
  itinBySource: Map<string, ItineraryItem>;
}

interface CategorizedWishes {
  rides: SyncRide[];
  shows: SyncShow[];
  dining: SyncDining[];
  wishes: SyncWish[];
}

interface CategorizedPacking {
  outfits: SyncPackingItem[];
  equipment: SyncPackingItem[];
  sundries: SyncPackingItem[];
  shopping: SyncShoppingItem[];
  dining: SyncDining[];
}

// ==================== EXPORT HELPERS ====================

async function gatherTripData(
  tripId: string,
  dates: string[],
  userIds?: string[]
): Promise<TripData> {
  let wishSelections = await db.tripWishSelections
    .where("tripId")
    .equals(tripId)
    .toArray();
  if (userIds) {
    const idSet = new Set(userIds);
    wishSelections = wishSelections.filter((ws) => idSet.has(ws.userId ?? "user_primary"));
  }
  const wishIds = wishSelections.map((ws) => ws.wishId);
  const wishes = await db.wishes.bulkGet(wishIds);
  const wishMap = new Map(wishes.filter(Boolean).map((w) => [w!.id, w!]));
  const selectionMap = new Map(wishSelections.map((ws) => [ws.wishId, ws]));

  let packingSelections = await db.tripPackingSelections
    .where("tripId")
    .equals(tripId)
    .toArray();
  if (userIds) {
    const idSet = new Set(userIds);
    packingSelections = packingSelections.filter((ps) => idSet.has(ps.userId ?? "user_primary"));
  }
  const packingIds = packingSelections.map((ps) => ps.itemId);
  const packingItems = await db.packingItems.bulkGet(packingIds);
  const packingMap = new Map(
    packingItems.filter(Boolean).map((p) => [p!.id, p!])
  );
  const packSelectionMap = new Map(
    packingSelections.map((ps) => [ps.itemId, ps])
  );

  const itineraryItems: ItineraryItem[] = [];
  for (const date of dates) {
    let items = await db.itineraryItems
      .where("[tripId+date]")
      .equals([tripId, date])
      .toArray();
    if (userIds) {
      const idSet = new Set(userIds);
      items = items.filter((i) => idSet.has(i.userId ?? "user_primary"));
    }
    itineraryItems.push(...items);
  }

  const itinBySource = new Map<string, ItineraryItem>();
  for (const item of itineraryItems) {
    if (item.sourceId) {
      itinBySource.set(item.sourceId, item);
    }
  }

  return { wishMap, selectionMap, packingMap, packSelectionMap, itinBySource };
}

function categorizeWishes(
  wishMap: Map<string, Wish>,
  selectionMap: Map<string, TripWishSelection>,
  itinBySource: Map<string, ItineraryItem>,
  dates: string[],
  parkNameById: Map<string, string>
): CategorizedWishes {
  const rides: SyncRide[] = [];
  const shows: SyncShow[] = [];
  const dining: SyncDining[] = [];
  const wishes: SyncWish[] = [];

  for (const [wishId, wish] of wishMap) {
    const selection = selectionMap.get(wishId);
    const itin = itinBySource.get(wishId);
    const completed = selection?.completed || false;
    const completedAt = selection?.completedAt;
    const date = itin?.date || dates[0] || "";
    const category = wishTagToSyncCategory(wish.tags);
    // Resolve linked entity name; fall back to user's wish title
    const linkedName = wish.parkDataId ? parkNameById.get(wish.parkDataId) : undefined;
    const entityName = linkedName || wish.title;

    switch (category) {
      case "rides":
        rides.push(toSyncRide({
          id: wish.parkDataId || wish.id,
          name: entityName,
          park: wish.park,
          land: wish.land,
          priority: wish.priority,
          completed,
          completedAt,
          maxWait: selection?.maxWait,
          notes: wish.notes,
        }, date));
        break;
      case "shows":
        shows.push(toSyncShow({
          id: wish.parkDataId || wish.id,
          name: entityName,
          park: wish.park,
          land: wish.land,
          showTime: itin?.startTime,
          travelTime: selection?.travelTime,
          priority: wish.priority,
          completed,
          completedAt,
          notes: wish.notes,
        }, date));
        break;
      case "dining":
        dining.push(toSyncDining({
          id: wish.parkDataId || wish.id,
          name: entityName,
          park: wish.park,
          land: wish.land,
          time: itin?.startTime,
          priority: wish.priority,
          completed,
          completedAt,
          notes: wish.notes,
        }, date));
        break;
      default:
        wishes.push(toSyncWish({
          id: wish.id,
          title: wish.title,
          description: wish.description,
          tags: wish.tags,
          priority: wish.priority,
          completed,
          completedAt,
          url: wish.url,
          notes: wish.notes,
          parkDataId: wish.parkDataId,
          park: wish.park,
          land: wish.land,
        }, date));
        break;
    }
  }

  return { rides, shows, dining, wishes };
}

function categorizePacking(
  packingMap: Map<string, PackingItem>,
  packSelectionMap: Map<string, TripPackingSelection>,
  itinBySource: Map<string, ItineraryItem>,
  dates: string[]
): CategorizedPacking {
  const outfits: SyncPackingItem[] = [];
  const equipment: SyncPackingItem[] = [];
  const sundries: SyncPackingItem[] = [];
  const shopping: SyncShoppingItem[] = [];
  const dining: SyncDining[] = [];

  for (const [itemId, item] of packingMap) {
    const selection = packSelectionMap.get(itemId);
    const completed = selection?.completed || false;
    const date = dates[0] || "";

    switch (item.type) {
      case "outfit":
        outfits.push(toSyncPackingItem({ ...item, completed }, date));
        break;
      case "equipment":
        equipment.push(toSyncPackingItem({ ...item, completed }, date));
        break;
      case "sundry":
        sundries.push(toSyncPackingItem({ ...item, completed }, date));
        break;
      case "shopping":
        shopping.push(toSyncShoppingItem({
          ...item,
          completed,
          purchased: completed,
        }, date));
        break;
      case "dining": {
        const itin = itinBySource.get(itemId);
        dining.push(toSyncDining({
          id: item.id,
          name: item.name,
          time: itin?.startTime || item.reservationTime,
          diningType: item.diningType,
          priority: item.priority,
          completed,
          notes: item.notes,
          reservationConfirmation: item.reservationConfirmation,
          partySize: item.partySize,
          dietaryNotes: item.dietaryNotes,
        }, date));
        break;
      }
    }
  }

  return { outfits, equipment, sundries, shopping, dining };
}

/**
 * Extract base64 data-URI photo strings from an item.
 * Prefers the multi-resolution photoSets[] (display resolution for a good
 * quality/size tradeoff), falls back to legacy photos[] single-res array.
 * Only includes data: URIs — blob: URLs cannot be serialised to JSON.
 */
function getItemPhotoUrls(item: {
  photos?: string[];
  photoSets?: Array<{ thumbnail: string; display: string; full: string }>;
}): string[] {
  if (item.photoSets && item.photoSets.length > 0) {
    // Use display resolution; fall back to full then thumbnail
    return item.photoSets
      .map((ps) => ps.display || ps.full || ps.thumbnail || "")
      .filter((url) => url.startsWith("data:"));
  }
  return (item.photos || []).filter((url) => url.startsWith("data:"));
}

function extractPhotos(
  wishMap: Map<string, Wish>,
  packingMap: Map<string, PackingItem>
): SyncPhoto[] {
  const photos: SyncPhoto[] = [];

  for (const [wishId, wish] of wishMap) {
    // Rides/shows/dining wishes are exported with id = parkDataId || wishId
    // (matching the logic in categorizeWishes). Use the same key here so
    // importPhotos can resolve it via the idMap built by importRides/Shows/Dining.
    const syncItemId = wish.parkDataId || wishId;
    for (const photoUrl of getItemPhotoUrls(wish)) {
      const mimeMatch = photoUrl.match(/^data:(image\/\w+);/);
      photos.push({
        id: `photo_${wishId}_${photos.length}`,
        data: photoUrl,
        mimeType: mimeMatch ? mimeMatch[1] : "image/jpeg",
        itemId: syncItemId,
        itemType: "wish",
      });
    }
  }

  for (const [itemId, item] of packingMap) {
    for (const photoUrl of getItemPhotoUrls(item)) {
      const mimeMatch = photoUrl.match(/^data:(image\/\w+);/);
      photos.push({
        id: `photo_${itemId}_${photos.length}`,
        data: photoUrl,
        mimeType: mimeMatch ? mimeMatch[1] : "image/jpeg",
        itemId: itemId,
        itemType: item.type,
      });
    }
  }

  return photos;
}

// ==================== EXPORT: PWA → SYNC PAYLOAD ====================

/**
 * Convert PWA data for selected trip + dates into the sync wire format.
 * Optional userIds filter restricts to items owned by specific users.
 */
export async function pwaToSyncPayload(
  tripId: string,
  dates: string[],
  userIds?: string[]
): Promise<SyncPayload> {
  const data = await gatherTripData(tripId, dates, userIds);

  // Build parkDataId → entity name lookup so exports use the real
  // ride/show/restaurant name rather than the user's custom wish title
  const parkItems = await getParkData().catch(() => []);
  const parkNameById = new Map<string, string>();
  for (const item of parkItems) {
    parkNameById.set(item.id, item.name);
  }

  const wishCategories = categorizeWishes(
    data.wishMap, data.selectionMap, data.itinBySource, dates, parkNameById
  );
  const packCategories = categorizePacking(
    data.packingMap, data.packSelectionMap, data.itinBySource, dates
  );
  const photos = extractPhotos(data.wishMap, data.packingMap);

  // Gather scheduled events for all requested dates
  const scheduledEventRecords: import("@shared/types/scheduled-event").ScheduledEventRecord[] = [];
  for (const date of dates) {
    const dayEvents = await db.scheduledEvents
      .where("[tripId+date]")
      .equals([tripId, date])
      .toArray();
    if (userIds) {
      const idSet = new Set(userIds);
      scheduledEventRecords.push(
        ...dayEvents.filter(ev => idSet.has(ev.userId ?? "user_primary"))
      );
    } else {
      scheduledEventRecords.push(...dayEvents);
    }
  }

  const scheduledEvents: SyncScheduledEvent[] = scheduledEventRecords.map(ev => ({
    id: ev.id,
    date: ev.date,
    userId: ev.userId,
    sourceId: ev.sourceId,
    itemType: ev.itemType,
    scheduledTime: ev.scheduledTime,
    completed: ev.completed,
    completedAt: ev.completedAt,
    completionDate: ev.completionDate,
    completionTime: ev.completionTime,
    notes: ev.notes,
    photos: ev.photos,
    createdAt: ev.createdAt,
    updatedAt: ev.updatedAt,
  }));

  // Gather DayItems for all requested dates
  const dayItemRecords: import("@shared/types/day-item").DayItemRecord[] = [];
  for (const date of dates) {
    const dayEvents = await db.dayItems
      .where("[tripId+date]")
      .equals([tripId, date])
      .toArray();
    if (userIds) {
      const idSet = new Set(userIds);
      dayItemRecords.push(
        ...dayEvents.filter(di => idSet.has(di.userId ?? "user_primary"))
      );
    } else {
      dayItemRecords.push(...dayEvents);
    }
  }

  const dayItems: SyncDayItem[] = dayItemRecords.map(di => ({
    id: di.id,
    date: di.date,
    userId: di.userId,
    scheduledTime: di.scheduledTime,
    durationMinutes: di.durationMinutes,
    sortOrder: di.sortOrder,
    title: di.title,
    itemType: di.itemType,
    park: di.park,
    land: di.land,
    notes: di.notes,
    priority: di.priority,
    tags: di.tags,
    sourceId: di.sourceId,
    parkDataId: di.parkDataId,
    completed: di.completed,
    completedAt: di.completedAt,
    createdAt: di.createdAt,
    updatedAt: di.updatedAt,
  }));

  // Gather GPS trails stored in the PWA trails table
  const userIdSet = userIds ? new Set(userIds) : null;
  const trailRecords = await db.trails.where("tripId").equals(tripId).toArray();
  const trails: SyncTrail[] = trailRecords
    .filter((t) => dates.includes(t.date))
    .filter((t) => !userIdSet || userIdSet.has(t.userId ?? "user_primary"))
    .map((t) => ({
      id: t.id,
      date: t.date,
      resolution: t.resolution || "medium",
      points: t.points || [],
      distanceMiles: t.distanceMiles || 0,
      durationMinutes: t.durationMinutes || 0,
      pointCount: t.pointCount ?? (t.points?.length ?? 0),
    }));

  return {
    rides: wishCategories.rides,
    shows: wishCategories.shows,
    dining: [...wishCategories.dining, ...packCategories.dining],
    wishes: wishCategories.wishes,
    outfits: packCategories.outfits,
    equipment: packCategories.equipment,
    sundries: packCategories.sundries,
    shopping: packCategories.shopping,
    photos,
    places: [],
    trails: trails.length > 0 ? trails : undefined,
    scheduledEvents,
    dayItems,
  };
}

// ==================== IMPORT HELPERS ====================

async function importRides(
  rides: SyncRide[],
  tripId: string,
  wishByName: Map<string, string>,
  wishByParkDataId: Map<string, string>,
  now: number,
  userId?: string,
): Promise<{ count: number; idMap: Map<string, string> }> {
  let count = 0;
  const idMap = new Map<string, string>(); // sourceId → newWishId

  for (const ride of rides) {
    if (!hasRequiredFields(ride as unknown as Record<string, unknown>, 'id', 'name')) {
      console.warn('[SyncTranslate] Skipping ride with missing id/name');
      continue;
    }
    // Dedupe by park-catalog id first (survives a rename across devices),
    // name as the fallback for wishes never linked to the catalog.
    const nameKey = ride.name.toLowerCase();
    const existingId = wishByParkDataId.get(ride.id) ?? wishByName.get(nameKey);
    if (existingId) {
      // Relink: create a junction to the existing catalog wish rather than
      // silently dropping it (see syncPayloadToPwa's doc comment).
      const junctionId = `${tripId}__${existingId}`;
      if (!await db.tripWishSelections.get(junctionId)) {
        await db.tripWishSelections.add({
          id: junctionId, tripId, wishId: existingId,
          completed: ride.completed || false,
          status: ride.completed ? "completed" : "planned",
          addedAt: now, userId,
        });
        count++;
      }
      idMap.set(ride.id, existingId);
      continue;
    }

    const wishId = generateSyncId("wish", now);
    const parkName = parkKeyToDisplayName(ride.park);

    await db.wishes.add({
      id: wishId,
      title: ride.name,
      tags: ["rides"],
      priority: ride.priority || "C",
      park: parkName,
      land: ride.land || "",
      parkDataId: ride.id,
      notes: ride.notes || "",
      photos: [],
      createdAt: now,
    });

    await db.tripWishSelections.add({
      id: `${tripId}__${wishId}`,
      tripId,
      wishId,
      completed: ride.completed || false,
      status: ride.completed ? "completed" : "planned",
      completedAt: ride.completedAt,
      maxWait: ride.maxWait,
      addedAt: now,
      userId,
    });

    if (ride.date) {
      await db.itineraryItems.add({
        id: generateSyncId("itin", now),
        tripId,
        date: ride.date,
        sourceType: "wish",
        sourceId: wishId,
        parkDataId: ride.id,
        itemType: "ride",
        title: ride.name,
        startTime: "09:00",
        durationMinutes: 60,
        park: parkName,
        land: ride.land || "",
        completed: ride.completed || false,
        sortOrder: 0,
        userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    idMap.set(ride.id, wishId);
    wishByName.set(nameKey, wishId);
    wishByParkDataId.set(ride.id, wishId);
    count++;
  }

  return { count, idMap };
}

async function importPlaces(
  places: SyncPlace[],
  tripId: string,
  wishByName: Map<string, string>,
  wishBySourcePlaceId: Map<string, string>,
  now: number,
  userId?: string,
): Promise<{ count: number; idMap: Map<string, string> }> {
  let count = 0;
  const idMap = new Map<string, string>(); // sourceId → newWishId

  for (const place of places) {
    if (!hasRequiredFields(place as unknown as Record<string, unknown>, 'id', 'name')) {
      console.warn('[SyncTranslate] Skipping place with missing id/name');
      continue;
    }
    // Dedupe by the mobile-originated place id first (survives a rename
    // across devices — parallel to how rides dedupe on parkDataId, even
    // though a custom place isn't Firebase catalog data), name as the
    // fallback for places that changed id across devices.
    const nameKey = place.name.toLowerCase();
    const existingId = wishBySourcePlaceId.get(place.id) ?? wishByName.get(nameKey);
    if (existingId) {
      const junctionId = `${tripId}__${existingId}`;
      if (!await db.tripWishSelections.get(junctionId)) {
        await db.tripWishSelections.add({
          id: junctionId, tripId, wishId: existingId,
          completed: place.completed || false,
          status: place.completed ? "completed" : "planned",
          addedAt: now, userId,
        });
        count++;
      }
      idMap.set(place.id, existingId);
      continue;
    }

    const wishId = generateSyncId("wish", now);
    const parkName = parkKeyToDisplayName(place.park);

    await db.wishes.add({
      id: wishId,
      title: place.name,
      tags: ["place"],
      priority: place.priority || "C",
      park: parkName,
      land: place.land || "",
      sourcePlaceId: place.id,
      latitude: place.latitude,
      longitude: place.longitude,
      capturedAt: place.capturedAt,
      notes: place.notes || "",
      photos: [],
      createdAt: now,
    });

    await db.tripWishSelections.add({
      id: `${tripId}__${wishId}`,
      tripId,
      wishId,
      completed: place.completed || false,
      status: place.completed ? "completed" : "planned",
      completedAt: place.completedAt,
      addedAt: now,
      userId,
    });

    if (place.date) {
      await db.itineraryItems.add({
        id: generateSyncId("itin", now),
        tripId,
        date: place.date,
        sourceType: "wish",
        sourceId: wishId,
        itemType: "place",
        title: place.name,
        startTime: "09:00",
        durationMinutes: 60,
        park: parkName,
        land: place.land || "",
        completed: place.completed || false,
        sortOrder: 0,
        userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    idMap.set(place.id, wishId);
    wishByName.set(nameKey, wishId);
    wishBySourcePlaceId.set(place.id, wishId);
    count++;
  }

  return { count, idMap };
}

async function importShows(
  shows: SyncShow[],
  tripId: string,
  wishByName: Map<string, string>,
  wishByParkDataId: Map<string, string>,
  now: number,
  userId?: string,
): Promise<{ count: number; idMap: Map<string, string> }> {
  let count = 0;
  const idMap = new Map<string, string>();

  for (const show of shows) {
    if (!hasRequiredFields(show as unknown as Record<string, unknown>, 'id', 'name')) {
      console.warn('[SyncTranslate] Skipping show with missing id/name');
      continue;
    }
    // Dedupe by park-catalog id first, name as the fallback (see importRides).
    const nameKey = show.name.toLowerCase();
    const existingId = wishByParkDataId.get(show.id) ?? wishByName.get(nameKey);
    if (existingId) {
      const junctionId = `${tripId}__${existingId}`;
      if (!await db.tripWishSelections.get(junctionId)) {
        await db.tripWishSelections.add({
          id: junctionId, tripId, wishId: existingId,
          completed: show.completed || false,
          status: show.completed ? "completed" : "planned",
          addedAt: now, userId,
        });
        count++;
      }
      idMap.set(show.id, existingId);
      continue;
    }

    const wishId = generateSyncId("wish", now);
    const parkName = parkKeyToDisplayName(show.park);

    await db.wishes.add({
      id: wishId,
      title: show.name,
      tags: ["shows"],
      priority: show.priority || "C",
      park: parkName,
      land: show.land || "",
      parkDataId: show.id,
      notes: show.notes || "",
      photos: [],
      createdAt: now,
    });

    await db.tripWishSelections.add({
      id: `${tripId}__${wishId}`,
      tripId,
      wishId,
      completed: show.completed || false,
      status: show.completed ? "completed" : "planned",
      completedAt: show.completedAt,
      travelTime: show.travelTime,
      addedAt: now,
      userId,
    });

    if (show.date) {
      await db.itineraryItems.add({
        id: generateSyncId("itin", now),
        tripId,
        date: show.date,
        sourceType: "wish",
        sourceId: wishId,
        parkDataId: show.id,
        itemType: "show",
        title: show.name,
        startTime: show.showTime || "12:00",
        durationMinutes: 30,
        park: parkName,
        land: show.land || "",
        completed: show.completed || false,
        sortOrder: 0,
        userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    idMap.set(show.id, wishId);
    wishByName.set(nameKey, wishId);
    wishByParkDataId.set(show.id, wishId);
    count++;
  }

  return { count, idMap };
}

async function importDining(
  items: SyncDining[],
  tripId: string,
  packingByKey: Map<string, string>,
  packingByParkDataId: Map<string, string>,
  now: number,
  userId?: string,
): Promise<{ count: number; idMap: Map<string, string> }> {
  let count = 0;
  const idMap = new Map<string, string>();

  for (const d of items) {
    if (!hasRequiredFields(d as unknown as Record<string, unknown>, 'id', 'name')) {
      console.warn('[SyncTranslate] Skipping dining item with missing id/name');
      continue;
    }
    // Dedupe by park-catalog id first, name as the fallback (see importRides).
    const typeKey = `dining:${d.name.toLowerCase()}`;
    const existingId = packingByParkDataId.get(d.id) ?? packingByKey.get(typeKey);
    if (existingId) {
      const junctionId = `${tripId}__${existingId}`;
      if (!await db.tripPackingSelections.get(junctionId)) {
        await db.tripPackingSelections.add({
          id: junctionId, tripId, itemId: existingId,
          completed: d.completed || false,
          addedAt: now, userId,
        });
        count++;
      }
      idMap.set(d.id, existingId);
      continue;
    }
    const itemId = generateSyncId("packing", now);

    await db.packingItems.add({
      id: itemId,
      type: "dining",
      name: d.name,
      category: "Restaurant",
      priority: d.priority || "C",
      notes: d.notes || "",
      diningType: (d.type === "reservation" ? "reservation" : d.type === "mobile-order" ? "mobile-order" : "walk-up") as "reservation" | "walk-up" | "mobile-order",
      reservationTime: d.time || "",
      reservationConfirmation: d.reservationConfirmation || "",
      partySize: d.partySize,
      dietaryNotes: d.dietaryNotes || "",
      linkedParkDataIds: [d.id],
      photos: [],
      createdAt: now,
      updatedAt: now,
    });

    await db.tripPackingSelections.add({
      id: `${tripId}__${itemId}`,
      tripId,
      itemId,
      completed: d.completed || false,
      addedAt: now,
      userId,
    });

    if (d.date) {
      const parkName = parkKeyToDisplayName(d.park);
      await db.itineraryItems.add({
        id: generateSyncId("itin", now),
        tripId,
        date: d.date,
        sourceType: "dining",
        sourceId: itemId,
        itemType: "dining",
        title: d.name,
        startTime: d.time || "12:00",
        durationMinutes: 60,
        park: parkName,
        land: d.land || "",
        completed: d.completed || false,
        sortOrder: 0,
        userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    idMap.set(d.id, itemId);
    packingByKey.set(typeKey, itemId);
    packingByParkDataId.set(d.id, itemId);
    count++;
  }

  return { count, idMap };
}

async function importWishes(
  items: SyncWish[],
  tripId: string,
  wishByName: Map<string, string>,
  now: number,
  userId?: string,
): Promise<{ count: number; idMap: Map<string, string> }> {
  let count = 0;
  const idMap = new Map<string, string>();

  for (const w of items) {
    if (!hasRequiredFields(w as unknown as Record<string, unknown>, 'id', 'title')) {
      console.warn('[SyncTranslate] Skipping wish with missing id/title');
      continue;
    }
    const nameKey = w.title.toLowerCase();
    if (wishByName.has(nameKey)) {
      const existingId = wishByName.get(nameKey)!;
      const junctionId = `${tripId}__${existingId}`;
      if (!await db.tripWishSelections.get(junctionId)) {
        await db.tripWishSelections.add({
          id: junctionId, tripId, wishId: existingId,
          completed: w.completed || false,
          status: w.completed ? "completed" : "planned",
          addedAt: now, userId,
        });
        count++;
      }
      idMap.set(w.id, existingId);
      continue;
    }

    const wishId = generateSyncId("wish", now);

    await db.wishes.add({
      id: wishId,
      title: w.title,
      description: w.description || "",
      tags: w.tags || [],
      priority: w.priority || "C",
      url: w.url || "",
      notes: w.notes || "",
      photos: [],
      createdAt: now,
    });

    await db.tripWishSelections.add({
      id: `${tripId}__${wishId}`,
      tripId,
      wishId,
      completed: w.completed || false,
      status: w.completed ? "completed" : "planned",
      addedAt: now,
      userId,
    });

    idMap.set(w.id, wishId);
    wishByName.set(nameKey, wishId);
    count++;
  }

  return { count, idMap };
}

async function importPackingItems(
  payload: SyncPayload,
  tripId: string,
  packingByKey: Map<string, string>,
  now: number,
  userId?: string,
): Promise<{ counts: Record<string, number>; idMap: Map<string, string> }> {
  const counts: Record<string, number> = {
    outfits: 0,
    equipment: 0,
    sundries: 0,
  };
  const idMap = new Map<string, string>(); // sourceId → newItemId

  const packingTypes = [
    { key: "outfits" as const, type: "outfit" as const, items: payload.outfits },
    { key: "equipment" as const, type: "equipment" as const, items: payload.equipment },
    { key: "sundries" as const, type: "sundry" as const, items: payload.sundries },
  ];

  for (const { key, type, items } of packingTypes) {
    for (const item of items || []) {
      if (!hasRequiredFields(item as unknown as Record<string, unknown>, 'id', 'name')) {
        console.warn(`[SyncTranslate] Skipping ${key} item with missing id/name`);
        continue;
      }
      const typeKey = `${type}:${item.name.toLowerCase()}`;
      if (packingByKey.has(typeKey)) {
        const existingId = packingByKey.get(typeKey)!;
        const junctionId = `${tripId}__${existingId}`;
        if (!await db.tripPackingSelections.get(junctionId)) {
          await db.tripPackingSelections.add({
            id: junctionId, tripId, itemId: existingId,
            completed: item.completed || false,
            addedAt: now, userId,
          });
          counts[key]++;
        }
        idMap.set(item.id, existingId);
        continue;
      }

      const itemId = generateSyncId("packing", now);

      await db.packingItems.add({
        id: itemId,
        type,
        name: item.name,
        category: item.category || "Custom",
        priority: item.priority || "C",
        notes: item.notes || "",
        photos: [],
        createdAt: now,
        updatedAt: now,
      });

      await db.tripPackingSelections.add({
        id: `${tripId}__${itemId}`,
        tripId,
        itemId,
        completed: item.completed || false,
        addedAt: now,
        userId,
      });

      idMap.set(item.id, itemId);
      packingByKey.set(typeKey, itemId);
      counts[key]++;
    }
  }

  return { counts, idMap };
}

async function importShopping(
  items: SyncShoppingItem[],
  tripId: string,
  packingByKey: Map<string, string>,
  now: number,
  userId?: string,
): Promise<{ count: number; idMap: Map<string, string> }> {
  let count = 0;
  const idMap = new Map<string, string>(); // sourceId → newItemId

  for (const item of items) {
    if (!hasRequiredFields(item as unknown as Record<string, unknown>, 'id', 'name')) {
      console.warn('[SyncTranslate] Skipping shopping item with missing id/name');
      continue;
    }
    const typeKey = `shopping:${item.name.toLowerCase()}`;
    if (packingByKey.has(typeKey)) {
      const existingId = packingByKey.get(typeKey)!;
      const junctionId = `${tripId}__${existingId}`;
      if (!await db.tripPackingSelections.get(junctionId)) {
        await db.tripPackingSelections.add({
          id: junctionId, tripId, itemId: existingId,
          completed: item.purchased || item.completed || false,
          addedAt: now, userId,
        });
        count++;
      }
      idMap.set(item.id, existingId);
      continue;
    }

    const itemId = generateSyncId("packing", now);

    await db.packingItems.add({
      id: itemId,
      type: "shopping",
      name: item.name,
      category: item.category || "Custom",
      priority: item.priority || "C",
      notes: item.notes || "",
      price: item.price || "",
      url: item.url || "",
      photos: [],
      createdAt: now,
      updatedAt: now,
    });

    await db.tripPackingSelections.add({
      id: `${tripId}__${itemId}`,
      tripId,
      itemId,
      completed: item.purchased || item.completed || false,
      addedAt: now,
      userId,
    });

    idMap.set(item.id, itemId);
    packingByKey.set(typeKey, itemId);
    count++;
  }

  return { count, idMap };
}

async function importPhotos(
  photos: SyncPhoto[],
  idMap: Map<string, string>
): Promise<void> {
  for (const photo of photos) {
    if (!photo.data || !photo.itemId) continue;

    // Resolve source itemId to the newly-created destination ID.
    // On a same-device round-trip the ID may already exist; on cross-device
    // import the source IDs were regenerated, so we must go through the map.
    const resolvedId = idMap.get(photo.itemId) ?? photo.itemId;

    const wish = await db.wishes.get(resolvedId);
    if (wish) {
      const existing = wish.photos || [];
      if (!existing.includes(photo.data)) {
        await db.wishes.update(resolvedId, {
          photos: [...existing, photo.data],
        });
      }
      continue;
    }

    const packingItem = await db.packingItems.get(resolvedId);
    if (packingItem) {
      const existing = packingItem.photos || [];
      if (!existing.includes(photo.data)) {
        await db.packingItems.update(resolvedId, {
          photos: [...existing, photo.data],
        });
      }
    }
  }
}

// ==================== STANDALONE PHOTO ZIP LINKING ====================

/**
 * Link photos from a standalone zip import (no concurrent trip-data import,
 * so no fresh idMap exists — see importPhotos() above for the idMap-based
 * approach used during a full sync). Resolution order, per entry:
 *   1. Exact itemId match (cheap; handles same-device / ID-preserving cases)
 *   2. Case-insensitive exact name match within the correct table
 *      (wishes for itemType 'wish'|'ride'|'show'|'photo' — 'photo' is
 *      mobile Gallery's itemType for Places; packingItems for
 *      'outfit'|'equipment'|'sundry'|'shopping'|'dining')
 *   3. No match:
 *      - itemType 'photo' (Places) — Places are free-form, catalog-less
 *        entries, so an unmatched one is auto-created as a new "place"-tagged
 *        wish (mirrors importPlaces' creation shape) rather than skipped.
 *        This is what lets a user export *just* a Place's photo without
 *        first doing a separate Places-category trip-data sync — the two
 *        used to be a strict two-step requirement that produced a confusing
 *        "couldn't be matched" skip with no way to recover short of
 *        re-exporting the whole trip. Requires tripId; without one (or for
 *        every other itemType, which needs real catalog data we don't have
 *        from a photo manifest alone) falls back to the old skip behavior.
 *      - anything else → counted as skipped, never silently dropped
 */
export async function linkPhotoManifest(
  entries: Array<{ entry: PhotoManifestEntry; dataUri: string }>,
  tripId?: string,
  userId?: string
): Promise<{
  linked: number;
  created: number;
  skipped: number;
  skippedReasons: { notFound: number };
}> {
  const WISH_TYPES = new Set(["wish", "ride", "show", "photo"]);
  const PACKING_TYPES = new Set(["outfit", "equipment", "sundry", "shopping", "dining"]);
  const DAY_ITEM_TYPE_MAP: Record<string, string> = {
    wish: "wish", ride: "ride", show: "show", dining: "dining",
    outfit: "outfit", equipment: "equipment", sundry: "sundry",
    shopping: "shopping", photo: "place",
  };

  // A zip-imported photo is a raw camera JPEG (often several MB) — used
  // directly it becomes both the thumbnail AND the full-size image
  // everywhere (PhotoPicker's 48x48 grid, Publish's gallery), which was
  // overwhelming Safari's image decoder for a plain 48px thumbnail and
  // showing as an empty frame. compressDataURLMultiRes (image-utils.ts)
  // compresses it into the app's normal photoSets shape instead.
  const toPhotoResolutions = compressDataURLMultiRes;

  /**
   * Fallback for an item that has no catalog Wish/PackingItem at all — true
   * for anything that only ever arrived via live cloud sync (Phase 3A Day
   * Items), which writes straight into db.dayItems and never creates a
   * matching catalog record (only file-based Play → Export's importRides/
   * importShows/etc. do that). entry.itemId is the mobile item's own id
   * (ride/show id, or the wish/packing item's own id for those types) —
   * the same value DayItem.sourceId is stamped with at scheduling time
   * (see syncScheduledDayItem / syncTimelineDayItem on mobile).
   *
   * A DayItem is per-trip (unlike Wish, a shared catalog record), so a
   * candidate is only accepted when it belongs to the trip the import is
   * running against — the same ride scheduled on two different trips is
   * two different DayItems, and cross-trip matching would silently attach
   * a photo to the wrong trip.
   */
  async function linkToDayItem(entry: PhotoManifestEntry, dataUri: string, tripId?: string): Promise<boolean> {
    const mappedType = DAY_ITEM_TYPE_MAP[entry.itemType];
    if (!mappedType) return false;
    const inTrip = (d: DayItemRecord) => !tripId || d.tripId === tripId;

    let dayItem: DayItemRecord | undefined;
    if (entry.itemId) {
      dayItem = (await db.dayItems.where("sourceId").equals(entry.itemId).toArray()).find(inTrip);
    }
    if (!dayItem) {
      const nameKey = entry.itemName.toLowerCase();
      dayItem = (await db.dayItems.where("itemType").equals(mappedType).toArray())
        .find((d) => inTrip(d) && d.title.toLowerCase() === nameKey);
    }
    if (!dayItem) return false;
    const existing = dayItem.photos || [];
    if (!existing.includes(dataUri)) {
      // DayItem.photos has no photoSets equivalent (a self-contained
      // snapshot type, string[] only) — store a single reasonably-sized
      // "display" resolution rather than the raw multi-MB camera photo,
      // consistent with why the Wish/PackingItem branches compress too.
      const resized = await recompressDataURL(dataUri, 800, 0.75);
      await db.dayItems.update(dayItem.id, { photos: [...existing, resized] });
    }
    return true;
  }

  let linked = 0;
  let created = 0;
  let notFound = 0;
  const now = Date.now();

  for (const { entry, dataUri } of entries) {
    try {
      if (WISH_TYPES.has(entry.itemType)) {
        // For 'ride'/'show', entry.itemId is the mobile park-catalog id
        // (the same value importRides/importShows store as parkDataId) —
        // NOT a wish's own generated primary key, so a plain db.wishes.get()
        // never matches these. Check parkDataId first, same convention as
        // wishByParkDataId in syncPayloadToPwa.
        //
        // entry.itemId is only guaranteed present as of the mobile fix that
        // stamps a real id onto ride photos (getAllItemsWithPhotos) — zips
        // exported before that ship with itemId missing/undefined. Every
        // lookup below must guard for that: `w.parkDataId === undefined`
        // would otherwise match the FIRST wish in the whole catalog that
        // simply has no parkDataId set at all (any manually-added wish,
        // any auto-created Place wish, ...) and silently attach the photo
        // to a random unrelated item instead of falling through to the
        // name-match / DayItem tiers below.
        let wish: Wish | undefined;
        if (entry.itemId && (entry.itemType === "ride" || entry.itemType === "show")) {
          wish = (await db.wishes.toArray()).find((w) => w.parkDataId === entry.itemId);
        }
        if (!wish && entry.itemId) wish = await db.wishes.get(entry.itemId);
        if (!wish) {
          const nameKey = entry.itemName.toLowerCase();
          wish = (await db.wishes.toArray()).find(
            (w) => w.title.toLowerCase() === nameKey
          );
        }
        if (!wish) {
          if (entry.itemType === "photo" && tripId) {
            const wishId = generateSyncId("wish", now);
            const newWish: Wish = {
              id: wishId,
              title: entry.itemName,
              tags: ["place"],
              priority: "C",
              notes: "",
              photoSets: [await toPhotoResolutions(dataUri)],
              latitude: entry.latitude,
              longitude: entry.longitude,
              capturedAt: entry.capturedAt,
              createdAt: now,
              updatedAt: now,
            };
            await db.wishes.add(newWish);
            await db.tripWishSelections.add({
              id: `${tripId}__${wishId}`,
              tripId,
              wishId,
              completed: false,
              status: "planned",
              addedAt: now,
              userId,
            });
            if (entry.date) {
              await db.itineraryItems.add({
                id: generateSyncId("itin", now),
                tripId,
                date: entry.date,
                sourceType: "wish",
                sourceId: wishId,
                itemType: "place",
                title: entry.itemName,
                startTime: "09:00",
                durationMinutes: 60,
                completed: false,
                sortOrder: 0,
                userId,
                createdAt: now,
                updatedAt: now,
              });
            }
            if (auth.currentUser) pushWish(newWish, auth.currentUser.uid).catch(() => {});
            created++;
            continue;
          }
          if (await linkToDayItem(entry, dataUri, tripId)) {
            linked++;
            continue;
          }
          notFound++;
          continue;
        }
        {
          const existingSets = wish.photoSets || [];
          const existingPhotos = wish.photos || [];
          const alreadyLinked = existingPhotos.includes(dataUri)
            || existingSets.some((ps) => ps.full === dataUri || ps.display === dataUri || ps.thumbnail === dataUri);
          if (!alreadyLinked) {
            // Compress to the app's normal multi-resolution photoSets
            // shape (see toPhotoResolutions doc comment) instead of the
            // raw dataUri. PhotoPicker/getPhotos() render ONLY photoSets
            // once any exist, ignoring flat photos[] entirely — migrate
            // any pre-existing flat photos into photoSets now so they
            // don't silently disappear once this wish gains its first
            // photoSet entry.
            const newSet = await toPhotoResolutions(dataUri);
            const migratedSets = existingSets.length === 0 && existingPhotos.length > 0
              ? await Promise.all(existingPhotos.map((p) => toPhotoResolutions(p)))
              : existingSets;
            // updatedAt MUST be bumped here — it drives cloud sync's
            // last-write-wins merge (see Wish.updatedAt doc comment). Without
            // this, the record keeps its old timestamp even though its
            // photos just changed locally; the next pull/subscribe cycle
            // (pullWishes/subscribeToWishes, both a blind db.wishes.put())
            // would then see the remote copy as "newer" and silently
            // overwrite this photo addition. Confirmed via user report: one
            // of two ride photos reverted to its pre-import state after a
            // successful-looking import, while the other (whose remote
            // updatedAt happened to be older) survived — a timing-dependent
            // data-loss bug, not a matching bug.
            const updated: Wish = {
              ...wish,
              photoSets: [...migratedSets, newSet],
              photos: existingSets.length === 0 && existingPhotos.length > 0 ? [] : wish.photos,
              updatedAt: now,
            };
            await db.wishes.put(updated);
            if (auth.currentUser) pushWish(updated, auth.currentUser.uid).catch(() => {});
          }
        }
        linked++;
        continue;
      }

      if (PACKING_TYPES.has(entry.itemType)) {
        let item = entry.itemId ? await db.packingItems.get(entry.itemId) : undefined;
        if (!item) {
          const nameKey = entry.itemName.toLowerCase();
          item = (await db.packingItems.toArray()).find(
            (p) => p.name.toLowerCase() === nameKey
          );
        }
        if (!item) {
          if (await linkToDayItem(entry, dataUri, tripId)) {
            linked++;
            continue;
          }
          notFound++;
          continue;
        }
        {
          const existingSets = item.photoSets || [];
          const existingPhotos = item.photos || [];
          const alreadyLinked = existingPhotos.includes(dataUri)
            || existingSets.some((ps) => ps.full === dataUri || ps.display === dataUri || ps.thumbnail === dataUri);
          if (alreadyLinked) { linked++; continue; }
          // Same photoSets-compression + migration + last-write-wins
          // reasoning as the Wish branch above.
          const newSet = await toPhotoResolutions(dataUri);
          const migratedSets = existingSets.length === 0 && existingPhotos.length > 0
            ? await Promise.all(existingPhotos.map((p) => toPhotoResolutions(p)))
            : existingSets;
          const updated: PackingItem = {
            ...item,
            photoSets: [...migratedSets, newSet],
            photos: existingSets.length === 0 && existingPhotos.length > 0 ? [] : item.photos,
            updatedAt: now,
          };
          await db.packingItems.put(updated);
          if (auth.currentUser) pushPackingItem(updated, auth.currentUser.uid).catch(() => {});
        }
        linked++;
        continue;
      }

      notFound++; // unrecognized itemType
    } catch (err) {
      console.error("[SyncTranslate] Error linking photo", entry.filename, err);
      notFound++;
    }
  }

  return {
    linked,
    created,
    skipped: notFound,
    skippedReasons: { notFound },
  };
}

// ==================== IMPORT: SYNC PAYLOAD → PWA ====================

/**
 * Import sync data into PWA database for the given trip.
 *
 * Deduplication: when an incoming item's name already exists anywhere in the
 * catalog, no duplicate catalog entry is created — instead a junction record
 * links the trip to the EXISTING item (relink), so the trip always ends up
 * fully populated rather than silently missing items that happened to share
 * a name with something already in the catalog (which could belong to a
 * different trip, or no trip at all).
 *
 * Optional userId stamps all created selections/items with that user.
 */
export async function syncPayloadToPwa(
  payload: SyncPayload,
  tripId: string,
  userId?: string,
): Promise<Record<string, number>> {
  const now = Date.now();

  // Maps of name-key → existing catalog ID, mutated as items are imported to
  // prevent within-import duplicates regardless of what's already in the DB.
  const existingWishes = await db.wishes.toArray();
  const wishByName = new Map<string, string>(
    existingWishes.filter(w => w.title).map(w => [w.title.toLowerCase(), w.id])
  );
  // Park-catalog-id keyed, checked before wishByName in importRides/importShows
  // so a rename alone doesn't defeat dedup for anything linked to the catalog
  // (rides/shows always store parkDataId on creation, see importRides below).
  const wishByParkDataId = new Map<string, string>(
    existingWishes.filter(w => w.parkDataId).map(w => [w.parkDataId!, w.id])
  );
  // Custom (non-catalog) places have no parkDataId — sourcePlaceId is the
  // equivalent stable cross-device key for them, checked before wishByName
  // in importPlaces for the same reason wishByParkDataId is checked first
  // for rides/shows.
  const wishBySourcePlaceId = new Map<string, string>(
    existingWishes.filter(w => w.sourcePlaceId).map(w => [w.sourcePlaceId!, w.id])
  );

  const existingPacking = await db.packingItems.toArray();
  const packingByKey = new Map<string, string>(
    existingPacking.map(p => [`${p.type}:${p.name.toLowerCase()}`, p.id])
  );
  // Same idea for dining (which always imports to the packing side, see
  // importDining) — linkedParkDataIds is an array since some packing items
  // (e.g. multi-shop shopping) can link more than one catalog entity.
  const packingByParkDataId = new Map<string, string>(
    existingPacking.flatMap(p => (p.linkedParkDataIds || []).map(id => [id, p.id] as [string, string]))
  );

  // Run all item imports and collect source→dest ID maps for photo resolution
  const ridesResult    = await importRides(payload.rides || [], tripId, wishByName, wishByParkDataId, now, userId);
  const placesResult   = await importPlaces(payload.places || [], tripId, wishByName, wishBySourcePlaceId, now, userId);
  const showsResult    = await importShows(payload.shows || [], tripId, wishByName, wishByParkDataId, now, userId);
  const diningResult   = await importDining(payload.dining || [], tripId, packingByKey, packingByParkDataId, now, userId);
  const wishesResult   = await importWishes(payload.wishes || [], tripId, wishByName, now, userId);
  const packingResult  = await importPackingItems(payload, tripId, packingByKey, now, userId);
  const shoppingResult = await importShopping(payload.shopping || [], tripId, packingByKey, now, userId);
  const trailCount          = await importTrails(payload.trails || [], tripId, now, userId);
  const scheduledEventsCount = await importScheduledEvents(payload.scheduledEvents || [], tripId, now, userId);
  const dayItemsCount       = await importDayItems(payload.dayItems || [], tripId, now, userId);

  // Merge all source→dest ID maps so importPhotos can resolve any itemId
  const combinedIdMap = new Map<string, string>([
    ...ridesResult.idMap,
    ...placesResult.idMap,
    ...showsResult.idMap,
    ...diningResult.idMap,
    ...wishesResult.idMap,
    ...packingResult.idMap,
    ...shoppingResult.idMap,
  ]);

  await importPhotos(payload.photos || [], combinedIdMap);

  return {
    rides: ridesResult.count,
    places: placesResult.count,
    shows: showsResult.count,
    dining: diningResult.count,
    wishes: wishesResult.count,
    ...packingResult.counts,
    shopping: shoppingResult.count,
    trail: trailCount,
    scheduledEvents: scheduledEventsCount,
    dayItems: dayItemsCount,
  };
}

async function importTrails(
  trails: SyncTrail[],
  tripId: string,
  now: number,
  userId?: string
): Promise<number> {
  let count = 0;
  const uid = userId || "user_primary";
  for (const trail of trails) {
    if (!trail?.date || !Array.isArray(trail.points) || trail.points.length === 0) continue;
    const id = `${tripId}__${trail.date}__${uid}`;
    await db.trails.put({
      id,
      tripId,
      userId: uid,
      date: trail.date,
      resolution: trail.resolution || "medium",
      points: trail.points,
      distanceMiles: trail.distanceMiles || 0,
      durationMinutes: trail.durationMinutes || 0,
      pointCount: trail.pointCount ?? trail.points.length,
      importedAt: now,
    });
    count++;
  }
  return count;
}

// ==================== SCHEDULED EVENTS IMPORT ====================

/**
 * Import ScheduledEvent records into the PWA Dexie scheduledEvents table.
 * Uses the event's own id as the primary key — merge semantics (put overwrites
 * existing records with the same id, so re-importing is idempotent).
 */
async function importScheduledEvents(
  events: SyncScheduledEvent[],
  tripId: string,
  now: number,
  userId?: string
): Promise<number> {
  let count = 0;
  const uid = userId || "user_primary";
  for (const ev of events) {
    if (!ev?.id || !ev?.date || !ev?.sourceId || !ev?.itemType) continue;
    await db.scheduledEvents.put({
      id: ev.id,
      tripId,
      userId: uid,
      date: ev.date,
      sourceId: ev.sourceId,
      itemType: ev.itemType as import("@shared/types/scheduled-event").ScheduledEventItemType,
      scheduledTime: ev.scheduledTime,
      completed: ev.completed ?? false,
      completedAt: ev.completedAt,
      completionDate: ev.completionDate,
      completionTime: ev.completionTime,
      notes: ev.notes,
      photos: Array.isArray(ev.photos) ? ev.photos : [],
      createdAt: ev.createdAt || now,
      updatedAt: now,
    });
    count++;
  }
  return count;
}

// ==================== DAY ITEMS IMPORT ====================

/**
 * Import DayItem records into the PWA Dexie dayItems table.
 * Uses the item's own id as primary key — merge semantics (put overwrites same id).
 * Precondition: item must have id, date, and title.
 */
async function importDayItems(
  items: SyncDayItem[],
  tripId: string,
  now: number,
  userId?: string
): Promise<number> {
  let count = 0;
  const uid = userId || "user_primary";
  for (const di of items) {
    if (!di?.id || !di?.date || !di?.title) continue;
    await db.dayItems.put({
      id: di.id,
      tripId,
      userId: uid,
      date: di.date,
      scheduledTime: di.scheduledTime,
      durationMinutes: di.durationMinutes,
      sortOrder: di.sortOrder ?? di.createdAt ?? now,
      title: di.title,
      itemType: (di.itemType ?? "custom") as import("@shared/types/day-item").DayItemType,
      park: di.park,
      land: di.land,
      notes: di.notes,
      priority: di.priority,
      tags: di.tags,
      sourceId: di.sourceId,
      parkDataId: di.parkDataId,
      completed: di.completed ?? false,
      completedAt: di.completedAt,
      createdAt: di.createdAt || now,
      updatedAt: now,
    });
    count++;
  }
  return count;
}
