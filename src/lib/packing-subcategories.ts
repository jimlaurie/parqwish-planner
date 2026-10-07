// ==================== PACKING SUB-CATEGORIES ====================
// The second filter level on Prepare and the Catalog: each packing type's
// sub-categories (Outfits → Day Wear, Shoes…). Pure helpers — the pages
// hold the selection state.

import { PACKING_CATEGORIES } from "@/lib/constants";
import type { PackingType } from "@/lib/db";

/** Selected sub-categories per type; a missing or empty list means "all". */
export type SubcategoryFilter = Partial<Record<PackingType, string[]>>;

/**
 * Sub-categories worth offering for one type: the standard list, in its
 * usual order, followed by any custom ones found on items — but only those
 * at least one item actually uses, so the chips never lead to an empty list.
 */
export function subcategoriesFor(type: PackingType, items: { type: PackingType; category: string }[]): string[] {
  const used = new Set(items.filter((i) => i.type === type && i.category).map((i) => i.category));
  const standard = (PACKING_CATEGORIES[type] ?? []).filter((c) => used.has(c));
  const custom = [...used].filter((c) => !standard.includes(c)).sort((a, b) => a.localeCompare(b));
  return [...standard, ...custom];
}

/**
 * Every sub-category for one type: the full standard list, in its usual
 * order, followed by any custom ones found on items. Used by the Catalog,
 * where the chips double as a guide to the shared list; Prepare's sidebar
 * uses `subcategoriesFor` instead to stay short.
 */
export function allSubcategoriesFor(type: PackingType, items: { type: PackingType; category: string }[]): string[] {
  const standard = PACKING_CATEGORIES[type] ?? [];
  const custom = [...new Set(items.filter((i) => i.type === type && i.category).map((i) => i.category))]
    .filter((c) => !standard.includes(c))
    .sort((a, b) => a.localeCompare(b));
  return [...standard, ...custom];
}

/** How many items use each sub-category. */
export function countSubcategories(items: { category: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}

export function matchesSubcategory(item: { type: PackingType; category: string }, filter: SubcategoryFilter): boolean {
  const chosen = filter[item.type];
  return !chosen || chosen.length === 0 || chosen.includes(item.category);
}

/** Toggle one sub-category for a type, collapsing back to "all" when empty. */
export function toggleSubcategory(filter: SubcategoryFilter, type: PackingType, category: string): SubcategoryFilter {
  const current = filter[type] ?? [];
  const next = current.includes(category) ? current.filter((c) => c !== category) : [...current, category];
  return { ...filter, [type]: next.length ? next : undefined };
}

/** Thumbnail for a packing/catalog item, if it has a photo. */
export function packingThumbnail(item: { photoSets?: { thumbnail?: string }[]; photos?: string[] }): string | undefined {
  return item.photoSets?.[0]?.thumbnail ?? item.photos?.[0];
}
