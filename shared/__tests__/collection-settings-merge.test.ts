import { mergeCollectionSettings, sameCollectionSettings, stampCollectionSettings } from "../collection-settings-merge";
import { addCustomField, addUserCollectionCategory, deleteUserCollectionCategory, setCollectionCategoryEnabled, updateCollectionCategory } from "../collections";
import type { CollectionSettings } from "../types/collection";

const T = 1_000;

function base(): CollectionSettings {
  return stampCollectionSettings(
    { enabled: [], userCategories: [], firstRunDone: false, createdAt: 0, updatedAt: 0 },
    { enabled: ["pins", "plush"], userCategories: [], firstRunDone: true, createdAt: 0, updatedAt: T },
    T,
  );
}

/** A local change: the rule, then stamping, as both apps' stores do. */
function change(s: CollectionSettings, rule: (s: CollectionSettings) => CollectionSettings, now: number): CollectionSettings {
  return stampCollectionSettings(s, rule(s), now);
}

describe("stamping", () => {
  it("stamps only the parts a change touched", () => {
    const next = change(base(), (s) => setCollectionCategoryEnabled(s, "popcorn-buckets", true, T + 5), T + 5);
    expect(next.stamps?.["on:popcorn-buckets"]).toBe(T + 5);
    expect(next.stamps?.["order"]).toBe(T + 5);
    expect(next.stamps?.["on:pins"]).toBe(T);
  });

  it("starts settings that had no stamps at their old updatedAt", () => {
    const old: CollectionSettings = { enabled: ["pins"], userCategories: [], firstRunDone: true, createdAt: 0, updatedAt: 500 };
    const next = change(old, (s) => updateCollectionCategory(s, "pins", { layout: "list" }, 900), 900);
    expect(next.stamps?.["on:pins"]).toBe(500);
    expect(next.stamps?.["override:pins"]).toBe(900);
  });
});

describe("merging", () => {
  it("keeps both devices' changes to different categories", () => {
    const pal = change(base(), (s) => setCollectionCategoryEnabled(s, "plush", false, T + 10), T + 10);
    const planner = change(base(), (s) => updateCollectionCategory(s, "pins", { layout: "list" }, T + 20), T + 20);
    const merged = mergeCollectionSettings(planner, pal);
    expect(merged.enabled).toEqual(["pins"]);
    expect(merged.builtInOverrides?.pins).toEqual({ layout: "list" });
    expect(mergeCollectionSettings(pal, planner)).toEqual(merged);
  });

  it("takes the later change to the same category", () => {
    const earlier = change(base(), (s) => updateCollectionCategory(s, "pins", { layout: "list" }, T + 10), T + 10);
    const later = change(base(), (s) => updateCollectionCategory(s, "pins", { layout: "shelf" }, T + 20), T + 20);
    expect(mergeCollectionSettings(earlier, later).builtInOverrides?.pins).toEqual({ layout: "shelf" });
  });

  it("brings over a category and fields added on the other device", () => {
    const pal = change(base(), (s) => addUserCollectionCategory(s, { id: "user_mugs", name: "Mugs", layout: "shelf", trades: false }, T + 10), T + 10);
    const planner = change(base(), (s) => addCustomField(s, "pins", { id: "field_size", name: "Size", type: "text" }, T + 20), T + 20);
    const merged = mergeCollectionSettings(planner, pal);
    expect(merged.userCategories.map((c) => c.name)).toEqual(["Mugs"]);
    expect(merged.enabled).toContain("user_mugs");
    expect(merged.customFields?.pins?.map((f) => f.name)).toEqual(["Size"]);
  });

  it("carries a category's deletion, and doesn't leave it switched on", () => {
    const withMugs = change(base(), (s) => addUserCollectionCategory(s, { id: "user_mugs", name: "Mugs", layout: "shelf", trades: false }, T + 10), T + 10);
    const deleted = change(withMugs, (s) => deleteUserCollectionCategory(s, "user_mugs", T + 30), T + 30);
    const reordered = change(withMugs, (s) => ({ ...s, enabled: ["user_mugs", "pins", "plush"], updatedAt: T + 40 }), T + 40);
    const merged = mergeCollectionSettings(reordered, deleted);
    expect(merged.userCategories[0].deletedAt).toBe(T + 30);
    expect(merged.enabled).toEqual(["pins", "plush"]);
  });

  it("falls back to the newer copy as a whole for settings without stamps", () => {
    const older: CollectionSettings = { enabled: ["pins"], userCategories: [], firstRunDone: true, createdAt: 0, updatedAt: 100 };
    const newer: CollectionSettings = { enabled: ["plush"], userCategories: [], firstRunDone: true, createdAt: 0, updatedAt: 200 };
    expect(mergeCollectionSettings(older, newer).enabled).toEqual(["plush"]);
  });

  it("is the same whichever side merges, and compares by content", () => {
    const a = change(base(), (s) => setCollectionCategoryEnabled(s, "ears", true, T + 10), T + 10);
    const b = change(base(), (s) => setCollectionCategoryEnabled(s, "sippers", true, T + 10), T + 10);
    const ab = mergeCollectionSettings(a, b);
    expect(sameCollectionSettings(ab, mergeCollectionSettings(b, a))).toBe(true);
    expect(sameCollectionSettings(ab, a)).toBe(false);
    expect(ab.enabled).toEqual(expect.arrayContaining(["pins", "plush", "ears", "sippers"]));
  });
});
