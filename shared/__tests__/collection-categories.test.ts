// The choice-change helpers both apps use (the move/order rules are tested through
// Pal's names in utils/__tests__/collectionSettingsView.test.ts).
import {
  collectionChoiceChanges,
  collectionChoiceMoves,
  collectionFieldEditRule,
} from "../collection-categories";
import { addCustomField, emptyCollectionSettings, liveCustomFields, setCollectionCategoryEnabled } from "../collections";
import type { CollectionFieldDef, CollectionItem } from "../types/collection";

const T = 1_000;
const SIZE: CollectionFieldDef = { id: "field_size", name: "Size", type: "choice", choices: ["Small", "Medium", "Large"] };

function item(id: string, size?: string): CollectionItem {
  return { id, name: id, category: "plush", state: "have", details: size ? { field_size: size } : undefined, createdAt: T, updatedAt: T };
}

describe("changing a choice field's list", () => {
  const items = [item("a", "Small"), item("b", "Small"), item("c", "Large"), item("d")];

  it("carries items along a rename", () => {
    const changes = collectionChoiceChanges(items, SIZE, ["Little", "Medium", "Large"]);
    expect(changes).toEqual({ renamed: { from: "Small", to: "Little" }, inUse: {} });
    expect(collectionChoiceMoves(items, SIZE.id, changes, {}, T + 1).map((i) => [i.id, i.details?.field_size]))
      .toEqual([["a", "Little"], ["b", "Little"]]);
  });

  it("lists removed choices still in use, and moves or clears them as decided", () => {
    const changes = collectionChoiceChanges(items, SIZE, ["Medium"]);
    expect(changes).toEqual({ inUse: { Small: 2, Large: 1 } });
    const moved = collectionChoiceMoves(items, SIZE.id, changes, { Small: "Medium" }, T + 1);
    expect(moved.map((i) => [i.id, i.details?.field_size])).toEqual([["a", "Medium"], ["b", "Medium"], ["c", undefined]]);
  });

  it("finds nothing to move when no removed choice is used", () => {
    expect(collectionChoiceChanges(items, SIZE, ["Small", "Large"])).toEqual({ inUse: {} });
  });
});

describe("saving an edited field", () => {
  it("changes text to a choice list from the values items hold, then renames", () => {
    let s = setCollectionCategoryEnabled(emptyCollectionSettings(T), "plush", true, T);
    s = addCustomField(s, "plush", { id: "field_city", name: "City", type: "text" }, T);
    const items = [{ ...item("a"), details: { field_city: "Paris" } }, { ...item("b"), details: { field_city: "Tokyo" } }];
    const field = liveCustomFields(s, "plush")[0];
    const next: CollectionFieldDef = { ...field, name: "Town", type: "choice", choices: ["Paris", "Tokyo"] };
    const out = collectionFieldEditRule("plush", field, next, items, T + 1)(s);
    expect(liveCustomFields(out, "plush")[0]).toEqual({ id: "field_city", name: "Town", type: "choice", choices: ["Paris", "Tokyo"] });
  });
});
