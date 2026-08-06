// ==================== SYNC HELPERS & MAPPERS TESTS ====================
// Pure function tests — no platform dependencies.

import {
  normalizeParkKey,
  parkKeyToDisplayName,
  generateSyncId,
  wishTagToSyncCategory,
  normalizeDiningType,
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

// ==================== SYNC HELPERS ====================

describe("normalizeParkKey", () => {
  test("returns 'disneyland' for undefined/empty", () => {
    expect(normalizeParkKey()).toBe("disneyland");
    expect(normalizeParkKey("")).toBe("disneyland");
  });

  test("passes through known keys", () => {
    expect(normalizeParkKey("disneyland")).toBe("disneyland");
    expect(normalizeParkKey("californiaadventure")).toBe("californiaadventure");
    expect(normalizeParkKey("downtown")).toBe("downtown");
    expect(normalizeParkKey("grandcalifornian")).toBe("grandcalifornian");
    expect(normalizeParkKey("disneyland_hotel")).toBe("disneyland_hotel");
    expect(normalizeParkKey("pixar_place_hotel")).toBe("pixar_place_hotel");
  });

  test("converts display names to keys", () => {
    expect(normalizeParkKey("Disneyland")).toBe("disneyland");
    expect(normalizeParkKey("Disneyland Park")).toBe("disneyland");
    expect(normalizeParkKey("California Adventure")).toBe("californiaadventure");
    expect(normalizeParkKey("Disney California Adventure")).toBe("californiaadventure");
    expect(normalizeParkKey("Downtown Disney")).toBe("downtown");
    expect(normalizeParkKey("Grand Californian")).toBe("grandcalifornian");
  });

  test("falls back to lowercase for unknown names", () => {
    expect(normalizeParkKey("Magic Kingdom")).toBe("magickingdom");
    expect(normalizeParkKey("Some Park")).toBe("somepark");
  });
});

describe("parkKeyToDisplayName", () => {
  test("converts known keys to display names", () => {
    expect(parkKeyToDisplayName("disneyland")).toBe("Disneyland");
    expect(parkKeyToDisplayName("californiaadventure")).toBe("California Adventure");
    expect(parkKeyToDisplayName("downtown")).toBe("Downtown Disney");
  });

  test("returns key as-is for unknown keys", () => {
    expect(parkKeyToDisplayName("unknown")).toBe("unknown");
  });
});

describe("generateSyncId", () => {
  test("generates ID with correct prefix and timestamp", () => {
    const id = generateSyncId("wish", 1000);
    expect(id).toMatch(/^wish_sync_1000_[a-z0-9]+$/);
  });

  test("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSyncId("test")));
    expect(ids.size).toBe(100);
  });

  test("uses different prefixes", () => {
    expect(generateSyncId("ride")).toMatch(/^ride_sync_/);
    expect(generateSyncId("itin")).toMatch(/^itin_sync_/);
    expect(generateSyncId("packing")).toMatch(/^packing_sync_/);
  });
});

describe("wishTagToSyncCategory", () => {
  test("maps ride tags to rides", () => {
    expect(wishTagToSyncCategory(["rides"])).toBe("rides");
    expect(wishTagToSyncCategory(["rides", "photos"])).toBe("rides");
  });

  test("maps show tags to shows", () => {
    expect(wishTagToSyncCategory(["shows"])).toBe("shows");
  });

  test("maps eats tags to dining", () => {
    expect(wishTagToSyncCategory(["eats"])).toBe("dining");
  });

  test("falls back to wishes for other tags", () => {
    expect(wishTagToSyncCategory(["photos"])).toBe("wishes");
    expect(wishTagToSyncCategory(["characters"])).toBe("wishes");
    expect(wishTagToSyncCategory(["other"])).toBe("wishes");
    expect(wishTagToSyncCategory([])).toBe("wishes");
  });

  test("rides takes priority over other tags", () => {
    expect(wishTagToSyncCategory(["rides", "shows", "eats"])).toBe("rides");
  });

  test("shows takes priority over eats", () => {
    expect(wishTagToSyncCategory(["shows", "eats"])).toBe("shows");
  });
});

describe("normalizeDiningType", () => {
  test("returns valid types as-is", () => {
    expect(normalizeDiningType("reservation")).toBe("reservation");
    expect(normalizeDiningType("walk-up")).toBe("walk-up");
    expect(normalizeDiningType("mobile-order")).toBe("mobile-order");
  });

  test("normalizes casing", () => {
    expect(normalizeDiningType("Reservation")).toBe("reservation");
    expect(normalizeDiningType("WALK-UP")).toBe("walk-up");
  });

  test("defaults to walk-up for undefined/unknown", () => {
    expect(normalizeDiningType()).toBe("walk-up");
    expect(normalizeDiningType("")).toBe("walk-up");
    expect(normalizeDiningType("takeout")).toBe("walk-up");
  });
});

describe("emptyPayload", () => {
  test("creates payload with all 10 empty arrays", () => {
    const payload = emptyPayload();
    expect(Object.keys(payload)).toHaveLength(10);
    expect(payload.rides).toEqual([]);
    expect(payload.shows).toEqual([]);
    expect(payload.dining).toEqual([]);
    expect(payload.wishes).toEqual([]);
    expect(payload.outfits).toEqual([]);
    expect(payload.equipment).toEqual([]);
    expect(payload.sundries).toEqual([]);
    expect(payload.shopping).toEqual([]);
    expect(payload.photos).toEqual([]);
    expect(payload.places).toEqual([]);
  });

  test("returns a new object each call", () => {
    const a = emptyPayload();
    const b = emptyPayload();
    expect(a).not.toBe(b);
    a.rides.push({} as never);
    expect(b.rides).toHaveLength(0);
  });
});

// ==================== SYNC MAPPERS ====================

describe("toSyncRide", () => {
  test("maps full input", () => {
    const result = toSyncRide({
      id: "ride-001",
      name: "Space Mountain",
      park: "Disneyland",
      land: "Tomorrowland",
      priority: "E",
      maxWait: 60,
      completed: true,
      notes: "Front row",
    }, "2026-04-15");

    expect(result).toEqual({
      id: "ride-001",
      name: "Space Mountain",
      park: "disneyland",
      land: "Tomorrowland",
      priority: "E",
      maxWait: 60,
      completed: true,
      notes: "Front row",
      date: "2026-04-15",
    });
  });

  test("applies defaults for missing fields", () => {
    const result = toSyncRide({ id: "r1", name: "Test" }, "2026-01-01");

    expect(result.park).toBe("disneyland");
    expect(result.land).toBe("");
    expect(result.priority).toBe(DEFAULT_PRIORITY);
    expect(result.completed).toBe(false);
    expect(result.notes).toBe("");
    expect(result.maxWait).toBeUndefined();
  });

  test("normalizes park display name to key", () => {
    const result = toSyncRide({
      id: "r1", name: "Test", park: "Disney California Adventure",
    }, "2026-01-01");
    expect(result.park).toBe("californiaadventure");
  });
});

describe("toSyncShow", () => {
  test("maps full input", () => {
    const result = toSyncShow({
      id: "show-001",
      name: "Fantasmic!",
      park: "disneyland",
      land: "Frontierland",
      showTime: "21:00",
      timeType: "fixed",
      travelTime: 15,
      priority: "E",
      completed: false,
      notes: "Arrive early",
    }, "2026-04-15");

    expect(result.showTime).toBe("21:00");
    expect(result.timeType).toBe("fixed");
    expect(result.travelTime).toBe(15);
  });

  test("defaults timeType to fixed", () => {
    const result = toSyncShow({ id: "s1", name: "Test" }, "2026-01-01");
    expect(result.timeType).toBe("fixed");
  });

  test("normalizes timeType casing", () => {
    const result = toSyncShow({ id: "s1", name: "Test", timeType: "Range" }, "2026-01-01");
    expect(result.timeType).toBe("range");
  });
});

describe("toSyncDining", () => {
  test("maps full input with all dining fields", () => {
    const result = toSyncDining({
      id: "dining-001",
      name: "Blue Bayou",
      park: "disneyland",
      land: "New Orleans Square",
      time: "18:30",
      type: "reservation",
      priority: "D",
      completed: false,
      reservationConfirmation: "BB-12345",
      partySize: 4,
      dietaryNotes: "Vegetarian",
    }, "2026-04-15");

    expect(result.type).toBe("reservation");
    expect(result.reservationConfirmation).toBe("BB-12345");
    expect(result.partySize).toBe(4);
    expect(result.dietaryNotes).toBe("Vegetarian");
  });

  test("accepts diningType field (mobile format)", () => {
    const result = toSyncDining({
      id: "d1", name: "Test", diningType: "reservation",
    }, "2026-01-01");
    expect(result.type).toBe("reservation");
  });

  test("type field takes priority over diningType", () => {
    const result = toSyncDining({
      id: "d1", name: "Test", type: "mobile-order", diningType: "reservation",
    }, "2026-01-01");
    expect(result.type).toBe("mobile-order");
  });

  test("defaults to walk-up", () => {
    const result = toSyncDining({ id: "d1", name: "Test" }, "2026-01-01");
    expect(result.type).toBe("walk-up");
  });
});

describe("toSyncWish", () => {
  test("maps full input", () => {
    const result = toSyncWish({
      id: "wish-001",
      title: "Ride Big Thunder at sunset",
      description: "Golden hour lighting",
      tags: ["rides", "photos"],
      priority: "C",
      completed: false,
      url: "https://example.com",
      notes: "Check wait times",
    }, "2026-04-15");

    expect(result.title).toBe("Ride Big Thunder at sunset");
    expect(result.tags).toEqual(["rides", "photos"]);
    expect(result.url).toBe("https://example.com");
  });

  test("defaults tags to empty array", () => {
    const result = toSyncWish({ id: "w1", title: "Test" }, "2026-01-01");
    expect(result.tags).toEqual([]);
  });
});

describe("toSyncPackingItem", () => {
  test("maps full input", () => {
    const result = toSyncPackingItem({
      id: "outfit-001",
      name: "Mickey ears",
      category: "Day Wear",
      priority: "C",
      completed: true,
      notes: "Sparkly ones",
    }, "2026-04-15");

    expect(result.name).toBe("Mickey ears");
    expect(result.category).toBe("Day Wear");
    expect(result.completed).toBe(true);
  });

  test("accepts packed field (mobile format)", () => {
    const result = toSyncPackingItem({
      id: "o1", name: "Test", packed: true,
    }, "2026-01-01");
    expect(result.completed).toBe(true);
  });

  test("completed takes priority over packed", () => {
    const result = toSyncPackingItem({
      id: "o1", name: "Test", completed: false, packed: true,
    }, "2026-01-01");
    expect(result.completed).toBe(false);
  });

  test("defaults category to Custom", () => {
    const result = toSyncPackingItem({ id: "o1", name: "Test" }, "2026-01-01");
    expect(result.category).toBe("Custom");
  });
});

describe("toSyncShoppingItem", () => {
  test("maps full input including shopping-specific fields", () => {
    const result = toSyncShoppingItem({
      id: "shopping-001",
      name: "Spirit Jersey",
      category: "Apparel",
      priority: "B",
      completed: false,
      notes: "Purple one",
      price: "79.99",
      shops: ["emporium", "world-of-disney"],
      url: "https://shopdisney.com",
      purchased: false,
    }, "2026-04-15");

    expect(result.price).toBe("79.99");
    expect(result.shops).toEqual(["emporium", "world-of-disney"]);
    expect(result.url).toBe("https://shopdisney.com");
    expect(result.purchased).toBe(false);
  });

  test("converts numeric price to string", () => {
    const result = toSyncShoppingItem({
      id: "s1", name: "Test", price: 29.99,
    }, "2026-01-01");
    expect(result.price).toBe("29.99");
    expect(typeof result.price).toBe("string");
  });

  test("purchased drives completed", () => {
    const result = toSyncShoppingItem({
      id: "s1", name: "Test", purchased: true,
    }, "2026-01-01");
    expect(result.completed).toBe(true);
    expect(result.purchased).toBe(true);
  });

  test("defaults shops to empty array", () => {
    const result = toSyncShoppingItem({ id: "s1", name: "Test" }, "2026-01-01");
    expect(result.shops).toEqual([]);
  });

  test("defaults price to empty string", () => {
    const result = toSyncShoppingItem({ id: "s1", name: "Test" }, "2026-01-01");
    expect(result.price).toBe("");
  });
});

// ==================== CROSS-MAPPER CONSISTENCY ====================

describe("Cross-mapper consistency", () => {
  test("all mappers set the date field from parameter", () => {
    const date = "2026-07-04";
    expect(toSyncRide({ id: "r", name: "R" }, date).date).toBe(date);
    expect(toSyncShow({ id: "s", name: "S" }, date).date).toBe(date);
    expect(toSyncDining({ id: "d", name: "D" }, date).date).toBe(date);
    expect(toSyncWish({ id: "w", title: "W" }, date).date).toBe(date);
    expect(toSyncPackingItem({ id: "p", name: "P" }, date).date).toBe(date);
    expect(toSyncShoppingItem({ id: "sh", name: "SH" }, date).date).toBe(date);
  });

  test("all mappers default priority to C", () => {
    const date = "2026-01-01";
    expect(toSyncRide({ id: "r", name: "R" }, date).priority).toBe("C");
    expect(toSyncShow({ id: "s", name: "S" }, date).priority).toBe("C");
    expect(toSyncDining({ id: "d", name: "D" }, date).priority).toBe("C");
    expect(toSyncWish({ id: "w", title: "W" }, date).priority).toBe("C");
    expect(toSyncPackingItem({ id: "p", name: "P" }, date).priority).toBe("C");
    expect(toSyncShoppingItem({ id: "sh", name: "SH" }, date).priority).toBe("C");
  });

  test("all mappers default completed to false", () => {
    const date = "2026-01-01";
    expect(toSyncRide({ id: "r", name: "R" }, date).completed).toBe(false);
    expect(toSyncShow({ id: "s", name: "S" }, date).completed).toBe(false);
    expect(toSyncDining({ id: "d", name: "D" }, date).completed).toBe(false);
    expect(toSyncWish({ id: "w", title: "W" }, date).completed).toBe(false);
    expect(toSyncPackingItem({ id: "p", name: "P" }, date).completed).toBe(false);
    expect(toSyncShoppingItem({ id: "sh", name: "SH" }, date).completed).toBe(false);
  });

  test("all location-based mappers normalize park keys consistently", () => {
    const date = "2026-01-01";
    const park = "Disney California Adventure";
    expect(toSyncRide({ id: "r", name: "R", park }, date).park).toBe("californiaadventure");
    expect(toSyncShow({ id: "s", name: "S", park }, date).park).toBe("californiaadventure");
    expect(toSyncDining({ id: "d", name: "D", park }, date).park).toBe("californiaadventure");
  });

  test("mappers round-trip through JSON without data loss", () => {
    const ride = toSyncRide({
      id: "ride-001", name: "Space Mountain", park: "disneyland",
      land: "Tomorrowland", priority: "E", maxWait: 60, completed: true,
      notes: "Front row",
    }, "2026-04-15");

    const restored = JSON.parse(JSON.stringify(ride));
    expect(restored).toEqual(ride);
  });
});
