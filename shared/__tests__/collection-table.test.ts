import {
  activeCollectionFilters,
  collectionCellText,
  filterCollectionItems,
  nextCollectionSort,
  sortCollectionItems,
} from "../collection-table";
import type { CollectionFieldDef, CollectionItem } from "../types/collection";

const T = 1_000;
const FIELDS: CollectionFieldDef[] = [
  { id: "edition", name: "Edition", type: "choice", choices: ["Open Edition", "Limited Edition", "Limited Release"] },
  { id: "size", name: "Edition size", type: "number" },
  { id: "limited", name: "Limited", type: "boolean" },
  { id: "series", name: "Series", type: "text" },
];

function item(id: string, extra: Partial<CollectionItem> = {}): CollectionItem {
  return { id, name: id, category: "pins", state: "have", createdAt: T, updatedAt: T, ...extra };
}

const ITEMS = [
  item("Figment", { details: { edition: "Limited Edition", size: 2500, series: "Epcot 40" }, acquired: { date: "2026-10-12" }, tags: ["epcot"] }),
  item("Dumbo", { details: { edition: "Open Edition", limited: true } }),
  item("castle", { details: { edition: "Limited Release", size: 300, series: "70th" }, acquired: { date: "2025-05-01" } }),
  item("Hatbox", { details: { size: 1000 } }),
];

describe("collection table cells", () => {
  it("shows yes, numbers with their unit and blanks", () => {
    expect(collectionCellText(FIELDS[2], true)).toBe("Yes");
    expect(collectionCellText(FIELDS[2], false)).toBe("");
    expect(collectionCellText({ id: "h", name: "Height", type: "number", unit: "cm" }, 30)).toBe("30 cm");
    expect(collectionCellText(FIELDS[0], undefined)).toBe("");
  });
});

describe("sorting by a column", () => {
  const names = (items: CollectionItem[]) => items.map((i) => i.name);

  it("sorts names ignoring case, either way", () => {
    expect(names(sortCollectionItems(ITEMS, { key: "name", dir: "asc" }, FIELDS))).toEqual(["castle", "Dumbo", "Figment", "Hatbox"]);
    expect(names(sortCollectionItems(ITEMS, { key: "name", dir: "desc" }, FIELDS))).toEqual(["Hatbox", "Figment", "Dumbo", "castle"]);
  });

  it("sorts numbers by value and puts blanks last in both directions", () => {
    expect(names(sortCollectionItems(ITEMS, { key: "size", dir: "asc" }, FIELDS))).toEqual(["castle", "Hatbox", "Figment", "Dumbo"]);
    expect(names(sortCollectionItems(ITEMS, { key: "size", dir: "desc" }, FIELDS))).toEqual(["Figment", "Hatbox", "castle", "Dumbo"]);
  });

  it("sorts choices in their list's order, and dates", () => {
    expect(names(sortCollectionItems(ITEMS, { key: "edition", dir: "asc" }, FIELDS))).toEqual(["Dumbo", "Figment", "castle", "Hatbox"]);
    expect(names(sortCollectionItems(ITEMS, { key: "date", dir: "desc" }, FIELDS))).toEqual(["Figment", "castle", "Dumbo", "Hatbox"]);
  });

  it("sorts a Gone item by the date it went", () => {
    const gone = item("Traded", { state: "gone", acquired: { date: "2020-01-01" }, gone: { date: "2026-11-01", how: "traded" } } as Partial<CollectionItem>);
    expect(names(sortCollectionItems([...ITEMS, gone], { key: "date", dir: "desc" }, FIELDS)).slice(0, 2)).toEqual(["Traded", "Figment"]);
  });

  it("keeps the order it came in for ties and doesn't change the list", () => {
    const before = names(ITEMS);
    expect(names(sortCollectionItems(ITEMS, { key: "limited", dir: "asc" }, FIELDS))).toEqual(["Dumbo", "Figment", "castle", "Hatbox"]);
    expect(names(ITEMS)).toEqual(before);
  });

  it("goes ascending, descending, then back to the view's order", () => {
    expect(nextCollectionSort(null, "size")).toEqual({ key: "size", dir: "asc" });
    expect(nextCollectionSort({ key: "size", dir: "asc" }, "size")).toEqual({ key: "size", dir: "desc" });
    expect(nextCollectionSort({ key: "size", dir: "desc" }, "size")).toBeNull();
    expect(nextCollectionSort({ key: "size", dir: "desc" }, "name")).toEqual({ key: "name", dir: "asc" });
  });
});

describe("filtering", () => {
  const names = (items: CollectionItem[]) => items.map((i) => i.name);

  it("filters a choice by value or blank, and yes/no", () => {
    expect(names(filterCollectionItems(ITEMS, { edition: { type: "choice", value: "Limited Edition" } }))).toEqual(["Figment"]);
    expect(names(filterCollectionItems(ITEMS, { edition: { type: "choice", value: "" } }))).toEqual(["Hatbox"]);
    expect(names(filterCollectionItems(ITEMS, { limited: { type: "boolean", value: true } }))).toEqual(["Dumbo"]);
    expect(names(filterCollectionItems(ITEMS, { limited: { type: "boolean", value: false } }))).toEqual(["Figment", "castle", "Hatbox"]);
  });

  it("filters numbers by a range, leaving out blanks once an end is set", () => {
    expect(names(filterCollectionItems(ITEMS, { size: { type: "number", min: 500 } }))).toEqual(["Figment", "Hatbox"]);
    expect(names(filterCollectionItems(ITEMS, { size: { type: "number", min: 300, max: 1000 } }))).toEqual(["castle", "Hatbox"]);
    expect(filterCollectionItems(ITEMS, { size: { type: "number" } })).toHaveLength(4);
  });

  it("searches names and tags, and combines with filters", () => {
    expect(names(filterCollectionItems(ITEMS, {}, "fig"))).toEqual(["Figment"]);
    expect(names(filterCollectionItems(ITEMS, {}, "EPCOT"))).toEqual(["Figment"]);
    expect(names(filterCollectionItems(ITEMS, { size: { type: "number", min: 100 } }, "a"))).toEqual(["castle", "Hatbox"]);
  });

  it("counts the filters that are set", () => {
    expect(activeCollectionFilters({ a: { type: "number" }, b: { type: "number", max: 3 }, c: { type: "choice", value: "" } })).toBe(2);
  });
});
