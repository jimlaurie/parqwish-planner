import {
  BUILT_IN_COLLECTION_CATEGORIES,
  UNCATEGORISED_COLLECTION,
  collectionCategoryForShopping,
  countsTowardCollectionLimit,
  getBuiltInCollectionCategory,
  isUserCollectionCategoryId,
  normalizeCollectionCategory,
} from "../collections";
import { PACKING_CATEGORIES } from "../packing";

describe("built-in collection categories", () => {
  it("has unique ids, none looking like a user category", () => {
    const ids = BUILT_IN_COLLECTION_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some(isUserCollectionCategoryId)).toBe(false);
    expect(ids).not.toContain(UNCATEGORISED_COLLECTION.id);
  });

  it("includes Coins & Medallions (pressed coins) and Autographs as dated lists without trading (design §10)", () => {
    for (const id of ["pressed-pennies", "autographs"]) {
      const c = getBuiltInCollectionCategory(id)!;
      expect(c.layout).toBe("list");
      expect(c.trades).toBe(false);
    }
  });

  it("names Bags and Coins & Medallions by their old ids, so stored items keep their category", () => {
    expect(getBuiltInCollectionCategory("loungefly")?.name).toBe("Bags");
    expect(getBuiltInCollectionCategory("pressed-pennies")?.name).toBe("Coins & Medallions");
    expect(getBuiltInCollectionCategory("pressed-pennies")?.fields.find((f) => f.id === "coin")?.choices).toContain("Medallion");
  });

  it("trades only pins by default", () => {
    expect(BUILT_IN_COLLECTION_CATEGORIES.filter((c) => c.trades).map((c) => c.id)).toEqual(["pins"]);
  });

  it("gives every field a unique id within its category, and choice fields at least two choices", () => {
    for (const c of BUILT_IN_COLLECTION_CATEGORIES) {
      const ids = c.fields.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const f of c.fields) {
        if (f.type === "choice") expect(f.choices!.length).toBeGreaterThanOrEqual(2);
        expect(f.id.startsWith("field_")).toBe(false);
      }
    }
  });

  it("uses one definition per shared field id, so a moved item's values mean the same", () => {
    const byId = new Map<string, string>();
    for (const c of BUILT_IN_COLLECTION_CATEGORIES) {
      for (const f of c.fields) {
        const shape = JSON.stringify(f);
        expect(byId.get(f.id) ?? shape).toBe(shape);
        byId.set(f.id, shape);
      }
    }
  });
});

describe("collection category lookups", () => {
  it("finds built-ins and Uncategorised, not user ids", () => {
    expect(getBuiltInCollectionCategory("pins")?.name).toBe("Pins");
    expect(getBuiltInCollectionCategory("uncategorised")).toBe(UNCATEGORISED_COLLECTION);
    expect(getBuiltInCollectionCategory("user_abc")).toBeUndefined();
  });

  it("normalises blank to Uncategorised and keeps unknown ids", () => {
    expect(normalizeCollectionCategory("")).toBe("uncategorised");
    expect(normalizeCollectionCategory(undefined)).toBe("uncategorised");
    expect(normalizeCollectionCategory(" pins ")).toBe("pins");
    expect(normalizeCollectionCategory("user_x1")).toBe("user_x1");
    expect(normalizeCollectionCategory("a-future-built-in")).toBe("a-future-built-in");
  });

  it("maps shopping sub-categories that exist to built-in collection categories", () => {
    expect(collectionCategoryForShopping("Pins & Collectibles")).toBe("pins");
    expect(collectionCategoryForShopping("Food & Treats")).toBeUndefined();
    expect(collectionCategoryForShopping(null)).toBeUndefined();
    for (const name of ["Pins & Collectibles", "Ears & Headwear", "Toys & Plush", "Clothing"]) {
      expect(PACKING_CATEGORIES.shopping).toContain(name);
      expect(getBuiltInCollectionCategory(collectionCategoryForShopping(name)!)).toBeDefined();
    }
  });

  it("doesn't count gone items toward Pal Free's limit", () => {
    expect(countsTowardCollectionLimit("have")).toBe(true);
    expect(countsTowardCollectionLimit("want")).toBe(true);
    expect(countsTowardCollectionLimit("trade")).toBe(true);
    expect(countsTowardCollectionLimit("gone")).toBe(false);
  });
});
