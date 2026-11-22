import { showcaseCaption, showcaseHtml, showcaseItems } from "../collection-showcase";
import type { CollectionFieldDef, CollectionItem } from "../types/collection";

const T = 1_700_000_000_000;
const FIELDS: CollectionFieldDef[] = [{ id: "year", name: "Year", type: "number" }];
const PHOTO = [{ thumbnail: "t", display: "d", full: "f" }];
const item = (id: string, extra: Partial<CollectionItem> = {}): CollectionItem =>
  ({ id, name: id, category: "pins", state: "have", createdAt: T, updatedAt: T, ...extra });

describe("showcaseItems", () => {
  it("shows a category's Haves, photos first, newest first", () => {
    const list = showcaseItems([
      item("old", { photoSets: PHOTO, acquired: { date: "2025-01-01" } }),
      item("new", { photoSets: PHOTO, acquired: { date: "2026-10-14" } }),
      item("added later", { photoSets: PHOTO, createdAt: T + 5 }),
      item("no photo", { acquired: { date: "2026-12-01" } }),
      item("wanted", { state: "want", photoSets: PHOTO }),
      item("trader", { state: "trade", photoSets: PHOTO }),
      item("plush", { category: "plush", photoSets: PHOTO }),
    ], "pins");
    expect(list.map((i) => i.id)).toEqual(["new", "old", "added later", "no photo"]);
  });
});

describe("showcaseCaption", () => {
  it("gives the details, else a count above one", () => {
    expect(showcaseCaption(item("a", { details: { year: 2024 } }), FIELDS)).toBe("2024");
    expect(showcaseCaption(item("b", { quantity: 3 }), FIELDS)).toBe("×3");
    expect(showcaseCaption(item("c"), FIELDS)).toBe("");
  });
});

describe("showcaseHtml", () => {
  it("titles the wall by owner and category, with each photo or the icon", () => {
    const html = showcaseHtml({
      categoryName: "Pins", categoryIcon: "📌", fields: FIELDS, owner: "Mary",
      items: [item("Figment", { photoSets: PHOTO }), item("Stitch & Co")],
      photoFor: (i) => (i.photoSets ? "data:image/jpeg;base64,AAA" : undefined),
    });
    expect(html).toContain("📌 Mary&#39;s Pins");
    expect(html).toContain("2 items");
    expect(html).toContain('<img src="data:image/jpeg;base64,AAA"');
    expect(html).toContain("Stitch &amp; Co");
    expect(html).toContain('<div class="noPhoto">📌</div>');
  });

  it("says when the category is empty", () => {
    expect(showcaseHtml({ categoryName: "Pins", fields: [], items: [], photoFor: () => undefined })).toContain("My Pins");
    expect(showcaseHtml({ categoryName: "Pins", fields: [], items: [], photoFor: () => undefined })).toContain("Nothing in this category yet.");
  });
});
