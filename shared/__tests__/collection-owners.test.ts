// Whose a collection item is: the person filter, the editor's owner choices,
// a removed Trip User's items, and owners in an imported file.
import {
  COLLECTION_EVERYONE, COLLECTION_SHARED_OWNER, collectionOwnerChips, collectionOwnerChoices, collectionOwnerOf,
  filterCollectionByOwner, importedCollectionOwner, orderCollectionTripUsers, pickCollectionOwnerFilter, reassignCollectionOwner,
} from "../collection-owners";
import { collectionDraftFromItem, collectionItemFromDraft } from "../collection-editor";
import type { CollectionItem } from "../types/collection";

const T = 1_700_000_000_000;
const item = (id: string, userId?: string): CollectionItem =>
  ({ id, name: id, category: "pins", state: "have", createdAt: T, updatedAt: T, ...(userId ? { userId } : {}) });
const MOM = { id: "user_primary", name: "Mom", color: "#FFD700" };
const KID = { id: "user_guest_1", name: "Sam", color: "#87CEEB" };
const ITEMS = [item("a", "user_primary"), item("b", "user_guest_1"), item("c", "user_guest_1"), item("d", "shared"), item("e")];

describe("owners", () => {
  it("an item without one is the primary user's", () => {
    expect(collectionOwnerOf(item("x"))).toBe("user_primary");
    expect(collectionOwnerOf(item("x", "shared"))).toBe(COLLECTION_SHARED_OWNER);
  });
});

describe("Trip Users' order", () => {
  it("is the primary user, then guests by number", () => {
    const ids = ["user_guest_10", "user_guest_2", "user_primary", "user_guest_1"].map((id) => ({ id }));
    expect(orderCollectionTripUsers(ids).map((u) => u.id)).toEqual(["user_primary", "user_guest_1", "user_guest_2", "user_guest_10"]);
  });
});

describe("the person filter", () => {
  it("Everyone shows everything; a person their own and the shared ones; Shared only the shared ones", () => {
    const ids = (f: string) => filterCollectionByOwner(ITEMS, f).map((i) => i.id);
    expect(ids(COLLECTION_EVERYONE)).toEqual(["a", "b", "c", "d", "e"]);
    expect(ids("user_primary")).toEqual(["a", "d", "e"]);
    expect(ids("user_guest_1")).toEqual(["b", "c", "d"]);
    expect(ids(COLLECTION_SHARED_OWNER)).toEqual(["d"]);
  });

  it("has a chip per owning Trip User in their order, then Shared, with what each shows", () => {
    expect(collectionOwnerChips(ITEMS, [MOM, KID])).toEqual([
      { id: COLLECTION_EVERYONE, label: "Everyone", count: 5 },
      { id: "user_primary", label: "Mom", color: "#FFD700", count: 3 },
      { id: "user_guest_1", label: "Sam", color: "#87CEEB", count: 3 },
      { id: COLLECTION_SHARED_OWNER, label: "Shared", count: 1 },
    ]);
  });

  it("isn't shown for one owner, or for Trip Users who own nothing", () => {
    expect(collectionOwnerChips([item("a"), item("b", "user_primary")], [MOM, KID])).toEqual([]);
    expect(collectionOwnerChips([], [MOM, KID])).toEqual([]);
    expect(collectionOwnerChips([item("a"), item("d", "shared")], [MOM, KID]).map((c) => c.id))
      .toEqual([COLLECTION_EVERYONE, "user_primary", COLLECTION_SHARED_OWNER]);
  });

  it("counts only the category on screen, but keeps every owner's chip", () => {
    // Mom: a pin and a plush; Sam: a plush only; one shared pin
    const mixed = [
      item("a", "user_primary"), { ...item("p", "user_primary"), category: "plush" },
      { ...item("q", "user_guest_1"), category: "plush" }, item("d", "shared"),
    ];
    expect(collectionOwnerChips(mixed, [MOM, KID], "pins")).toEqual([
      { id: COLLECTION_EVERYONE, label: "Everyone", count: 2 },
      { id: "user_primary", label: "Mom", color: "#FFD700", count: 2 },
      { id: "user_guest_1", label: "Sam", color: "#87CEEB", count: 1 },
      { id: COLLECTION_SHARED_OWNER, label: "Shared", count: 1 },
    ]);
    expect(collectionOwnerChips(mixed, [MOM, KID], "plush").map((c) => c.count)).toEqual([2, 1, 1, 0]);
    // The whole account decides whether there's a filter at all
    expect(collectionOwnerChips(mixed, [MOM, KID], "ears").map((c) => c.count)).toEqual([0, 0, 0, 0]);
  });

  it("keeps the chosen filter while it's a chip, else goes back to Everyone", () => {
    const chips = collectionOwnerChips(ITEMS, [MOM, KID]);
    expect(pickCollectionOwnerFilter(chips, "user_guest_1")).toBe("user_guest_1");
    expect(pickCollectionOwnerFilter(chips, "user_guest_5")).toBe(COLLECTION_EVERYONE);
    expect(pickCollectionOwnerFilter([], "user_guest_1")).toBe(COLLECTION_EVERYONE);
    expect(pickCollectionOwnerFilter(chips, undefined)).toBe(COLLECTION_EVERYONE);
  });
});

describe("the editor's owner", () => {
  it("offers each Trip User and Shared, and nothing for one Trip User", () => {
    expect(collectionOwnerChoices([MOM, KID]).map((c) => c.value)).toEqual(["user_primary", "user_guest_1", "shared"]);
    expect(collectionOwnerChoices([MOM])).toEqual([]);
  });

  it("a new item takes the owner given, an edited one keeps its own, and a change saves", () => {
    expect(collectionDraftFromItem(undefined, "pins", "have", "user_guest_1").owner).toBe("user_guest_1");
    expect(collectionDraftFromItem(item("b", "user_guest_1"), "pins", "have", "user_primary").owner).toBe("user_guest_1");
    const draft = { ...collectionDraftFromItem(item("b", "user_guest_1"), "pins", "have"), owner: "shared" };
    expect(collectionItemFromDraft(draft, [], undefined, item("b", "user_guest_1"), "x", "user_primary", T + 1).userId).toBe("shared");
  });

  it("without an owner in the draft, a new item takes the creator (as before)", () => {
    const draft = { ...collectionDraftFromItem(undefined, "pins", "have"), name: "New" };
    expect(collectionItemFromDraft(draft, [], undefined, undefined, "n", "user_guest_1", T).userId).toBe("user_guest_1");
  });
});

describe("removing a Trip User", () => {
  it("hands their items to the primary user, stamped now; nothing else changes", () => {
    const moved = reassignCollectionOwner(ITEMS, "user_guest_1", T + 5);
    expect(moved.map((i) => [i.id, i.userId, i.updatedAt])).toEqual([["b", "user_primary", T + 5], ["c", "user_primary", T + 5]]);
    expect(reassignCollectionOwner(ITEMS, "user_primary", T + 5)).toEqual([]);
    expect(reassignCollectionOwner(ITEMS, "shared", T + 5)).toEqual([]);
  });
});

describe("an imported file's owners", () => {
  it("keep this account's Trip Users and Shared; anyone else's become Shared", () => {
    const here = ["user_primary", "user_guest_1"];
    expect(importedCollectionOwner("user_guest_1", here)).toBe("user_guest_1");
    expect(importedCollectionOwner("shared", here)).toBe("shared");
    expect(importedCollectionOwner(undefined, here)).toBe("user_primary");
    expect(importedCollectionOwner("user_guest_4", here)).toBe("shared");
  });
});
