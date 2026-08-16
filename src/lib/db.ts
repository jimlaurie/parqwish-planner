import Dexie, { type EntityTable } from "dexie";
import type { ScheduledEventRecord } from "@shared/types/scheduled-event";
import type { DayItemRecord } from "@shared/types/day-item";

// ==================== TYPE DEFINITIONS ====================
// Core types from shared data layer

export type { Priority, ParkKey } from "@shared/types/common";
export type { Wish, WishStatus, PhotoSet, TripWishSelection, WishTagId } from "@shared/types/wish";
export type { PackingItem, PackingType, TripPackingSelection, Ensemble } from "@shared/types/packing";
export type { ItineraryItem } from "@shared/types/itinerary";
export type { DayItemRecord, DayItemType, DayItem } from "@shared/types/day-item";
export type { Trip, TripPhase, FlightLeg, HotelStay, TransportLeg } from "@shared/types/trip";

// Import types needed for Dexie table definitions
import type { Trip } from "@shared/types/trip";
import type { Wish, TripWishSelection } from "@shared/types/wish";
import type { PackingItem, TripPackingSelection, Ensemble } from "@shared/types/packing";
import type { ItineraryItem } from "@shared/types/itinerary";
import type { PhotoResolutions } from "./image-utils";

// PWA-specific: User type (slightly different from mobile's UserProfile)
export interface User {
  id: string;
  name: string;
  color: string;
  role: "primary" | "guest";
  createdAt: number;
  updatedAt?: number;    // Bumped on every mutation — used for cloud-sync last-write-wins
  syncedFromMobile?: boolean;
}

// PWA-specific: GPS trail for a single day, imported from mobile
export interface TripTrail {
  id: string; // tripId__date__userId
  tripId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  resolution: "high" | "medium" | "low";
  points: Array<{
    latitude: number;
    longitude: number;
    timestamp: number;
    accuracy: number;
  }>;
  distanceMiles: number;
  durationMinutes: number;
  pointCount: number;
  importedAt: number;
}

// PWA-specific: photo METADATA only (Phase 3C) — never the image bytes.
// Mobile pushes this whenever a photo is added to any item; the actual
// photo stays on-device unless the user separately saves/shares it through
// their own OS-level cloud photo backup. This lets the PWA know a photo
// exists, when it was taken, and what it's linked to, independent of
// whether the bytes ever arrive anywhere.
export interface PhotoMetadata {
  id: string; // tripId__photoId
  tripId: string;
  photoId: string;
  itemId: string;
  itemType: string;
  userId: string;
  date: string;
  takenAt?: string;
  location?: { lat: number; lng: number } | null;
  importedAt: number;
}

// PWA-specific: a standalone photo imported from the user's device (Photos
// app, PhotoPass/Disney App downloads) rather than captured through an
// item's own photo picker. Deliberately its own table, not a Wish — these
// carry none of a Wish's catalog baggage (tags, priority, completion), just
// a photo and where/when it was taken. Feeds both the Trip Map (as a marker,
// when placed) and Publish's photo gallery (always) — see use-trip-photos.ts.
export interface TripPhoto {
  id: string;
  tripId: string;
  date: string; // YYYY-MM-DD — which trip day this photo belongs to
  photoSets: PhotoResolutions[]; // always exactly one entry; array for shape-parity with Wish/PackingItem photoSets
  caption?: string;
  latitude?: number;
  longitude?: number;
  capturedAt?: string; // ISO-8601, from EXIF when available
  linkedParkDataId?: string; // resolved ride/show/dining/shop, if placed via the location picker
  linkedWishId?: string; // resolved custom Place (a place-tagged Wish), if placed that way
  createdAt: number;
}

// PWA-specific: Sync history entry for tracking exports/imports/archives
export interface SyncHistoryEntry {
  id: string;
  type: "export" | "import" | "archive";
  date: string; // ISO date
  name: string; // trip name or file name
  code?: string; // 6-digit code (for exports)
  categories: string[];
  dateRange?: { startDate: string; endDate: string };
  itemCount: number;
}

// ==================== DATABASE ====================

const db = new Dexie("ParQwishPWA") as Dexie & {
  trips: EntityTable<Trip, "id">;
  wishes: EntityTable<Wish, "id">;
  tripWishSelections: EntityTable<TripWishSelection, "id">;
  packingItems: EntityTable<PackingItem, "id">;
  tripPackingSelections: EntityTable<TripPackingSelection, "id">;
  itineraryItems: EntityTable<ItineraryItem, "id">;
  users: EntityTable<User, "id">;
  ensembles: EntityTable<Ensemble, "id">;
  syncHistory: EntityTable<SyncHistoryEntry, "id">;
  trails: EntityTable<TripTrail, "id">;
  scheduledEvents: EntityTable<ScheduledEventRecord, "id">;
  dayItems: EntityTable<DayItemRecord, "id">;
  photoMetadata: EntityTable<PhotoMetadata, "id">;
  tripPhotos: EntityTable<TripPhoto, "id">;
};

db.version(1).stores({
  trips: "id, name, startDate, phase",
  wishes: "id, tripId, status, *tags",
});

db.version(2).stores({
  trips: "id, name, startDate, phase",
  wishes: "id, tripId, status, *tags",
  packingItems: "id, tripId, type, completed, category",
});

db.version(3)
  .stores({
    trips: "id, name, startDate, phase",
    wishes: "id, tripId, status, *tags",
    packingItems: "id, type, category",
    tripPackingSelections: "id, tripId, itemId",
  })
  .upgrade(async (tx) => {
    // Migrate existing v2 packing items:
    // Move tripId + completed into junction table, strip from catalog
    const items = await tx.table("packingItems").toArray();

    const selections: TripPackingSelection[] = [];
    for (const item of items) {
      if (item.tripId) {
        selections.push({
          id: `${item.tripId}__${item.id}`,
          tripId: item.tripId,
          itemId: item.id,
          completed: item.completed ?? false,
          addedAt: item.createdAt,
        });
      }
    }

    if (selections.length > 0) {
      await tx.table("tripPackingSelections").bulkAdd(selections);
    }

    // Strip legacy fields from catalog items
    await tx
      .table("packingItems")
      .toCollection()
      .modify((item: Record<string, unknown>) => {
        delete item.tripId;
        delete item.completed;
      });
  });

db.version(4)
  .stores({
    trips: "id, name, startDate, phase",
    wishes: "id, *tags",
    tripWishSelections: "id, tripId, wishId",
    packingItems: "id, type, category",
    tripPackingSelections: "id, tripId, itemId",
  })
  .upgrade(async (tx) => {
    // Migrate existing wishes:
    // Move tripId + status + completed into junction table, strip from catalog
    const wishes = await tx.table("wishes").toArray();

    const selections: TripWishSelection[] = [];
    for (const wish of wishes) {
      if (wish.tripId) {
        selections.push({
          id: `${wish.tripId}__${wish.id}`,
          tripId: wish.tripId,
          wishId: wish.id,
          completed: wish.completed ?? false,
          status: wish.status ?? "idea",
          addedAt: wish.createdAt,
        });
      }
    }

    if (selections.length > 0) {
      await tx.table("tripWishSelections").bulkAdd(selections);
    }

    // Strip legacy fields from catalog wishes
    await tx
      .table("wishes")
      .toCollection()
      .modify((wish: Record<string, unknown>) => {
        delete wish.tripId;
        delete wish.status;
        delete wish.completed;
      });
  });

db.version(5)
  .stores({
    trips: "id, name, startDate, phase",
    wishes: "id, *tags",
    tripWishSelections: "id, tripId, wishId",
    packingItems: "id, type, category",
    tripPackingSelections: "id, tripId, itemId",
  })
  .upgrade(async (tx) => {
    // Migrate PackingItem.photoUri → photos[]
    await tx
      .table("packingItems")
      .toCollection()
      .modify((item: Record<string, unknown>) => {
        if (item.photoUri) {
          item.photos = [item.photoUri as string];
          delete item.photoUri;
        }
      });
  });

// v6: Add linkedItemIds to Wish (no index change needed)
db.version(6).stores({
  trips: "id, name, startDate, phase",
  wishes: "id, *tags",
  tripWishSelections: "id, tripId, wishId",
  packingItems: "id, type, category",
  tripPackingSelections: "id, tripId, itemId",
});

// v7: Move linking to PackingItem side, add park/land to Wish, add dining fields to PackingItem
db.version(7)
  .stores({
    trips: "id, name, startDate, phase",
    wishes: "id, *tags",
    tripWishSelections: "id, tripId, wishId",
    packingItems: "id, type, category",
    tripPackingSelections: "id, tripId, itemId",
  })
  .upgrade(async (tx) => {
    // Remove linkedItemIds from wishes (linking now on PackingItem side)
    await tx
      .table("wishes")
      .toCollection()
      .modify((wish: Record<string, unknown>) => {
        delete wish.linkedItemIds;
      });
  });

// v8: Add itineraryItems table for Play phase day-of scheduling
db.version(8).stores({
  trips: "id, name, startDate, phase",
  wishes: "id, *tags",
  tripWishSelections: "id, tripId, wishId",
  packingItems: "id, type, category",
  tripPackingSelections: "id, tripId, itemId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime",
});

// v9: Add users table for sync identity
db.version(9).stores({
  trips: "id, name, startDate, phase",
  wishes: "id, *tags",
  tripWishSelections: "id, tripId, wishId",
  packingItems: "id, type, category",
  tripPackingSelections: "id, tripId, itemId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime",
  users: "id, name, role",
});

// v10: Add isTemplate + travel detail fields to trips
db.version(10)
  .stores({
    trips: "id, name, startDate, phase, isTemplate",
    wishes: "id, *tags",
    tripWishSelections: "id, tripId, wishId",
    packingItems: "id, type, category",
    tripPackingSelections: "id, tripId, itemId",
    itineraryItems: "id, tripId, date, [tripId+date], startTime",
    users: "id, name, role",
  })
  .upgrade(async (tx) => {
    // Add isTemplate: false to all existing trips
    await tx
      .table("trips")
      .toCollection()
      .modify((trip: Record<string, unknown>) => {
        if (trip.isTemplate === undefined) {
          trip.isTemplate = false;
        }
      });
  });

// v11: Add isArchived + archiveFileName to trips for archive feature
db.version(11)
  .stores({
    trips: "id, name, startDate, phase, isTemplate, isArchived",
    wishes: "id, *tags",
    tripWishSelections: "id, tripId, wishId",
    packingItems: "id, type, category",
    tripPackingSelections: "id, tripId, itemId",
    itineraryItems: "id, tripId, date, [tripId+date], startTime",
    users: "id, name, role",
  })
  .upgrade(async (tx) => {
    await tx
      .table("trips")
      .toCollection()
      .modify((trip: Record<string, unknown>) => {
        if (trip.isArchived === undefined) {
          trip.isArchived = false;
        }
      });
  });

// v12: Add ensembles table for reusable item groupings
db.version(12).stores({
  trips: "id, name, startDate, phase, isTemplate, isArchived",
  wishes: "id, *tags",
  tripWishSelections: "id, tripId, wishId",
  packingItems: "id, type, category",
  tripPackingSelections: "id, tripId, itemId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime",
  users: "id, name, role",
  ensembles: "id, name",
});

// v13: Add syncHistory table for tracking exports/imports/archives
db.version(13).stores({
  trips: "id, name, startDate, phase, isTemplate, isArchived",
  wishes: "id, *tags",
  tripWishSelections: "id, tripId, wishId",
  packingItems: "id, type, category",
  tripPackingSelections: "id, tripId, itemId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime",
  users: "id, name, role",
  ensembles: "id, name",
  syncHistory: "id, type, date",
});

// v14: Add userId index to junction tables and itinerary for per-user ownership
db.version(14)
  .stores({
    trips: "id, name, startDate, phase, isTemplate, isArchived",
    wishes: "id, *tags",
    tripWishSelections: "id, tripId, wishId, userId",
    packingItems: "id, type, category",
    tripPackingSelections: "id, tripId, itemId, userId",
    itineraryItems: "id, tripId, date, [tripId+date], startTime, userId",
    users: "id, name, role",
    ensembles: "id, name",
    syncHistory: "id, type, date",
  })
  .upgrade(async (tx) => {
    // Backfill existing rows with default user
    await tx
      .table("tripWishSelections")
      .toCollection()
      .modify((row: Record<string, unknown>) => {
        if (row.userId === undefined) {
          row.userId = "user_primary";
        }
      });

    await tx
      .table("tripPackingSelections")
      .toCollection()
      .modify((row: Record<string, unknown>) => {
        if (row.userId === undefined) {
          row.userId = "user_primary";
        }
      });

    await tx
      .table("itineraryItems")
      .toCollection()
      .modify((row: Record<string, unknown>) => {
        if (row.userId === undefined) {
          row.userId = "user_primary";
        }
      });
  });

// v15: Migrate single-string travel fields → flights[], hotels[], transports[]
db.version(15)
  .stores({
    trips: "id, name, startDate, phase, isTemplate, isArchived",
    wishes: "id, *tags",
    tripWishSelections: "id, tripId, wishId, userId",
    packingItems: "id, type, category",
    tripPackingSelections: "id, tripId, itemId, userId",
    itineraryItems: "id, tripId, date, [tripId+date], startTime, userId",
    users: "id, name, role",
    ensembles: "id, name",
    syncHistory: "id, type, date",
  })
  .upgrade(async (tx) => {
    await tx
      .table("trips")
      .toCollection()
      .modify((trip: Record<string, unknown>) => {
        // Migrate flights
        if (!trip.flights) {
          const legs: Record<string, unknown>[] = [];
          if (trip.flightArrival) {
            legs.push({
              notes: trip.flightArrival as string,
              confirmation: (trip.flightConfirmation as string) || undefined,
            });
          }
          if (trip.flightDeparture) {
            legs.push({
              notes: trip.flightDeparture as string,
            });
          }
          // If only confirmation/notes exist with no arrival/departure
          if (legs.length === 0 && (trip.flightConfirmation || trip.flightNotes)) {
            legs.push({
              confirmation: (trip.flightConfirmation as string) || undefined,
              notes: (trip.flightNotes as string) || undefined,
            });
          } else if (legs.length > 0 && trip.flightNotes) {
            // Append flight notes to first leg
            const first = legs[0];
            first.notes = first.notes
              ? `${first.notes}\n${trip.flightNotes}`
              : trip.flightNotes;
          }
          trip.flights = legs.length > 0 ? legs : [];
        }

        // Migrate hotels
        if (!trip.hotels) {
          if (trip.hotelName || trip.hotelConfirmation || trip.hotelCheckIn) {
            trip.hotels = [{
              name: (trip.hotelName as string) || undefined,
              confirmation: (trip.hotelConfirmation as string) || undefined,
              checkIn: (trip.hotelCheckIn as string) || undefined,
              checkOut: (trip.hotelCheckOut as string) || undefined,
              notes: (trip.hotelNotes as string) || undefined,
            }];
          } else {
            trip.hotels = [];
          }
        }

        // Migrate transports
        if (!trip.transports) {
          if (trip.transportationType || trip.transportationDetails) {
            trip.transports = [{
              type: (trip.transportationType as string) || undefined,
              details: (trip.transportationDetails as string) || undefined,
              notes: (trip.transportationNotes as string) || undefined,
            }];
          } else {
            trip.transports = [];
          }
        }
      });
  });

// v16: Add trails table for GPS breadcrumbs imported from mobile
db.version(16).stores({
  trips: "id, name, startDate, phase, isTemplate, isArchived",
  wishes: "id, *tags",
  tripWishSelections: "id, tripId, wishId, userId",
  packingItems: "id, type, category",
  tripPackingSelections: "id, tripId, itemId, userId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime, userId",
  users: "id, name, role",
  ensembles: "id, name",
  syncHistory: "id, type, date",
  trails: "id, tripId, userId, date, [tripId+date]",
});

// v17: Add scheduledEvents table for timeline event instances.
//   • sourceId indexes allow fast lookup of all events for a given source item.
//   • [tripId+date] compound index supports "all events for a trip day" queries.
db.version(17).stores({
  trips: "id, name, startDate, phase, isTemplate, isArchived",
  wishes: "id, *tags",
  tripWishSelections: "id, tripId, wishId, userId",
  packingItems: "id, type, category",
  tripPackingSelections: "id, tripId, itemId, userId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime, userId",
  users: "id, name, role",
  ensembles: "id, name",
  syncHistory: "id, type, date",
  trails: "id, tripId, userId, date, [tripId+date]",
  scheduledEvents: "id, tripId, userId, date, sourceId, itemType, [tripId+date]",
});

// v18: Introduce dayItems — unified self-contained snapshot of any planned day
//   activity, replacing the parallel itineraryItems + scheduledEvents systems.
//
//   Migration:
//     • itineraryItems → dayItems  (title already stored; startTime → scheduledTime)
//     • scheduledEvents → dayItems  (title resolved from wishes/packingItems lookup)
//
//   Both source tables are kept read-only for now; Phase F removes them.
db.version(18)
  .stores({
    trips: "id, name, startDate, phase, isTemplate, isArchived",
    wishes: "id, *tags",
    tripWishSelections: "id, tripId, wishId, userId",
    packingItems: "id, type, category",
    tripPackingSelections: "id, tripId, itemId, userId",
    itineraryItems: "id, tripId, date, [tripId+date], startTime, userId",
    users: "id, name, role",
    ensembles: "id, name",
    syncHistory: "id, type, date",
    trails: "id, tripId, userId, date, [tripId+date]",
    scheduledEvents: "id, tripId, userId, date, sourceId, itemType, [tripId+date]",
    dayItems: "id, tripId, userId, date, [tripId+date], scheduledTime, itemType, sourceId",
  })
  .upgrade(async (tx) => {
    const now = Date.now();

    // ---- Build title lookup maps from catalog tables ----
    // These are used when migrating scheduledEvents, which have no stored title.
    const allWishes = await tx.table("wishes").toArray();
    const wishTitleMap = new Map<string, string>(
      allWishes.map((w: Record<string, unknown>) => [w.id as string, w.title as string])
    );

    const allPacking = await tx.table("packingItems").toArray();
    const packingTitleMap = new Map<string, string>(
      allPacking.map((p: Record<string, unknown>) => [p.id as string, (p.name ?? p.title ?? "") as string])
    );

    const dayItemsToAdd: DayItemRecord[] = [];
    // Track IDs already added so we never write a duplicate primary key.
    const addedIds = new Set<string>();

    // ---- 1. Migrate itineraryItems → dayItems ----
    const itinItems = await tx.table("itineraryItems").toArray();
    for (const item of itinItems as Record<string, unknown>[]) {
      const id = item.id as string;
      if (addedIds.has(id)) continue;
      addedIds.add(id);

      dayItemsToAdd.push({
        id,
        tripId:          item.tripId as string,
        userId:          (item.userId as string) ?? "user_primary",
        date:            item.date as string,
        scheduledTime:   item.startTime as string | undefined,
        durationMinutes: item.durationMinutes as number | undefined,
        sortOrder:       (item.sortOrder as number) ?? 0,
        title:           item.title as string,
        itemType:        ((item.itemType ?? item.sourceType) as string ?? "custom") as DayItemRecord["itemType"],
        park:            item.park as string | undefined,
        land:            item.land as string | undefined,
        notes:           item.notes as string | undefined,
        priority:        undefined,
        tags:            undefined,
        photos:          undefined,
        sourceId:        item.sourceId as string | undefined,
        parkDataId:      item.parkDataId as string | undefined,
        completed:       (item.completed as boolean) ?? false,
        completedAt:     undefined,
        createdAt:       (item.createdAt as number) ?? now,
        updatedAt:       (item.updatedAt as number) ?? now,
      });
    }

    // ---- 2. Migrate scheduledEvents → dayItems ----
    const schedEvents = await tx.table("scheduledEvents").toArray();
    for (const evt of schedEvents as Record<string, unknown>[]) {
      const id = evt.id as string;
      if (addedIds.has(id)) continue;
      addedIds.add(id);

      const sourceId   = evt.sourceId as string | undefined;
      const itemType   = evt.itemType as string;
      const evtNotes   = evt.notes as string | undefined;

      // Resolve display title: catalog lookup, then notes fallback, then sourceId.
      let title: string;
      if (sourceId?.startsWith("custom_")) {
        title = evtNotes ?? sourceId;
      } else if (itemType === "wish") {
        title = (sourceId && wishTitleMap.get(sourceId)) ?? evtNotes ?? sourceId ?? "Unknown";
      } else if (itemType === "dining" || itemType === "shopping") {
        title = (sourceId && packingTitleMap.get(sourceId)) ?? evtNotes ?? sourceId ?? "Unknown";
      } else {
        // ride / show / place / lightning_lane — no catalog table available here;
        // notes was used as display name for custom entries, so use that first.
        title = evtNotes ?? sourceId ?? "Unknown";
      }

      dayItemsToAdd.push({
        id,
        tripId:          evt.tripId as string,
        userId:          (evt.userId as string) ?? "user_primary",
        date:            evt.date as string,
        scheduledTime:   evt.scheduledTime as string | undefined,
        durationMinutes: undefined,
        sortOrder:       0,
        title,
        itemType:        itemType as DayItemRecord["itemType"],
        park:            undefined,
        land:            undefined,
        notes:           sourceId?.startsWith("custom_") ? undefined : evtNotes,
        priority:        undefined,
        tags:            undefined,
        photos:          (evt.photos as string[]) ?? undefined,
        sourceId,
        parkDataId:      undefined,
        completed:       (evt.completed as boolean) ?? false,
        completedAt:     evt.completedAt as string | undefined,
        createdAt:       (evt.createdAt as number) ?? now,
        updatedAt:       (evt.updatedAt as number) ?? now,
      });
    }

    if (dayItemsToAdd.length > 0) {
      await tx.table("dayItems").bulkAdd(dayItemsToAdd);
    }
  });

// v19: Add pendingSync index to wishes.
//   • pendingSync = 1 when a wish has been modified locally but not yet
//     pushed to Firestore. The sync engine queries wishes where pendingSync = 1
//     and clears the flag after a successful push.
//   • syncedAt: ISO-8601 timestamp of the last successful sync for this wish.
db.version(19).stores({
  trips: "id, name, startDate, phase, isTemplate, isArchived",
  wishes: "id, *tags, pendingSync",
  tripWishSelections: "id, tripId, wishId, userId",
  packingItems: "id, type, category",
  tripPackingSelections: "id, tripId, itemId, userId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime, userId",
  users: "id, name, role",
  ensembles: "id, name",
  syncHistory: "id, type, date",
  trails: "id, tripId, userId, date, [tripId+date]",
  scheduledEvents: "id, tripId, userId, date, sourceId, itemType, [tripId+date]",
  dayItems: "id, tripId, userId, date, [tripId+date], scheduledTime, itemType, sourceId",
});

// v20: Add userId index to ensembles for per-user ownership.
//   • Existing ensembles keep userId undefined, treated as "user_primary" at
//     read time (no data rewrite needed — same convention as other junction tables).
db.version(20).stores({
  trips: "id, name, startDate, phase, isTemplate, isArchived",
  wishes: "id, *tags, pendingSync",
  tripWishSelections: "id, tripId, wishId, userId",
  packingItems: "id, type, category",
  tripPackingSelections: "id, tripId, itemId, userId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime, userId",
  users: "id, name, role",
  ensembles: "id, name, userId",
  syncHistory: "id, type, date",
  trails: "id, tripId, userId, date, [tripId+date]",
  scheduledEvents: "id, tripId, userId, date, sourceId, itemType, [tripId+date]",
  dayItems: "id, tripId, userId, date, [tripId+date], scheduledTime, itemType, sourceId",
});

// v21: Add photoMetadata table (Phase 3C) — id/itemId/itemType/timestamp/
// location synced from mobile; never the image bytes.
db.version(21).stores({
  trips: "id, name, startDate, phase, isTemplate, isArchived",
  wishes: "id, *tags, pendingSync",
  tripWishSelections: "id, tripId, wishId, userId",
  packingItems: "id, type, category",
  tripPackingSelections: "id, tripId, itemId, userId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime, userId",
  users: "id, name, role",
  ensembles: "id, name, userId",
  syncHistory: "id, type, date",
  trails: "id, tripId, userId, date, [tripId+date]",
  scheduledEvents: "id, tripId, userId, date, sourceId, itemType, [tripId+date]",
  dayItems: "id, tripId, userId, date, [tripId+date], scheduledTime, itemType, sourceId",
  photoMetadata: "id, tripId, itemId, [tripId+itemId], date",
});

// v22: Add userId index to wishes/packingItems for catalog creator filtering.
//   • Existing rows keep userId undefined, treated as "user_primary" at read
//     time (no data rewrite needed — same convention as v20's ensembles.userId).
db.version(22).stores({
  trips: "id, name, startDate, phase, isTemplate, isArchived",
  wishes: "id, *tags, pendingSync, userId",
  tripWishSelections: "id, tripId, wishId, userId",
  packingItems: "id, type, category, userId",
  tripPackingSelections: "id, tripId, itemId, userId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime, userId",
  users: "id, name, role",
  ensembles: "id, name, userId",
  syncHistory: "id, type, date",
  trails: "id, tripId, userId, date, [tripId+date]",
  scheduledEvents: "id, tripId, userId, date, sourceId, itemType, [tripId+date]",
  dayItems: "id, tripId, userId, date, [tripId+date], scheduledTime, itemType, sourceId",
  photoMetadata: "id, tripId, itemId, [tripId+itemId], date",
});

// v23: Add tripPhotos table — standalone photos imported from the user's
// device (Photos app, PhotoPass downloads), independent of any catalog item.
db.version(23).stores({
  trips: "id, name, startDate, phase, isTemplate, isArchived",
  wishes: "id, *tags, pendingSync, userId",
  tripWishSelections: "id, tripId, wishId, userId",
  packingItems: "id, type, category, userId",
  tripPackingSelections: "id, tripId, itemId, userId",
  itineraryItems: "id, tripId, date, [tripId+date], startTime, userId",
  users: "id, name, role",
  ensembles: "id, name, userId",
  syncHistory: "id, type, date",
  trails: "id, tripId, userId, date, [tripId+date]",
  scheduledEvents: "id, tripId, userId, date, sourceId, itemType, [tripId+date]",
  dayItems: "id, tripId, userId, date, [tripId+date], scheduledTime, itemType, sourceId",
  photoMetadata: "id, tripId, itemId, [tripId+itemId], date",
  tripPhotos: "id, tripId, date, [tripId+date]",
});

// Without this, an already-open tab (e.g. left open from before a schema
// bump) blocks every other tab's db.open() from ever resolving — Dexie has
// no built-in timeout, so trips/queries/writes just hang forever with no
// error. Closing this tab's connection as soon as another tab requests an
// upgrade lets that tab's open() proceed immediately; this tab will show a
// stale page until reloaded, same as any other "new version available" case.
db.on("versionchange", () => {
  db.close();
});

export default db;
