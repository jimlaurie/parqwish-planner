// ==================== CRITICAL PATH TESTS ====================
// Pure data tests — no platform dependencies (no Dexie, no AsyncStorage, no React Native).
// Validates data integrity for trips, wishes, packing, itinerary, and sync round-trips.

import type { Trip, TripPhase } from "../types/trip";
import type { Wish, WishTagId, WishStatus, TripWishSelection, PhotoSet } from "../types/wish";
import type { PackingItem, PackingType, TripPackingSelection, Ensemble } from "../types/packing";
import type { ItineraryItem } from "../types/itinerary";
import type { Priority } from "../types/common";
import type { SyncEnvelopeV2, SyncPayload } from "../types/sync";

import {
  normalizeParkKey,
  parkKeyToDisplayName,
  wishTagToSyncCategory,
  emptyPayload,
  DEFAULT_PRIORITY,
} from "../sync-helpers";

import {
  toSyncRide,
  toSyncShow,
  toSyncDining,
  toSyncWish,
  toSyncPackingItem,
  toSyncShoppingItem,
} from "../sync-mappers";

import {
  isValidDate,
  isNonEmptyString,
  isArray,
  isValidEnvelope,
  hasRequiredFields,
} from "../validation";

import { PARK_NAME_TO_KEY, PARK_KEY_TO_NAME } from "../constants/parks";

// ==================== FACTORY HELPERS ====================

const NOW = 1712160000000; // 2024-04-03T16:00:00Z

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-001",
    name: "Spring Break 2026",
    startDate: "2026-04-10",
    endDate: "2026-04-14",
    isTemplate: false,
    phase: "plan",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeWish(overrides: Partial<Wish> = {}): Wish {
  return {
    id: "wish-001",
    title: "Ride Space Mountain at night",
    tags: ["rides"],
    priority: "C",
    createdAt: NOW,
    ...overrides,
  };
}

function makeTripWishSelection(
  tripId: string,
  wishId: string,
  overrides: Partial<TripWishSelection> = {}
): TripWishSelection {
  return {
    id: `${tripId}__${wishId}`,
    tripId,
    wishId,
    completed: false,
    status: "idea",
    addedAt: NOW,
    ...overrides,
  };
}

function makePackingItem(overrides: Partial<PackingItem> = {}): PackingItem {
  return {
    id: "outfit-001",
    type: "outfit",
    name: "Mickey Ears",
    category: "Headwear",
    priority: "C",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeTripPackingSelection(
  tripId: string,
  itemId: string,
  overrides: Partial<TripPackingSelection> = {}
): TripPackingSelection {
  return {
    id: `${tripId}__${itemId}`,
    tripId,
    itemId,
    completed: false,
    addedAt: NOW,
    ...overrides,
  };
}

function makeEnsemble(overrides: Partial<Ensemble> = {}): Ensemble {
  return {
    id: "ensemble-001",
    name: "Day 1 Outfit",
    itemIds: ["outfit-001", "outfit-002"],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeItineraryItem(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: "itin-001",
    tripId: "trip-001",
    date: "2026-04-10",
    sourceType: "wish",
    sourceId: "wish-001",
    title: "Space Mountain",
    startTime: "09:30",
    durationMinutes: 60,
    park: "disneyland",
    land: "Tomorrowland",
    completed: false,
    sortOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makePhotoSet(overrides: Partial<PhotoSet> = {}): PhotoSet {
  return {
    thumbnail: "data:image/jpeg;base64,thumb",
    display: "data:image/jpeg;base64,disp",
    full: "data:image/jpeg;base64,full",
    ...overrides,
  };
}

// ==================== 1. TRIP DATA INTEGRITY ====================

describe("Trip data integrity", () => {
  test("trip creation with required fields", () => {
    const trip = makeTrip();
    expect(trip.id).toBe("trip-001");
    expect(trip.name).toBe("Spring Break 2026");
    expect(trip.startDate).toBe("2026-04-10");
    expect(trip.endDate).toBe("2026-04-14");
    expect(trip.isTemplate).toBe(false);
    expect(trip.phase).toBe("plan");
  });

  test("template trips have empty dates and isTemplate=true", () => {
    const template = makeTrip({
      id: "trip-tpl-001",
      name: "Weekend Getaway Template",
      startDate: "",
      endDate: "",
      isTemplate: true,
    });
    expect(template.isTemplate).toBe(true);
    expect(template.startDate).toBe("");
    expect(template.endDate).toBe("");
  });

  test("trip archival sets isArchived flag", () => {
    const trip = makeTrip();
    expect(trip.isArchived).toBeUndefined();

    const archived = makeTrip({ isArchived: true, archiveFileName: "spring-2026.json" });
    expect(archived.isArchived).toBe(true);
    expect(archived.archiveFileName).toBe("spring-2026.json");
  });

  test("trip phase transitions follow expected order", () => {
    const phases: TripPhase[] = ["plan", "prepare", "play", "publish"];
    phases.forEach((phase, i) => {
      const trip = makeTrip({ phase });
      expect(trip.phase).toBe(phases[i]);
    });

    // Verify all four phases are valid TripPhase values
    expect(phases).toHaveLength(4);
  });

  test("trip travel fields are optional", () => {
    const minimal = makeTrip();
    expect(minimal.flightArrival).toBeUndefined();
    expect(minimal.flightDeparture).toBeUndefined();
    expect(minimal.flightConfirmation).toBeUndefined();
    expect(minimal.flightNotes).toBeUndefined();
    expect(minimal.hotelName).toBeUndefined();
    expect(minimal.hotelConfirmation).toBeUndefined();
    expect(minimal.hotelCheckIn).toBeUndefined();
    expect(minimal.hotelCheckOut).toBeUndefined();
    expect(minimal.hotelNotes).toBeUndefined();
    expect(minimal.transportationType).toBeUndefined();
    expect(minimal.transportationDetails).toBeUndefined();
    expect(minimal.transportationNotes).toBeUndefined();
    expect(minimal.notes).toBeUndefined();
  });

  test("trip with all travel fields populated", () => {
    const trip = makeTrip({
      flightArrival: "2026-04-10T08:00",
      flightDeparture: "2026-04-14T18:00",
      flightConfirmation: "ABC123",
      flightNotes: "Southwest",
      hotelName: "Grand Californian",
      hotelConfirmation: "GCH-456",
      hotelCheckIn: "2026-04-10",
      hotelCheckOut: "2026-04-14",
      hotelNotes: "Room request: park view",
      transportationType: "Uber",
      transportationDetails: "LAX → Disneyland",
      transportationNotes: "Book night before",
      notes: "Bring autograph book",
    });
    expect(trip.flightConfirmation).toBe("ABC123");
    expect(trip.hotelName).toBe("Grand Californian");
    expect(trip.transportationType).toBe("Uber");
    expect(trip.notes).toBe("Bring autograph book");
  });

  test("trip round-trips through JSON without data loss", () => {
    const trip = makeTrip({
      flightArrival: "10:00",
      hotelName: "Grand Californian",
      isArchived: false,
    });
    const restored: Trip = JSON.parse(JSON.stringify(trip));
    expect(restored).toEqual(trip);
  });
});

// ==================== 2. WISH DATA INTEGRITY ====================

describe("Wish data integrity", () => {
  test("wish creation with required fields", () => {
    const wish = makeWish();
    expect(wish.id).toBe("wish-001");
    expect(wish.title).toBe("Ride Space Mountain at night");
    expect(wish.tags).toEqual(["rides"]);
    expect(wish.priority).toBe("C");
    expect(wish.createdAt).toBe(NOW);
  });

  test("TripWishSelection composite ID format", () => {
    const sel = makeTripWishSelection("trip-001", "wish-001");
    expect(sel.id).toBe("trip-001__wish-001");
    expect(sel.tripId).toBe("trip-001");
    expect(sel.wishId).toBe("wish-001");
  });

  test("TripWishSelection ID is deterministic from tripId and wishId", () => {
    const a = makeTripWishSelection("trip-A", "wish-X");
    const b = makeTripWishSelection("trip-A", "wish-X");
    expect(a.id).toBe(b.id);
    expect(a.id).toBe("trip-A__wish-X");
  });

  test("wish status transitions cover all states", () => {
    const statuses: WishStatus[] = ["idea", "planned", "assigned-to-day", "completed", "skipped"];
    statuses.forEach((status) => {
      const sel = makeTripWishSelection("t1", "w1", { status });
      expect(sel.status).toBe(status);
    });
    expect(statuses).toHaveLength(5);
  });

  test("tags validation — all known WishTagId values", () => {
    const validTags: WishTagId[] = ["rides", "shows", "eats", "shopping", "photos", "characters", "other"];
    validTags.forEach((tag) => {
      const wish = makeWish({ tags: [tag] });
      expect(wish.tags).toContain(tag);
    });
    expect(validTags).toHaveLength(7);
  });

  test("wish can have multiple tags", () => {
    const wish = makeWish({ tags: ["rides", "photos", "characters"] });
    expect(wish.tags).toHaveLength(3);
  });

  test("priority validation — valid values are A through E", () => {
    const priorities: Priority[] = ["A", "B", "C", "D", "E"];
    priorities.forEach((p) => {
      const wish = makeWish({ priority: p });
      expect(wish.priority).toBe(p);
    });
    expect(priorities).toHaveLength(5);
  });

  test("PhotoSet structure has all three resolutions", () => {
    const ps = makePhotoSet();
    expect(ps.thumbnail).toBeDefined();
    expect(ps.display).toBeDefined();
    expect(ps.full).toBeDefined();
    // Each resolution is a distinct value
    expect(new Set([ps.thumbnail, ps.display, ps.full]).size).toBe(3);
  });

  test("wish with photoSets array", () => {
    const wish = makeWish({
      photoSets: [makePhotoSet(), makePhotoSet({ thumbnail: "data:image/jpeg;base64,t2" })],
    });
    expect(wish.photoSets).toHaveLength(2);
    expect(wish.photoSets![0].thumbnail).not.toBe(wish.photoSets![1].thumbnail);
  });

  test("parkDataId linking to park data", () => {
    const wish = makeWish({
      parkDataId: "space-mountain",
      park: "disneyland",
      land: "Tomorrowland",
    });
    expect(wish.parkDataId).toBe("space-mountain");
    expect(wish.park).toBe("disneyland");
    expect(wish.land).toBe("Tomorrowland");
  });

  test("maxWaitTime is optional, rides only", () => {
    const rideWish = makeWish({ tags: ["rides"], maxWaitTime: 45 });
    expect(rideWish.maxWaitTime).toBe(45);

    const showWish = makeWish({ tags: ["shows"] });
    expect(showWish.maxWaitTime).toBeUndefined();
  });

  test("wish round-trips through JSON without data loss", () => {
    const wish = makeWish({
      description: "Night ride",
      photoSets: [makePhotoSet()],
      parkDataId: "space-mountain",
      maxWaitTime: 60,
    });
    const restored: Wish = JSON.parse(JSON.stringify(wish));
    expect(restored).toEqual(wish);
  });
});

// ==================== 3. PACKING DATA INTEGRITY ====================

describe("Packing data integrity", () => {
  test("PackingItem creation by type — all 5 types", () => {
    const types: PackingType[] = ["outfit", "equipment", "sundry", "shopping", "dining"];
    types.forEach((type) => {
      const item = makePackingItem({ type });
      expect(item.type).toBe(type);
    });
    expect(types).toHaveLength(5);
  });

  test("TripPackingSelection composite ID format", () => {
    const sel = makeTripPackingSelection("trip-001", "outfit-001");
    expect(sel.id).toBe("trip-001__outfit-001");
    expect(sel.tripId).toBe("trip-001");
    expect(sel.itemId).toBe("outfit-001");
  });

  test("TripPackingSelection ID is deterministic", () => {
    const a = makeTripPackingSelection("trip-A", "eq-X");
    const b = makeTripPackingSelection("trip-A", "eq-X");
    expect(a.id).toBe(b.id);
  });

  test("shopping-specific fields", () => {
    const item = makePackingItem({
      type: "shopping",
      price: "29.99",
      url: "https://shopdisney.com/spirit-jersey",
      // shops is string[] in the interface
    });
    expect(item.price).toBe("29.99");
    expect(item.url).toBe("https://shopdisney.com/spirit-jersey");
  });

  test("dining-specific fields", () => {
    const item = makePackingItem({
      type: "dining",
      reservationTime: "18:30",
      reservationConfirmation: "BB-12345",
      partySize: 4,
      diningType: "reservation",
      dietaryNotes: "Vegetarian",
    });
    expect(item.reservationTime).toBe("18:30");
    expect(item.reservationConfirmation).toBe("BB-12345");
    expect(item.partySize).toBe(4);
    expect(item.diningType).toBe("reservation");
    expect(item.dietaryNotes).toBe("Vegetarian");
  });

  test("dining diningType can be reservation or walk-up", () => {
    const res = makePackingItem({ type: "dining", diningType: "reservation" });
    const walk = makePackingItem({ type: "dining", diningType: "walk-up" });
    expect(res.diningType).toBe("reservation");
    expect(walk.diningType).toBe("walk-up");
  });

  test("ensemble creation with itemIds array", () => {
    const ensemble = makeEnsemble();
    expect(ensemble.id).toBe("ensemble-001");
    expect(ensemble.name).toBe("Day 1 Outfit");
    expect(ensemble.itemIds).toEqual(["outfit-001", "outfit-002"]);
  });

  test("ensemble can be empty", () => {
    const empty = makeEnsemble({ itemIds: [] });
    expect(empty.itemIds).toHaveLength(0);
  });

  test("ensemble round-trips through JSON", () => {
    const ensemble = makeEnsemble({ description: "Park day look", coverPhoto: "data:img" });
    const restored: Ensemble = JSON.parse(JSON.stringify(ensemble));
    expect(restored).toEqual(ensemble);
  });

  test("packing item with photoSets", () => {
    const item = makePackingItem({
      photoSets: [makePhotoSet()],
    });
    expect(item.photoSets).toHaveLength(1);
    expect(item.photoSets![0].thumbnail).toBeDefined();
  });

  test("packing item with linkedWishIds and linkedParkDataIds", () => {
    const item = makePackingItem({
      linkedWishIds: ["wish-001", "wish-002"],
      linkedParkDataIds: ["space-mountain"],
    });
    expect(item.linkedWishIds).toHaveLength(2);
    expect(item.linkedParkDataIds).toHaveLength(1);
  });
});

// ==================== 4. ITINERARY DATA INTEGRITY ====================

describe("Itinerary data integrity", () => {
  test("ItineraryItem with tripId + date composite", () => {
    const item = makeItineraryItem();
    expect(item.tripId).toBe("trip-001");
    expect(item.date).toBe("2026-04-10");
    // tripId + date together scope items to a single day in a trip
    expect(item.tripId + "__" + item.date).toBe("trip-001__2026-04-10");
  });

  test("time fields — startTime as HH:mm", () => {
    const item = makeItineraryItem({ startTime: "14:30" });
    expect(item.startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(item.startTime).toBe("14:30");
  });

  test("durationMinutes is a positive number", () => {
    const item = makeItineraryItem({ durationMinutes: 90 });
    expect(item.durationMinutes).toBe(90);
    expect(item.durationMinutes).toBeGreaterThan(0);
  });

  test("sourceType and sourceId linking back to wishes/packing", () => {
    const wishItem = makeItineraryItem({ sourceType: "wish", sourceId: "wish-001" });
    expect(wishItem.sourceType).toBe("wish");
    expect(wishItem.sourceId).toBe("wish-001");

    const diningItem = makeItineraryItem({ sourceType: "dining", sourceId: "dining-001" });
    expect(diningItem.sourceType).toBe("dining");

    const shoppingItem = makeItineraryItem({ sourceType: "shopping", sourceId: "shopping-001" });
    expect(shoppingItem.sourceType).toBe("shopping");

    const customItem = makeItineraryItem({ sourceType: "custom", sourceId: undefined });
    expect(customItem.sourceType).toBe("custom");
    expect(customItem.sourceId).toBeUndefined();
  });

  test("all four sourceType values are valid", () => {
    const types: ItineraryItem["sourceType"][] = ["wish", "dining", "shopping", "custom"];
    types.forEach((t) => {
      const item = makeItineraryItem({ sourceType: t });
      expect(item.sourceType).toBe(t);
    });
    expect(types).toHaveLength(4);
  });

  test("sortOrder for ordering", () => {
    const items = [
      makeItineraryItem({ id: "itin-3", sortOrder: 2 }),
      makeItineraryItem({ id: "itin-1", sortOrder: 0 }),
      makeItineraryItem({ id: "itin-2", sortOrder: 1 }),
    ];
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    expect(sorted.map((i) => i.id)).toEqual(["itin-1", "itin-2", "itin-3"]);
  });

  test("parkDataId for map marker linking", () => {
    const item = makeItineraryItem({ parkDataId: "space-mountain" });
    expect(item.parkDataId).toBe("space-mountain");
  });

  test("itinerary item round-trips through JSON", () => {
    const item = makeItineraryItem({ notes: "Front of the line", parkDataId: "pirates" });
    const restored: ItineraryItem = JSON.parse(JSON.stringify(item));
    expect(restored).toEqual(item);
  });
});

// ==================== 5. SYNC ROUND-TRIP THROUGH MAPPERS ====================

describe("Sync round-trip through mappers", () => {
  test("Wish-like object → toSyncRide → fields map correctly", () => {
    const wish = makeWish({
      id: "wish-ride-001",
      title: "Space Mountain",
      tags: ["rides"],
      priority: "E",
    });

    const syncRide = toSyncRide(
      {
        id: wish.id,
        name: wish.title,
        park: "Disneyland Park",
        land: "Tomorrowland",
        priority: wish.priority,
        maxWait: wish.maxWaitTime,
        completed: false,
      },
      "2026-04-10"
    );

    expect(syncRide.id).toBe("wish-ride-001");
    expect(syncRide.name).toBe("Space Mountain");
    expect(syncRide.park).toBe("disneyland");
    expect(syncRide.land).toBe("Tomorrowland");
    expect(syncRide.priority).toBe("E");
    expect(syncRide.completed).toBe(false);
    expect(syncRide.date).toBe("2026-04-10");
  });

  test("PackingItem-like object → toSyncShoppingItem → price is string", () => {
    const item = makePackingItem({
      id: "shopping-001",
      type: "shopping",
      name: "Spirit Jersey",
      price: "79.99",
    });

    const syncItem = toSyncShoppingItem(
      {
        id: item.id,
        name: item.name,
        category: item.category,
        priority: item.priority,
        completed: false,
        price: 79.99, // numeric input
        shops: ["emporium"],
        url: "https://shopdisney.com",
      },
      "2026-04-10"
    );

    expect(typeof syncItem.price).toBe("string");
    expect(syncItem.price).toBe("79.99");
    expect(syncItem.shops).toEqual(["emporium"]);
  });

  test("normalizeParkKey round-trips: display name → key → display name", () => {
    // For every known display name, converting to key then back should yield a valid name
    for (const [displayName, key] of Object.entries(PARK_NAME_TO_KEY)) {
      const normalizedKey = normalizeParkKey(displayName);
      expect(normalizedKey).toBe(key);

      const backToName = parkKeyToDisplayName(normalizedKey);
      expect(backToName).toBe(PARK_KEY_TO_NAME[key]);
    }
  });

  test("normalizeParkKey round-trips: key → display name → key", () => {
    for (const [key, displayName] of Object.entries(PARK_KEY_TO_NAME)) {
      const normalizedKey = normalizeParkKey(displayName);
      expect(normalizedKey).toBe(key);
    }
  });

  test("wishTagToSyncCategory maps all known tag groups correctly", () => {
    expect(wishTagToSyncCategory(["rides"])).toBe("rides");
    expect(wishTagToSyncCategory(["shows"])).toBe("shows");
    expect(wishTagToSyncCategory(["eats"])).toBe("dining");
    expect(wishTagToSyncCategory(["shopping"])).toBe("wishes");
    expect(wishTagToSyncCategory(["photos"])).toBe("wishes");
    expect(wishTagToSyncCategory(["characters"])).toBe("wishes");
    expect(wishTagToSyncCategory(["other"])).toBe("wishes");
    expect(wishTagToSyncCategory([])).toBe("wishes");
  });

  test("emptyPayload → JSON → parse produces identical structure", () => {
    const original = emptyPayload();
    const json = JSON.stringify(original);
    const restored: SyncPayload = JSON.parse(json);

    expect(restored).toEqual(original);
    expect(Object.keys(restored)).toHaveLength(10);
    for (const key of Object.keys(restored) as (keyof SyncPayload)[]) {
      expect(restored[key]).toEqual([]);
    }
  });

  test("full sync payload round-trip through JSON", () => {
    const payload = emptyPayload();
    payload.rides.push(
      toSyncRide({ id: "r1", name: "Matterhorn", park: "disneyland", land: "Fantasyland" }, "2026-04-10")
    );
    payload.shows.push(
      toSyncShow({ id: "s1", name: "Fantasmic!", park: "disneyland", land: "Frontierland" }, "2026-04-10")
    );
    payload.dining.push(
      toSyncDining({ id: "d1", name: "Blue Bayou", type: "reservation" }, "2026-04-10")
    );
    payload.wishes.push(
      toSyncWish({ id: "w1", title: "Get a Dole Whip", tags: ["eats"] }, "2026-04-10")
    );
    payload.shopping.push(
      toSyncShoppingItem({ id: "sh1", name: "Pin Set", price: 19.99 }, "2026-04-10")
    );

    const restored: SyncPayload = JSON.parse(JSON.stringify(payload));
    expect(restored).toEqual(payload);
    expect(restored.rides).toHaveLength(1);
    expect(restored.shows).toHaveLength(1);
    expect(restored.dining).toHaveLength(1);
    expect(restored.wishes).toHaveLength(1);
    expect(restored.shopping).toHaveLength(1);
  });

  test("SyncEnvelopeV2 structure round-trips through JSON", () => {
    const envelope: SyncEnvelopeV2 = {
      version: "2.0",
      type: "sync",
      source: "pwa",
      encrypted: false,
      exportDate: "2026-04-10T12:00:00Z",
      exportedBy: "user_primary",
      categories: ["rides", "shows", "dining"],
      dateRange: { startDate: "2026-04-10", endDate: "2026-04-14" },
      codeHash: "abc123hash",
      data: emptyPayload(),
    };

    const restored: SyncEnvelopeV2 = JSON.parse(JSON.stringify(envelope));
    expect(restored).toEqual(envelope);
    expect(restored.version).toBe("2.0");
    expect(restored.categories).toHaveLength(3);
  });

  test("mapper defaults apply consistently when fields are missing", () => {
    const date = "2026-01-01";
    const ride = toSyncRide({ id: "r", name: "R" }, date);
    const show = toSyncShow({ id: "s", name: "S" }, date);
    const dining = toSyncDining({ id: "d", name: "D" }, date);
    const wish = toSyncWish({ id: "w", title: "W" }, date);
    const packing = toSyncPackingItem({ id: "p", name: "P" }, date);
    const shopping = toSyncShoppingItem({ id: "sh", name: "SH" }, date);

    // All default to priority C
    const allPriorities = [ride, show, dining, wish, packing, shopping].map((i) => i.priority);
    expect(allPriorities.every((p) => p === DEFAULT_PRIORITY)).toBe(true);

    // All default to completed false
    const allCompleted = [ride, show, dining, wish, packing, shopping].map((i) => i.completed);
    expect(allCompleted.every((c) => c === false)).toBe(true);

    // Location-based mappers default park to disneyland
    expect(ride.park).toBe("disneyland");
    expect(show.park).toBe("disneyland");
    expect(dining.park).toBe("disneyland");
  });
});

// ==================== 6. VALIDATION EDGE CASES ====================

describe("Validation edge cases", () => {
  describe("isValidDate", () => {
    test("accepts valid YYYY-MM-DD dates", () => {
      expect(isValidDate("2026-04-10")).toBe(true);
      expect(isValidDate("2025-01-01")).toBe(true);
      expect(isValidDate("2026-12-31")).toBe(true);
      expect(isValidDate("2000-02-29")).toBe(true); // leap year
    });

    test("rejects invalid dates", () => {
      expect(isValidDate("")).toBe(false);
      expect(isValidDate("not-a-date")).toBe(false);
      expect(isValidDate("04/10/2026")).toBe(false); // wrong format
      expect(isValidDate("2026-4-10")).toBe(false); // single digit month
      expect(isValidDate("2026-13-01")).toBe(false); // month 13
      expect(isValidDate("2026-00-01")).toBe(false); // month 0
    });

    test("rejects non-string values", () => {
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate(12345)).toBe(false);
      expect(isValidDate({})).toBe(false);
      expect(isValidDate([])).toBe(false);
    });

    test("rejects dates with extra content", () => {
      expect(isValidDate("2026-04-10T00:00:00")).toBe(false);
      expect(isValidDate("2026-04-10 ")).toBe(false);
    });
  });

  describe("hasRequiredFields", () => {
    test("returns true when all required fields are non-empty strings", () => {
      const item = { id: "wish-001", title: "Test", priority: "C" };
      expect(hasRequiredFields(item, "id", "title", "priority")).toBe(true);
    });

    test("returns false when a required field is missing", () => {
      const item = { id: "wish-001" } as Record<string, unknown>;
      expect(hasRequiredFields(item, "id", "title")).toBe(false);
    });

    test("returns false when a required field is empty string", () => {
      const item = { id: "wish-001", title: "" };
      expect(hasRequiredFields(item, "id", "title")).toBe(false);
    });

    test("returns false when a required field is whitespace only", () => {
      const item = { id: "wish-001", title: "   " };
      expect(hasRequiredFields(item, "id", "title")).toBe(false);
    });

    test("returns false when a required field is non-string", () => {
      const item = { id: "wish-001", count: 42 } as Record<string, unknown>;
      expect(hasRequiredFields(item, "id", "count")).toBe(false);
    });

    test("returns true with no required fields", () => {
      const item = { id: "wish-001" };
      expect(hasRequiredFields(item)).toBe(true);
    });
  });

  describe("isValidEnvelope", () => {
    test("accepts complete envelope", () => {
      const envelope = {
        version: "2.0",
        data: { rides: [], shows: [] },
      };
      expect(isValidEnvelope(envelope)).toBe(true);
    });

    test("accepts envelope with dateRange", () => {
      const envelope = {
        version: "2.0",
        data: { rides: [] },
        dateRange: { startDate: "2026-04-10", endDate: "2026-04-14" },
      };
      expect(isValidEnvelope(envelope)).toBe(true);
    });

    test("rejects null/undefined", () => {
      expect(isValidEnvelope(null)).toBe(false);
      expect(isValidEnvelope(undefined)).toBe(false);
    });

    test("rejects non-objects", () => {
      expect(isValidEnvelope("string")).toBe(false);
      expect(isValidEnvelope(42)).toBe(false);
      expect(isValidEnvelope(true)).toBe(false);
    });

    test("rejects missing version", () => {
      expect(isValidEnvelope({ data: {} })).toBe(false);
    });

    test("rejects empty version", () => {
      expect(isValidEnvelope({ version: "", data: {} })).toBe(false);
    });

    test("rejects missing data", () => {
      expect(isValidEnvelope({ version: "2.0" })).toBe(false);
    });

    test("rejects data that is not an object", () => {
      expect(isValidEnvelope({ version: "2.0", data: "string" })).toBe(false);
      expect(isValidEnvelope({ version: "2.0", data: null })).toBe(false);
    });
  });

  describe("isNonEmptyString", () => {
    test("accepts non-empty strings", () => {
      expect(isNonEmptyString("hello")).toBe(true);
      expect(isNonEmptyString("a")).toBe(true);
    });

    test("rejects empty and whitespace-only strings", () => {
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString("   ")).toBe(false);
    });

    test("rejects non-string values", () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(0)).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
    });
  });

  describe("isArray", () => {
    test("accepts arrays", () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(["a"])).toBe(true);
    });

    test("rejects non-arrays", () => {
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
      expect(isArray("string")).toBe(false);
      expect(isArray({})).toBe(false);
      expect(isArray(42)).toBe(false);
    });
  });
});
