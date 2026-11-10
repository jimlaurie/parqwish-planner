// ==================== COLLECTION TABLE (pure) ====================
// Sorting and filtering a category's items by their fields
// (docs/collections-design.md §3b): the Planner's list view sorts by any
// column and filters choice and yes/no fields by value and numbers by a
// range; Pal's "sort by one field" uses the same sort. No I/O.

import type { CollectionFieldDef, CollectionFieldValue, CollectionItem } from "./types/collection";

/** A column to sort by: "name", "date" (when it arrived, or went for a Gone item) or a field id. */
export interface CollectionSort {
  key: string;
  dir: "asc" | "desc";
}

/** A filter on one field. A choice of "" means "left blank". */
export type CollectionFieldFilter =
  | { type: "choice"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "number"; min?: number; max?: number };

// ==================== CELLS ====================

/** A field's value as a table cell shows it: "Yes" for yes, a number with its unit, "" for blank. */
export function collectionCellText(def: CollectionFieldDef, value: CollectionFieldValue | undefined): string {
  if (value === undefined || value === "") return "";
  if (def.type === "boolean") return value === true ? "Yes" : "";
  if (def.type === "number" && typeof value === "number") return def.unit ? `${value} ${def.unit}` : String(value);
  return String(value);
}

// ==================== SORT ====================

/** The value a column sorts on, or undefined when it's blank (blanks always go last). */
function sortValue(item: CollectionItem, key: string, fields: CollectionFieldDef[]): string | number | undefined {
  if (key === "name") return item.name.trim() || undefined;
  if (key === "date") return (item.state === "gone" ? item.gone?.date : item.acquired?.date) || undefined;
  const def = fields.find((f) => f.id === key);
  const value = item.details?.[key];
  if (!def || value === undefined || value === "") return undefined;
  if (def.type === "boolean") return value === true ? 1 : undefined;
  if (def.type === "number") return typeof value === "number" ? value : undefined;
  if (def.type === "choice") {
    const at = (def.choices ?? []).indexOf(String(value));
    return at >= 0 ? at : String(value);
  }
  return String(value);
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

/**
 * The items sorted by a column: numbers by value, choices in their list's
 * order, text and dates alphabetically; blanks last in either direction;
 * ties keep the order they came in. Doesn't change the list it's given.
 */
export function sortCollectionItems(items: CollectionItem[], sort: CollectionSort, fields: CollectionFieldDef[]): CollectionItem[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return items
    .map((item, i) => ({ item, i, v: sortValue(item, sort.key, fields) }))
    .sort((a, b) => {
      if (a.v === undefined || b.v === undefined) return a.v === b.v ? a.i - b.i : a.v === undefined ? 1 : -1;
      return sign * compareValues(a.v, b.v) || a.i - b.i;
    })
    .map(({ item }) => item);
}

/** The next sort after clicking a column: ascending first, then descending, then back to the view's own order (null). */
export function nextCollectionSort(current: CollectionSort | null, key: string): CollectionSort | null {
  if (!current || current.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : null;
}

// ==================== FILTER ====================

function matchesFilter(item: CollectionItem, fieldId: string, filter: CollectionFieldFilter): boolean {
  const value = item.details?.[fieldId];
  if (filter.type === "boolean") return (value === true) === filter.value;
  if (filter.type === "choice") return filter.value === "" ? value === undefined || value === "" : value === filter.value;
  if (typeof value !== "number") return filter.min === undefined && filter.max === undefined;
  return (filter.min === undefined || value >= filter.min) && (filter.max === undefined || value <= filter.max);
}

/** The items every filter matches, whose name (or tags) contain `query` too. A number range with neither end set matches everything. */
export function filterCollectionItems(
  items: CollectionItem[], filters: Record<string, CollectionFieldFilter>, query = "",
): CollectionItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (q && !item.name.toLowerCase().includes(q) && !(item.tags ?? []).some((t) => t.toLowerCase().includes(q))) return false;
    return Object.entries(filters).every(([fieldId, filter]) => matchesFilter(item, fieldId, filter));
  });
}

/** How many filters are set (a number range counts once it has an end): the "Clear filters" badge. */
export function activeCollectionFilters(filters: Record<string, CollectionFieldFilter>): number {
  return Object.values(filters).filter((f) => f.type !== "number" || f.min !== undefined || f.max !== undefined).length;
}
