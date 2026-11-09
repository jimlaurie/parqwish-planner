import {
  addCustomField,
  applyCollectionCategoryChoice,
  addUserCollectionCategory,
  allCollectionCategories,
  canConvertCollectionFieldType,
  coerceCollectionValue,
  collectionCategoryFields,
  collectionFieldProblem,
  collectionFormFields,
  convertCollectionFieldType,
  deleteCustomField,
  deleteUserCollectionCategory,
  emptyCollectionSettings,
  enabledCollectionCategories,
  finishCollectionFirstRun,
  isCollectionsOn,
  liveCustomFields,
  mergeImportedCollectionFields,
  moveCollectionCategory,
  moveCollectionItemsToCategory,
  recentlyDeletedCollectionFields,
  remapCollectionDetails,
  replaceCollectionChoice,
  resolveCollectionCategory,
  restoreCustomField,
  setBuiltInFieldHidden,
  setCollectionCategoryEnabled,
  setFieldOrder,
  updateCollectionCategory,
  updateCustomField,
} from "../collections";
import { BUILT_IN_COLLECTION_CATEGORIES, MAX_CUSTOM_FIELDS_PER_CATEGORY } from "../constants/collections";
import type { CollectionFieldDef, CollectionItem, CollectionSettings } from "../types/collection";

const T0 = 1_000_000;
const DAY = 24 * 60 * 60 * 1000;

function settingsWith(...ids: string[]): CollectionSettings {
  return ids.reduce((s, id) => setCollectionCategoryEnabled(s, id, true, T0), emptyCollectionSettings(T0));
}

function item(id: string, category: string, details?: CollectionItem["details"]): CollectionItem {
  return { id, category, name: id, state: "have", details, createdAt: T0, updatedAt: T0 };
}

const CITY: CollectionFieldDef = { id: "field_city", name: "City", type: "text" };
const SIZE: CollectionFieldDef = { id: "field_size", name: "Size", type: "choice", choices: ["Small", "Large"] };

// ==================== CATEGORIES ====================

describe("collection categories", () => {
  it("is off until a category is switched on", () => {
    expect(isCollectionsOn(null)).toBe(false);
    expect(isCollectionsOn(emptyCollectionSettings(T0))).toBe(false);
    expect(isCollectionsOn(settingsWith("pins"))).toBe(true);
  });

  it("lists switched-on categories in the user's order, then the rest", () => {
    const s = settingsWith("plush", "pins");
    expect(enabledCollectionCategories(s).map((c) => c.id)).toEqual(["plush", "pins"]);
    const all = allCollectionCategories(s);
    expect(all.slice(0, 2).map((c) => c.id)).toEqual(["plush", "pins"]);
    expect(all).toHaveLength(BUILT_IN_COLLECTION_CATEGORIES.length);
    expect(all.filter((c) => c.enabled)).toHaveLength(2);
  });

  it("switches off without forgetting anything, and reorders", () => {
    let s = settingsWith("pins", "plush", "ears");
    s = moveCollectionCategory(s, "ears", 0, T0 + 1);
    expect(s.enabled).toEqual(["ears", "pins", "plush"]);
    expect(s.updatedAt).toBe(T0 + 1);
    s = setCollectionCategoryEnabled(s, "pins", false, T0 + 2);
    expect(s.enabled).toEqual(["ears", "plush"]);
    expect(resolveCollectionCategory(s, "pins")?.enabled).toBe(false);
  });

  it("overrides a built-in's layout and trading but never its name", () => {
    const s = updateCollectionCategory(settingsWith("plush"), "plush", { trades: true, layout: "board", name: "Mine" }, T0);
    expect(resolveCollectionCategory(s, "plush")).toMatchObject({ name: "Plush", trades: true, layout: "board", builtIn: true });
  });

  it("adds, edits and deletes the user's own categories", () => {
    let s = addUserCollectionCategory(settingsWith("pins"),
      { id: "user_mugs", name: " Starbucks mugs ", layout: "shelf", trades: false }, T0);
    expect(enabledCollectionCategories(s).map((c) => c.name)).toEqual(["Pins", "Starbucks mugs"]);
    expect(resolveCollectionCategory(s, "user_mugs")?.icon).toBe("⭐");
    s = updateCollectionCategory(s, "user_mugs", { name: "Mugs", icon: "☕" }, T0);
    expect(resolveCollectionCategory(s, "user_mugs")).toMatchObject({ name: "Mugs", icon: "☕" });
    s = deleteUserCollectionCategory(s, "user_mugs", T0 + 5);
    expect(resolveCollectionCategory(s, "user_mugs")).toBeUndefined();
    expect(s.enabled).toEqual(["pins"]);
    expect(s.userCategories[0].deletedAt).toBe(T0 + 5);
  });

  it("refuses a user category without the prefix, a name, or a fresh id", () => {
    const s = settingsWith();
    expect(() => addUserCollectionCategory(s, { id: "mugs", name: "Mugs", layout: "list", trades: false }, T0)).toThrow();
    expect(() => addUserCollectionCategory(s, { id: "user_a", name: "  ", layout: "list", trades: false }, T0)).toThrow();
    const once = addUserCollectionCategory(s, { id: "user_a", name: "A", layout: "list", trades: false }, T0);
    expect(() => addUserCollectionCategory(once, { id: "user_a", name: "B", layout: "list", trades: false }, T0)).toThrow();
    expect(() => setCollectionCategoryEnabled(s, "nope", true, T0)).toThrow();
  });

  it("moves only the deleted category's items, keeping their details", () => {
    const items = [item("a", "user_mugs", { field_city: "Paris" }), item("b", "pins")];
    const moved = moveCollectionItemsToCategory(items, "user_mugs", "uncategorised", T0 + 1);
    expect(moved).toEqual([{ ...items[0], category: "uncategorised", updatedAt: T0 + 1 }]);
  });

  it("doesn't change the settings it was given", () => {
    const s = settingsWith("pins");
    const frozen = JSON.stringify(s);
    addCustomField(updateCollectionCategory(s, "pins", { trades: false }, T0), "pins", CITY, T0);
    expect(JSON.stringify(s)).toBe(frozen);
  });
});

// ==================== FIELDS ====================

describe("collection fields", () => {
  it("shows a built-in category's fields, then the user's, and hides switched-off built-ins", () => {
    let s = addCustomField(settingsWith("pins"), "pins", CITY, T0);
    expect(collectionFormFields(s, "pins").map((f) => f.id)).toEqual(
      ["edition", "editionSize", "series", "year", "event", "exclusive", "field_city"]);
    s = setBuiltInFieldHidden(s, "pins", "editionSize", true, T0);
    expect(collectionFormFields(s, "pins").map((f) => f.id)).not.toContain("editionSize");
    expect(collectionCategoryFields(s, "pins").find((e) => e.def.id === "editionSize")?.hidden).toBe(true);
    s = setBuiltInFieldHidden(s, "pins", "editionSize", false, T0);
    expect(collectionFormFields(s, "pins").map((f) => f.id)).toContain("editionSize");
    expect(() => setBuiltInFieldHidden(s, "pins", "field_city", true, T0)).toThrow();
  });

  it("orders the form by fieldOrder, unlisted fields after", () => {
    let s = addCustomField(settingsWith("plush"), "plush", CITY, T0);
    s = setFieldOrder(s, "plush", ["field_city", "year"], T0);
    expect(collectionFormFields(s, "plush").map((f) => f.id)).toEqual(["field_city", "year", "character", "series"]);
  });

  it("allows custom fields on user categories, up to the limit", () => {
    let s = addUserCollectionCategory(settingsWith(), { id: "user_m", name: "Mugs", layout: "shelf", trades: false }, T0);
    for (let i = 0; i < MAX_CUSTOM_FIELDS_PER_CATEGORY; i++) {
      s = addCustomField(s, "user_m", { id: `field_${i}`, name: `F${i}`, type: "text" }, T0);
    }
    expect(collectionFormFields(s, "user_m")).toHaveLength(MAX_CUSTOM_FIELDS_PER_CATEGORY);
    expect(() => addCustomField(s, "user_m", { id: "field_x", name: "X", type: "text" }, T0)).toThrow(/at most/);
  });

  it("checks a field the user types", () => {
    expect(collectionFieldProblem({ name: " ", type: "text" })).toMatch(/name/);
    expect(collectionFieldProblem({ name: "Size", type: "choice", choices: ["S", " s ", ""] })).toMatch(/two choices/);
    expect(collectionFieldProblem({ name: "Size", type: "choice", choices: ["S", "M"] })).toBeNull();
    const s = settingsWith("pins");
    expect(() => addCustomField(s, "pins", { id: "year", name: "Year 2", type: "number" }, T0)).toThrow(/taken/);
  });

  it("tidies what's stored: trimmed names, clean choices, units only on numbers", () => {
    const s = addCustomField(settingsWith("plush"), "plush",
      { id: "field_s", name: " Size ", type: "choice", choices: ["S", "s", " M "], unit: "cm" }, T0);
    expect(liveCustomFields(s, "plush")[0]).toEqual({ id: "field_s", name: "Size", type: "choice", choices: ["S", "M"] });
  });

  it("renames without touching values, and keeps deleted fields restorable for 30 days", () => {
    let s = addCustomField(settingsWith("plush"), "plush", CITY, T0);
    s = updateCustomField(s, "plush", "field_city", { name: "Town" }, T0);
    expect(liveCustomFields(s, "plush")[0]).toMatchObject({ id: "field_city", name: "Town" });
    s = deleteCustomField(s, "plush", "field_city", T0);
    expect(collectionFormFields(s, "plush").map((f) => f.id)).not.toContain("field_city");
    expect(recentlyDeletedCollectionFields(s, "plush", T0 + 29 * DAY).map((f) => f.id)).toEqual(["field_city"]);
    expect(recentlyDeletedCollectionFields(s, "plush", T0 + 31 * DAY)).toEqual([]);
    s = restoreCustomField(s, "plush", "field_city", T0 + DAY);
    expect(collectionFormFields(s, "plush").map((f) => f.id)).toContain("field_city");
    expect(liveCustomFields(s, "plush")[0].deletedAt).toBeUndefined();
  });

  it("frees a slot when a field is deleted, and won't restore past the limit", () => {
    let s = settingsWith("plush");
    for (let i = 0; i < MAX_CUSTOM_FIELDS_PER_CATEGORY; i++) s = addCustomField(s, "plush", { id: `field_${i}`, name: `F${i}`, type: "text" }, T0);
    s = deleteCustomField(s, "plush", "field_0", T0);
    s = addCustomField(s, "plush", { id: "field_new", name: "New", type: "text" }, T0);
    expect(() => restoreCustomField(s, "plush", "field_0", T0)).toThrow(/at most/);
  });
});

// ==================== TYPES AND VALUES ====================

describe("collection field types and values", () => {
  it("converts only between text and choice", () => {
    expect(canConvertCollectionFieldType("text", "choice")).toBe(true);
    expect(canConvertCollectionFieldType("choice", "text")).toBe(true);
    expect(canConvertCollectionFieldType("text", "number")).toBe(false);
    expect(canConvertCollectionFieldType("boolean", "text")).toBe(false);
  });

  it("turns a text field into a list of the values items hold", () => {
    let s = addCustomField(settingsWith("plush"), "plush", CITY, T0);
    const items = [item("a", "plush", { field_city: "Paris" }), item("b", "plush", { field_city: " paris" }),
      item("c", "plush", { field_city: "Tokyo" }), item("d", "plush")];
    s = convertCollectionFieldType(s, "plush", "field_city", "choice", items, T0);
    expect(liveCustomFields(s, "plush")[0]).toMatchObject({ type: "choice", choices: ["Paris", "Tokyo"] });
    s = convertCollectionFieldType(s, "plush", "field_city", "text", items, T0);
    expect(liveCustomFields(s, "plush")[0]).toEqual({ id: "field_city", name: "City", type: "text" });
  });

  it("won't make a list with fewer than two choices, or change to a number", () => {
    const s = addCustomField(settingsWith("plush"), "plush", CITY, T0);
    expect(() => convertCollectionFieldType(s, "plush", "field_city", "choice", [], T0)).toThrow(/two choices/);
    expect(convertCollectionFieldType(s, "plush", "field_city", "choice", [], T0, ["A", "B"])).not.toBe(s);
    expect(() => convertCollectionFieldType(s, "plush", "field_city", "number", [], T0)).toThrow();
  });

  it("moves or clears a removed choice on the items that use it", () => {
    const items = [item("a", "plush", { field_size: "Small", year: 2024 }), item("b", "plush", { field_size: "Large" })];
    expect(replaceCollectionChoice(items, "field_size", "Small", "Large", T0 + 1)).toEqual(
      [{ ...items[0], details: { field_size: "Large", year: 2024 }, updatedAt: T0 + 1 }]);
    expect(replaceCollectionChoice(items, "field_size", "Small", undefined, T0)[0].details).toEqual({ year: 2024 });
    expect(items[0].details).toEqual({ field_size: "Small", year: 2024 });
  });

  it("reads typed and imported values as each type stores them", () => {
    expect(coerceCollectionValue({ id: "n", name: "N", type: "number" }, "1,250")).toBe(1250);
    expect(coerceCollectionValue({ id: "n", name: "N", type: "number" }, "abc")).toBeUndefined();
    expect(coerceCollectionValue({ id: "b", name: "B", type: "boolean" }, "Yes")).toBe(true);
    expect(coerceCollectionValue({ id: "b", name: "B", type: "boolean" }, "maybe")).toBeUndefined();
    expect(coerceCollectionValue(SIZE, "small")).toBe("Small");
    expect(coerceCollectionValue(SIZE, "Medium")).toBeUndefined();
    expect(coerceCollectionValue(CITY, "  ")).toBeUndefined();
    expect(coerceCollectionValue(CITY, 42)).toBe("42");
  });
});

// ==================== IMPORT ====================

describe("importing collection fields", () => {
  let ids = 0;
  const newId = () => `field_new${++ids}`;
  beforeEach(() => { ids = 0; });

  it("matches by id, then by name and type, and adds the rest", () => {
    let s = addCustomField(settingsWith("plush"), "plush", { id: "field_mine", name: "City", type: "text" }, T0);
    const incoming: CollectionFieldDef[] = [
      { id: "year", name: "Year", type: "number" },             // built-in, by id
      { id: "field_theirs", name: " city ", type: "text" },      // by name and type
      { id: "field_tag", name: "Tag colour", type: "text" },     // new, id kept
    ];
    const out = mergeImportedCollectionFields(s, "plush", incoming, T0 + 1, newId);
    expect(out.mapping).toEqual({ year: "year", field_theirs: "field_mine", field_tag: "field_tag" });
    expect(liveCustomFields(out.settings, "plush").map((f) => f.id)).toEqual(["field_mine", "field_tag"]);
    s = out.settings;
    expect(s.updatedAt).toBe(T0 + 1);
  });

  it("doesn't match a field of another type, and gives a clashing id a new one", () => {
    const s = addCustomField(settingsWith("plush"), "plush", { id: "field_a", name: "Size", type: "text" }, T0);
    // same id, another type: its values wouldn't fit, so it's a new field with a new id
    const byId = mergeImportedCollectionFields(s, "plush", [{ id: "field_a", name: "Height", type: "number" }], T0, newId);
    expect(byId.mapping).toEqual({ field_a: "field_new1" });
    expect(liveCustomFields(byId.settings, "plush").map((f) => [f.id, f.name, f.type])).toEqual(
      [["field_a", "Size", "text"], ["field_new1", "Height", "number"]]);
    // a built-in id with the wrong type (a damaged file) doesn't take over the built-in
    expect(mergeImportedCollectionFields(s, "plush", [{ id: "series", name: "Series", type: "number" }], T0, newId).mapping)
      .toEqual({ series: "field_new2" });
    // same name, another type: a separate field
    const byName = mergeImportedCollectionFields(s, "plush", [{ id: "field_z", name: "Size", type: "number" }], T0, newId);
    expect(byName.mapping).toEqual({ field_z: "field_z" });
    expect(liveCustomFields(byName.settings, "plush").map((f) => f.type)).toEqual(["text", "number"]);
  });

  it("maps to a deleted field with the same id, since its values are still on items", () => {
    let s = addCustomField(settingsWith("plush"), "plush", { id: "field_a", name: "Old", type: "text" }, T0);
    s = deleteCustomField(s, "plush", "field_a", T0);
    // a deleted field still owns its id (its values are on items), so the id match maps to it
    expect(mergeImportedCollectionFields(s, "plush", [{ id: "field_a", name: "New", type: "text" }], T0, newId).mapping)
      .toEqual({ field_a: "field_a" });
  });

  it("adds missing choices to a matched custom list", () => {
    const s = addCustomField(settingsWith("plush"), "plush", SIZE, T0);
    const out = mergeImportedCollectionFields(s, "plush",
      [{ id: "field_other", name: "size", type: "choice", choices: ["Large", "Jumbo"] }], T0, newId);
    expect(out.mapping).toEqual({ field_other: "field_size" });
    expect(liveCustomFields(out.settings, "plush")[0].choices).toEqual(["Small", "Large", "Jumbo"]);
  });

  it("keeps fields past the limit as deleted, so their values aren't lost", () => {
    let s = settingsWith("plush");
    for (let i = 0; i < MAX_CUSTOM_FIELDS_PER_CATEGORY; i++) s = addCustomField(s, "plush", { id: `field_${i}`, name: `F${i}`, type: "text" }, T0);
    const out = mergeImportedCollectionFields(s, "plush", [{ id: "field_extra", name: "Extra", type: "text" }], T0 + 9, newId);
    expect(out.mapping).toEqual({ field_extra: "field_extra" });
    expect(recentlyDeletedCollectionFields(out.settings, "plush", T0 + 10).map((f) => f.id)).toEqual(["field_extra"]);
  });

  it("imports a broken choice list as text", () => {
    const out = mergeImportedCollectionFields(settingsWith("plush"), "plush",
      [{ id: "field_c", name: "Colour", type: "choice", choices: ["Red"] }], T0, newId);
    expect(liveCustomFields(out.settings, "plush")[0]).toEqual({ id: "field_c", name: "Colour", type: "text" });
  });

  it("translates an item's details by the mapping and keeps unknown ids", () => {
    expect(remapCollectionDetails({ field_theirs: "Paris", year: 2020, field_x: true },
      { field_theirs: "field_mine", year: "year" })).toEqual({ field_mine: "Paris", year: 2020, field_x: true });
    expect(remapCollectionDetails(undefined, {})).toBeUndefined();
  });
});

// ==================== FIRST VISIT ====================

describe("the collection category picker", () => {
  it("switches on what was picked, keeps the order of those already on, and marks the first visit done", () => {
    const before = settingsWith("plush", "pins", "ears");
    const out = applyCollectionCategoryChoice(before, ["paper", "pins", "plush"], [], T0 + 1);
    expect(out.enabled).toEqual(["plush", "pins", "paper"]);
    expect(out.firstRunDone).toBe(true);
    expect(out.updatedAt).toBe(T0 + 1);
  });

  it("creates the user's own categories picked with it", () => {
    const out = applyCollectionCategoryChoice(settingsWith(), ["user_mugs", "pins"],
      [{ id: "user_mugs", name: "Mugs", icon: "☕", layout: "shelf", trades: false }], T0);
    expect(enabledCollectionCategories(out).map((c) => c.name)).toEqual(["Mugs", "Pins"]);
  });

  it("allows picking none, and refuses ids it doesn't know", () => {
    const out = applyCollectionCategoryChoice(settingsWith("pins"), [], [], T0);
    expect(out.enabled).toEqual([]);
    expect(out.firstRunDone).toBe(true);
    expect(() => applyCollectionCategoryChoice(settingsWith(), ["nope"], [], T0)).toThrow(/unknown/);
  });

  it("marks the first visit done for Not now, only once", () => {
    const s = emptyCollectionSettings(T0);
    const done = finishCollectionFirstRun(s, T0 + 1);
    expect(done.firstRunDone).toBe(true);
    expect(done.enabled).toEqual([]);
    expect(finishCollectionFirstRun(done, T0 + 2)).toBe(done);
  });
});
