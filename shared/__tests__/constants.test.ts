// ==================== SHARED CONSTANTS TESTS ====================

import {
  TICKET_PRIORITIES,
  TICKET_COLORS,
  PRIORITY_SORT_ORDER,
  PRIORITY_ALIASES,
  type PriorityConfig,
} from "../constants/priorities";

import {
  WISH_TAGS,
  getTagById,
  getTagIcon,
} from "../constants/tags";

import {
  PARK_NAME_TO_KEY,
  PARK_KEY_TO_NAME,
  PARK_SHORT_NAMES,
} from "../constants/parks";

import {
  PACKING_TABS,
  PACKING_CATEGORIES,
  getPackingTab,
} from "../constants/packing";
import type { PackingType } from "../types/packing";

import {
  CATEGORY_META,
  ALL_CATEGORIES,
} from "../constants/sync-categories";

// ==================== PRIORITIES ====================

describe("priorities", () => {
  describe("TICKET_PRIORITIES", () => {
    it("contains exactly A through E", () => {
      expect(TICKET_PRIORITIES).toEqual(["A", "B", "C", "D", "E"]);
    });

    it("has 5 entries", () => {
      expect(TICKET_PRIORITIES).toHaveLength(5);
    });
  });

  describe("TICKET_COLORS", () => {
    it("has a config for every priority", () => {
      for (const p of TICKET_PRIORITIES) {
        expect(TICKET_COLORS[p]).toBeDefined();
      }
    });

    it("each config has bg, border, and label strings", () => {
      for (const p of TICKET_PRIORITIES) {
        const config: PriorityConfig = TICKET_COLORS[p];
        expect(typeof config.bg).toBe("string");
        expect(typeof config.border).toBe("string");
        expect(typeof config.label).toBe("string");
        expect(config.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(config.border).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it("E is labeled Must Do (highest priority)", () => {
      expect(TICKET_COLORS["E"].label).toBe("Must Do");
    });

    it("A is labeled If Time (lowest priority)", () => {
      expect(TICKET_COLORS["A"].label).toBe("If Time");
    });

    it("has distinct labels for each priority", () => {
      const labels = TICKET_PRIORITIES.map((p) => TICKET_COLORS[p].label);
      expect(new Set(labels).size).toBe(labels.length);
    });
  });

  describe("PRIORITY_SORT_ORDER", () => {
    it("E sorts first (0) and A sorts last (4)", () => {
      expect(PRIORITY_SORT_ORDER["E"]).toBe(0);
      expect(PRIORITY_SORT_ORDER["D"]).toBe(1);
      expect(PRIORITY_SORT_ORDER["C"]).toBe(2);
      expect(PRIORITY_SORT_ORDER["B"]).toBe(3);
      expect(PRIORITY_SORT_ORDER["A"]).toBe(4);
    });

    it("has an entry for every priority", () => {
      for (const p of TICKET_PRIORITIES) {
        expect(typeof PRIORITY_SORT_ORDER[p]).toBe("number");
      }
    });

    it("sorting by order puts E first and A last", () => {
      const sorted = [...TICKET_PRIORITIES].sort(
        (a, b) => PRIORITY_SORT_ORDER[a] - PRIORITY_SORT_ORDER[b]
      );
      expect(sorted).toEqual(["E", "D", "C", "B", "A"]);
    });
  });

  describe("PRIORITY_ALIASES", () => {
    it("HIGH maps to E", () => {
      expect(PRIORITY_ALIASES.HIGH).toBe("E");
    });

    it("MEDIUM maps to C", () => {
      expect(PRIORITY_ALIASES.MEDIUM).toBe("C");
    });

    it("LOW maps to A", () => {
      expect(PRIORITY_ALIASES.LOW).toBe("A");
    });

    it("all alias values are valid priorities", () => {
      const validPriorities = new Set(TICKET_PRIORITIES);
      for (const value of Object.values(PRIORITY_ALIASES)) {
        expect(validPriorities.has(value)).toBe(true);
      }
    });
  });
});

// ==================== TAGS ====================

describe("tags", () => {
  describe("WISH_TAGS", () => {
    it("has exactly 6 entries", () => {
      expect(WISH_TAGS).toHaveLength(6);
    });

    it("contains the expected tag ids in order", () => {
      const ids = WISH_TAGS.map((t) => t.id);
      expect(ids).toEqual([
        "rides",
        "shows",
        "eats",
        "shopping",
        "place",
        "other",
      ]);
    });

    it("every tag has id, label, and icon", () => {
      for (const tag of WISH_TAGS) {
        expect(typeof tag.id).toBe("string");
        expect(typeof tag.label).toBe("string");
        expect(typeof tag.icon).toBe("string");
        expect(tag.id.length).toBeGreaterThan(0);
        expect(tag.label.length).toBeGreaterThan(0);
        expect(tag.icon.length).toBeGreaterThan(0);
      }
    });

    it("has unique ids", () => {
      const ids = WISH_TAGS.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("getTagById", () => {
    it("returns the correct tag for each known id", () => {
      expect(getTagById("rides")).toEqual({ id: "rides", label: "Rides", icon: "🎢" });
      expect(getTagById("shows")).toEqual({ id: "shows", label: "Shows", icon: "🎭" });
      expect(getTagById("eats")).toEqual({ id: "eats", label: "Dining", icon: "🍽️" });
      expect(getTagById("other")).toEqual({ id: "other", label: "Other", icon: "⭐" });
    });

    it("returns undefined for unknown id", () => {
      expect(getTagById("nonexistent")).toBeUndefined();
      expect(getTagById("")).toBeUndefined();
    });
  });

  describe("getTagIcon", () => {
    it("returns the icon for a known tag", () => {
      expect(getTagIcon("rides")).toBe("🎢");
      expect(getTagIcon("shows")).toBe("🎭");
      expect(getTagIcon("shopping")).toBe("🛍️");
      expect(getTagIcon("place")).toBe("📍");
    });

    it("returns star fallback for unknown tag", () => {
      expect(getTagIcon("nonexistent")).toBe("⭐");
      expect(getTagIcon("")).toBe("⭐");
    });
  });
});

// ==================== PARKS ====================

describe("parks", () => {
  const ALL_PARK_KEYS = [
    "disneyland",
    "californiaadventure",
    "downtown",
    "grandcalifornian",
    "disneyland_hotel",
    "pixar_place_hotel",
  ] as const;

  describe("PARK_NAME_TO_KEY", () => {
    it("maps standard display names to keys", () => {
      expect(PARK_NAME_TO_KEY["Disneyland"]).toBe("disneyland");
      expect(PARK_NAME_TO_KEY["California Adventure"]).toBe("californiaadventure");
      expect(PARK_NAME_TO_KEY["Downtown Disney"]).toBe("downtown");
      expect(PARK_NAME_TO_KEY["Grand Californian"]).toBe("grandcalifornian");
      expect(PARK_NAME_TO_KEY["Disneyland Hotel"]).toBe("disneyland_hotel");
      expect(PARK_NAME_TO_KEY["Pixar Place Hotel"]).toBe("pixar_place_hotel");
    });

    it("maps alternative aliases to the same keys", () => {
      expect(PARK_NAME_TO_KEY["Disneyland Park"]).toBe("disneyland");
      expect(PARK_NAME_TO_KEY["Disney California Adventure"]).toBe("californiaadventure");
      expect(PARK_NAME_TO_KEY["Downtown Disney District"]).toBe("downtown");
      expect(PARK_NAME_TO_KEY["Disney's Grand Californian Hotel"]).toBe("grandcalifornian");
    });

    it("returns undefined for unknown names", () => {
      expect(PARK_NAME_TO_KEY["Magic Kingdom"]).toBeUndefined();
    });
  });

  describe("PARK_KEY_TO_NAME", () => {
    it("has entries for all 6 park keys", () => {
      for (const key of ALL_PARK_KEYS) {
        expect(PARK_KEY_TO_NAME[key]).toBeDefined();
        expect(typeof PARK_KEY_TO_NAME[key]).toBe("string");
      }
    });

    it("maps keys to expected display names", () => {
      expect(PARK_KEY_TO_NAME["disneyland"]).toBe("Disneyland");
      expect(PARK_KEY_TO_NAME["californiaadventure"]).toBe("California Adventure");
      expect(PARK_KEY_TO_NAME["downtown"]).toBe("Downtown Disney");
      expect(PARK_KEY_TO_NAME["grandcalifornian"]).toBe("Grand Californian");
      expect(PARK_KEY_TO_NAME["disneyland_hotel"]).toBe("Disneyland Hotel");
      expect(PARK_KEY_TO_NAME["pixar_place_hotel"]).toBe("Pixar Place Hotel");
    });
  });

  describe("PARK_SHORT_NAMES", () => {
    it("has entries for all 6 park keys", () => {
      for (const key of ALL_PARK_KEYS) {
        expect(PARK_SHORT_NAMES[key]).toBeDefined();
      }
    });

    it("maps to expected abbreviations", () => {
      expect(PARK_SHORT_NAMES["disneyland"]).toBe("DL");
      expect(PARK_SHORT_NAMES["californiaadventure"]).toBe("DCA");
      expect(PARK_SHORT_NAMES["downtown"]).toBe("DTD");
      expect(PARK_SHORT_NAMES["grandcalifornian"]).toBe("GCH");
      expect(PARK_SHORT_NAMES["disneyland_hotel"]).toBe("DLH");
      expect(PARK_SHORT_NAMES["pixar_place_hotel"]).toBe("PPH");
    });

    it("all short names are 2-3 uppercase characters", () => {
      for (const short of Object.values(PARK_SHORT_NAMES)) {
        expect(short).toMatch(/^[A-Z]{2,3}$/);
      }
    });
  });

  describe("bidirectional consistency", () => {
    it("PARK_NAME_TO_KEY[PARK_KEY_TO_NAME[key]] === key for all park keys", () => {
      for (const key of ALL_PARK_KEYS) {
        const displayName = PARK_KEY_TO_NAME[key];
        expect(PARK_NAME_TO_KEY[displayName]).toBe(key);
      }
    });

    it("every value in PARK_NAME_TO_KEY exists as a key in PARK_KEY_TO_NAME", () => {
      for (const key of Object.values(PARK_NAME_TO_KEY)) {
        expect(PARK_KEY_TO_NAME[key]).toBeDefined();
      }
    });

    it("every key in PARK_KEY_TO_NAME exists as a key in PARK_SHORT_NAMES", () => {
      for (const key of Object.keys(PARK_KEY_TO_NAME)) {
        expect(PARK_SHORT_NAMES[key]).toBeDefined();
      }
    });
  });
});

// ==================== PACKING ====================

describe("packing", () => {
  describe("PACKING_TABS", () => {
    it("has exactly 5 entries", () => {
      expect(PACKING_TABS).toHaveLength(5);
    });

    it("contains the expected tab ids in order", () => {
      const ids = PACKING_TABS.map((t) => t.id);
      expect(ids).toEqual(["outfit", "equipment", "sundry", "shopping", "dining"]);
    });

    it("every tab has id, label, icon, and idPrefix", () => {
      for (const tab of PACKING_TABS) {
        expect(typeof tab.id).toBe("string");
        expect(typeof tab.label).toBe("string");
        expect(typeof tab.icon).toBe("string");
        expect(typeof tab.idPrefix).toBe("string");
        expect(tab.idPrefix.length).toBeGreaterThan(0);
      }
    });

    it("has unique ids", () => {
      const ids = PACKING_TABS.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("has unique idPrefixes", () => {
      const prefixes = PACKING_TABS.map((t) => t.idPrefix);
      expect(new Set(prefixes).size).toBe(prefixes.length);
    });

    it("idPrefixes end with underscore", () => {
      for (const tab of PACKING_TABS) {
        expect(tab.idPrefix).toMatch(/_$/);
      }
    });
  });

  describe("PACKING_CATEGORIES", () => {
    const allTypes = ["outfit", "equipment", "sundry", "shopping", "dining"] as const;

    it("has categories for every PackingType", () => {
      for (const type of allTypes) {
        expect(PACKING_CATEGORIES[type]).toBeDefined();
        expect(Array.isArray(PACKING_CATEGORIES[type])).toBe(true);
        expect(PACKING_CATEGORIES[type].length).toBeGreaterThan(0);
      }
    });

    it("every category list ends with Other", () => {
      for (const type of allTypes) {
        const categories = PACKING_CATEGORIES[type];
        expect(categories[categories.length - 1]).toBe("Other");
      }
    });

    it("all category names are non-empty strings", () => {
      for (const type of allTypes) {
        for (const cat of PACKING_CATEGORIES[type]) {
          expect(typeof cat).toBe("string");
          expect(cat.length).toBeGreaterThan(0);
        }
      }
    });

    it("outfit includes expected categories", () => {
      expect(PACKING_CATEGORIES.outfit).toContain("Day Wear");
      expect(PACKING_CATEGORIES.outfit).toContain("Shoes");
      expect(PACKING_CATEGORIES.outfit).toContain("Accessories");
    });

    it("equipment includes expected categories", () => {
      expect(PACKING_CATEGORIES.equipment).toContain("Electronics");
      expect(PACKING_CATEGORIES.equipment).toContain("Camera Gear");
      expect(PACKING_CATEGORIES.equipment).toContain("First Aid");
    });

    it("dining includes expected categories", () => {
      expect(PACKING_CATEGORIES.dining).toContain("Breakfast");
      expect(PACKING_CATEGORIES.dining).toContain("Character Dining");
    });
  });

  describe("getPackingTab", () => {
    it("returns the correct config for each type", () => {
      const outfit = getPackingTab("outfit");
      expect(outfit).toBeDefined();
      expect(outfit!.id).toBe("outfit");
      expect(outfit!.label).toBe("Outfits");
      expect(outfit!.idPrefix).toBe("outfit_");

      const dining = getPackingTab("dining");
      expect(dining).toBeDefined();
      expect(dining!.id).toBe("dining");
      expect(dining!.label).toBe("Dining");
    });

    it("returns undefined for unknown type", () => {
      expect(getPackingTab("unknown" as PackingType)).toBeUndefined();
    });
  });
});

// ==================== SYNC CATEGORIES ====================

describe("sync-categories", () => {
  const EXPECTED_CATEGORIES = [
    "rides",
    "shows",
    "dining",
    "outfits",
    "equipment",
    "sundries",
    "shopping",
    "wishes",
    "places",
    "trail",
    "scheduled_events",
    "day_items",
  ] as const;

  describe("CATEGORY_META", () => {
    it("has exactly 12 entries", () => {
      expect(Object.keys(CATEGORY_META)).toHaveLength(12);
    });

    it("has an entry for every expected category", () => {
      for (const cat of EXPECTED_CATEGORIES) {
        expect(CATEGORY_META[cat]).toBeDefined();
      }
    });

    it("every entry has label, icon, storageKey, dataType, and payloadKey", () => {
      for (const cat of EXPECTED_CATEGORIES) {
        const meta = CATEGORY_META[cat];
        expect(typeof meta.label).toBe("string");
        expect(typeof meta.icon).toBe("string");
        expect(typeof meta.storageKey).toBe("string");
        expect(typeof meta.payloadKey).toBe("string");
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.icon.length).toBeGreaterThan(0);
        expect(meta.storageKey.length).toBeGreaterThan(0);
      }
    });

    it("dataType is either array or object", () => {
      for (const cat of EXPECTED_CATEGORIES) {
        expect(["array", "object"]).toContain(CATEGORY_META[cat].dataType);
      }
    });

    it("rides dataType is object", () => {
      expect(CATEGORY_META.rides.dataType).toBe("object");
    });

    it("shows dataType is array", () => {
      expect(CATEGORY_META.shows.dataType).toBe("array");
    });

    it("payloadKeys reference valid SyncPayload fields", () => {
      const validPayloadKeys = [
        "rides", "shows", "dining", "wishes",
        "outfits", "equipment", "sundries", "shopping", "photos", "places",
        "trails", "scheduledEvents", "dayItems",
      ];
      for (const cat of EXPECTED_CATEGORIES) {
        expect(validPayloadKeys).toContain(CATEGORY_META[cat].payloadKey);
      }
    });

    it("has unique storageKeys", () => {
      const keys = EXPECTED_CATEGORIES.map((c) => CATEGORY_META[c].storageKey);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("has unique labels", () => {
      const labels = EXPECTED_CATEGORIES.map((c) => CATEGORY_META[c].label);
      expect(new Set(labels).size).toBe(labels.length);
    });
  });

  describe("ALL_CATEGORIES", () => {
    it("has 12 entries", () => {
      expect(ALL_CATEGORIES).toHaveLength(12);
    });

    it("matches the keys of CATEGORY_META", () => {
      const metaKeys = Object.keys(CATEGORY_META).sort();
      const allCatsSorted = [...ALL_CATEGORIES].sort();
      expect(allCatsSorted).toEqual(metaKeys);
    });

    it("contains every expected category", () => {
      for (const cat of EXPECTED_CATEGORIES) {
        expect(ALL_CATEGORIES).toContain(cat);
      }
    });
  });
});
