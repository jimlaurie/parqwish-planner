// The editor rules as the Planner uses them: photo sets passed in, not file paths.
// (Pal's wrapper, utils/collectionEditor.ts, has its own tests.)
import {
  collectionDraftFromItem,
  collectionDraftProblem,
  collectionItemFromDraft,
} from "../collection-editor";
import type { CollectionFieldDef, CollectionItem } from "../types/collection";

const T = 1_700_000_000_000;
const FIELDS: CollectionFieldDef[] = [{ id: "year", name: "Year", type: "number" }];
const SET = { thumbnail: "data:image/jpeg;base64,t", display: "data:image/jpeg;base64,d", full: "data:image/jpeg;base64,f" };

describe("collection editor rules with photo sets", () => {
  it("accepts a photo with no name, and refuses neither", () => {
    const draft = { ...collectionDraftFromItem(undefined, "pins", "have"), name: "" };
    expect(collectionDraftProblem(draft, FIELDS, true)).toBeNull();
    expect(collectionDraftProblem(draft, FIELDS, false)).toMatch(/name or a photo/);
  });

  it("saves the photo sets it's given, and none for an empty list", () => {
    const draft = { ...collectionDraftFromItem(undefined, "pins", "have"), name: "Figment", details: { year: "2024" } };
    const item = collectionItemFromDraft(draft, FIELDS, [SET], undefined, "col_1", "user_primary", T);
    expect(item).toMatchObject({ id: "col_1", name: "Figment", photoSets: [SET], details: { year: 2024 }, userId: "user_primary" });
    expect(collectionItemFromDraft(draft, FIELDS, [], undefined, "col_2", undefined, T).photoSets).toBeUndefined();
  });

  it("keeps the rest of an edited item, replacing its photos with the ones given", () => {
    const base: CollectionItem = { id: "col_9", name: "Old", category: "pins", state: "have", createdAt: T, updatedAt: T,
      photoSets: [SET], sourceShoppingItemId: "shop_1", acquired: { tripId: "trip_1" } };
    const draft = { ...collectionDraftFromItem(base, "pins", "have"), name: "New" };
    const out = collectionItemFromDraft(draft, FIELDS, undefined, base, "ignored", "user_x", T + 1);
    expect(out).toMatchObject({ id: "col_9", name: "New", sourceShoppingItemId: "shop_1", acquired: { tripId: "trip_1" }, updatedAt: T + 1 });
    expect(out.photoSets).toBeUndefined();
  });

  it("saves a Want's shops to look in, keeping a park and land the form doesn't edit", () => {
    const base: CollectionItem = { id: "col_5", name: "Figment", category: "pins", state: "want", createdAt: T, updatedAt: T,
      lookIn: { shopIds: ["emporium"], park: "disneyland", land: "Main Street, U.S.A." } };
    const draft = collectionDraftFromItem(base, "pins", "want");
    expect(draft.lookInShops).toEqual(["emporium"]);
    const out = collectionItemFromDraft({ ...draft, lookInShops: ["emporium", "star-trader", "emporium", ""] }, FIELDS, undefined, base, "x", undefined, T);
    expect(out.lookIn).toEqual({ shopIds: ["emporium", "star-trader"], park: "disneyland", land: "Main Street, U.S.A." });
    expect(collectionItemFromDraft({ ...draft, lookInShops: [] }, FIELDS, undefined, base, "x", undefined, T).lookIn)
      .toEqual({ park: "disneyland", land: "Main Street, U.S.A." });
    const plain = collectionItemFromDraft({ ...collectionDraftFromItem(undefined, "pins", "want"), name: "A" }, FIELDS, undefined, undefined, "c", undefined, T);
    expect("lookIn" in plain).toBe(false);
  });
});
