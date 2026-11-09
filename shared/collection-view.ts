// ==================== COLLECTION VIEW (pure) ====================
// What a Collection view shows, in Pal (the Shop tab's Collection view) and
// the Planner (the Collection page): which category and state tab are
// picked, which tabs a category has, the items in a tab and their order,
// the short text under each tile, the chips' counts, and Uncategorised for
// items whose category this device doesn't know. docs/collections-design.md
// §7. No I/O; each app draws it (and picks its own grid columns).

import { enabledCollectionCategories, resolveCollectionCategory, type ResolvedCollectionCategory } from "./collections";
import { UNCATEGORISED_COLLECTION, countsTowardCollectionLimit } from "./constants/collections";
import type { CollectionFieldDef, CollectionItem, CollectionSettings, CollectionState } from "./types/collection";

/** Tab order. Trade shows only where it applies, Gone only when there's history. */
export const COLLECTION_TABS: readonly CollectionState[] = ["have", "want", "trade", "gone"];

export const COLLECTION_TAB_LABELS: Record<CollectionState, string> = {
  have: "Have", want: "Want", trade: "Trade", gone: "Gone",
};

const PRIORITY_RANK: Record<string, number> = { E: 0, D: 1, C: 2, B: 3, A: 4 };

export type CollectionStateCounts = Record<CollectionState, number>;

// ==================== PICKING ====================

export function collectionStateCounts(items: CollectionItem[], categoryId: string): CollectionStateCounts {
  const counts: CollectionStateCounts = { have: 0, want: 0, trade: 0, gone: 0 };
  for (const i of items) if (i.category === categoryId) counts[i.state] += 1;
  return counts;
}

/** A category's tabs: Have and Want always; Trade if it trades or holds traders; Gone if it has history. */
export function collectionTabs(trades: boolean, counts: CollectionStateCounts): CollectionState[] {
  return COLLECTION_TABS.filter((s) =>
    s === "have" || s === "want" || (s === "trade" && (trades || counts.trade > 0)) || (s === "gone" && counts.gone > 0));
}

/** The category to show: the previous one while it's still on, else the first. */
export function pickCollectionCategory(categoryIds: string[], previous: string | undefined): string | undefined {
  return previous && categoryIds.includes(previous) ? previous : categoryIds[0];
}

/** The tab to show: the previous one while the category has it, else Have. */
export function pickCollectionTab(tabs: CollectionState[], previous: CollectionState | undefined): CollectionState {
  return previous && tabs.includes(previous) ? previous : "have";
}

// ==================== ORDER ====================

function byName(a: CollectionItem, b: CollectionItem): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/** Newest first: by the date it arrived (or left), then when it was added. */
function byNewest(date: (i: CollectionItem) => string | undefined) {
  return (a: CollectionItem, b: CollectionItem) =>
    (date(b) ?? "").localeCompare(date(a) ?? "") || b.createdAt - a.createdAt || byName(a, b);
}

/**
 * A tab's items in display order: wants by ticket (E-ticket grails first,
 * no ticket last) then name; gone by when they left; the rest newest first.
 */
export function visibleCollectionItems(items: CollectionItem[], categoryId: string, state: CollectionState): CollectionItem[] {
  const shown = items.filter((i) => i.category === categoryId && i.state === state);
  if (state === "want") {
    const rank = (i: CollectionItem) => PRIORITY_RANK[i.priority ?? ""] ?? 5;
    return shown.sort((a, b) => rank(a) - rank(b) || byName(a, b));
  }
  if (state === "gone") return shown.sort(byNewest((i) => i.gone?.date));
  return shown.sort(byNewest((i) => i.acquired?.date));
}

// ==================== TEXT ====================

/** A value as a tile shows it: a yes field by its name ("Limited release"), a number with its unit; no and blank give nothing. */
function fieldText(def: CollectionFieldDef, value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (def.type === "boolean") return value === true ? def.name : "";
  if (def.type === "number" && typeof value === "number") return def.unit ? `${value} ${def.unit}` : String(value);
  return String(value);
}

/** The line under a tile: the first `max` filled-in fields, in the category's form order. */
export function collectionItemSummary(item: CollectionItem, fields: CollectionFieldDef[], max = 2): string {
  const parts: string[] = [];
  for (const def of fields) {
    const text = fieldText(def, item.details?.[def.id]);
    if (text) parts.push(text);
    if (parts.length >= max) break;
  }
  return parts.join(" · ");
}

/** "Nov 9, 2026" from "2026-11-09"; "" if it isn't a date. Read as a calendar date, so no time zone can move it. */
export function formatCollectionDate(ymd: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd ?? "");
  if (!m) return "";
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (date.getUTCDate() !== Number(m[3])) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** The date a list row shows: when it left for gone items, else when it arrived. */
export function collectionItemDate(item: CollectionItem): string {
  return formatCollectionDate(item.state === "gone" ? item.gone?.date : item.acquired?.date);
}

/** What an empty tab says. */
export function emptyCollectionTabText(state: CollectionState, categoryName: string): string {
  switch (state) {
    case "have": return `No ${categoryName.toLowerCase()} in your collection yet.`;
    case "want": return "Nothing on your want list yet.";
    case "trade": return "Nothing up for trade yet.";
    default: return "Nothing traded, sold or given away yet.";
  }
}

// ==================== COUNTS ====================

/** Items per category that count (have, want, trade): the category chips' numbers. */
export function countCollectionItemsByCategory(items: CollectionItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const i of items) {
    if (countsTowardCollectionLimit(i.state)) counts[i.category] = (counts[i.category] ?? 0) + 1;
  }
  return counts;
}

// ==================== UNCATEGORISED ====================

/** An item"s category as the view groups it: one this phone doesn"t know (deleted, or not synced yet) shows under Uncategorised. */
export function viewCategoryOf(settings: CollectionSettings, item: CollectionItem): string {
  return resolveCollectionCategory(settings, item.category) ? item.category : UNCATEGORISED_COLLECTION.id;
}

/**
 * The categories the Collection view shows: those switched on, then
 * Uncategorised while it holds items, so nothing goes missing. A built-in
 * category that's only switched off stays hidden, as the user chose.
 */
export function viewCategories(settings: CollectionSettings, items: CollectionItem[]): ResolvedCollectionCategory[] {
  const on = enabledCollectionCategories(settings);
  const stray = items.some((i) => viewCategoryOf(settings, i) === UNCATEGORISED_COLLECTION.id);
  return stray ? [...on, resolveCollectionCategory(settings, UNCATEGORISED_COLLECTION.id)!] : on;
}

/** Items as the view groups them (strays under Uncategorised). For display only: never save these. */
export function itemsForView(settings: CollectionSettings, items: CollectionItem[]): CollectionItem[] {
  return items.map((i) => {
    const category = viewCategoryOf(settings, i);
    return category === i.category ? i : { ...i, category };
  });
}
