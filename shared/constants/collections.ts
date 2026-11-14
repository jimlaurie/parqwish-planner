// ==================== COLLECTION CONSTANTS ====================
// The built-in collection categories (design docs/collections-design.md §2,
// §3a) and their detail fields. Built-ins can be switched on or off and
// reordered, never renamed or deleted; their fields can be hidden, not
// edited, so a field id means the same thing for every account. Fields
// shared by several categories (series, year, event) keep one id, so an
// item moved between them keeps its values. The user's own fields go in
// CollectionSettings (shared/types/collection.ts).

import type { CollectionFieldDef, CollectionLayout, CollectionState } from "../types/collection";

export interface BuiltInCollectionCategory {
  /** Stable: stored on items and in settings. */
  id: string;
  name: string;
  icon: string;
  layout: CollectionLayout;
  /** "I trade these" until the user changes it. */
  trades: boolean;
  /** Category-specific detail fields, in their default form order. */
  fields: readonly CollectionFieldDef[];
}

// ==================== BUILT-IN FIELDS ====================

const SERIES: CollectionFieldDef = { id: "series", name: "Series or set", type: "text" };
const YEAR: CollectionFieldDef = { id: "year", name: "Year", type: "number" };
const EVENT: CollectionFieldDef = { id: "event", name: "Event or season", type: "text" };
const EXCLUSIVE: CollectionFieldDef = { id: "exclusive", name: "Exclusive to", type: "text" };
const LIMITED: CollectionFieldDef = { id: "limited", name: "Limited release", type: "boolean" };
const CHARACTER: CollectionFieldDef = { id: "character", name: "Character", type: "text" };
const DESIGN: CollectionFieldDef = { id: "design", name: "Design", type: "text" };

const PIN_EDITION: CollectionFieldDef = {
  id: "edition",
  name: "Edition",
  type: "choice",
  choices: ["Open Edition", "Limited Edition", "Limited Release"],
};
const EDITION_SIZE: CollectionFieldDef = { id: "editionSize", name: "Edition size", type: "number" };

// ==================== CATEGORIES ====================

export const BUILT_IN_COLLECTION_CATEGORIES: readonly BuiltInCollectionCategory[] = [
  { id: "pins", name: "Pins", icon: "📌", layout: "board", trades: true,
    fields: [PIN_EDITION, EDITION_SIZE, SERIES, YEAR, EVENT, EXCLUSIVE] },
  { id: "popcorn-buckets", name: "Popcorn Buckets", icon: "🍿", layout: "shelf", trades: false,
    fields: [EVENT, YEAR, LIMITED, EXCLUSIVE] },
  { id: "sippers", name: "Sippers & Cups", icon: "🥤", layout: "shelf", trades: false,
    fields: [EVENT, YEAR, LIMITED, { id: "lightsUp", name: "Light-up works", type: "boolean" }] },
  { id: "ears", name: "Ears & Headwear", icon: "🎀", layout: "shelf", trades: false,
    fields: [SERIES, YEAR, EVENT] },
  { id: "loungefly", name: "Bags", icon: "👜", layout: "shelf", trades: false,
    fields: [SERIES, EXCLUSIVE, YEAR] },
  { id: "plush", name: "Plush", icon: "🧸", layout: "shelf", trades: false,
    fields: [CHARACTER, SERIES, YEAR] },
  { id: "apparel", name: "Apparel", icon: "👕", layout: "shelf", trades: false,
    fields: [DESIGN, YEAR, EVENT] },
  { id: "magicbands", name: "MagicBands", icon: "⌚", layout: "shelf", trades: false,
    fields: [DESIGN, YEAR, LIMITED] },
  { id: "figures", name: "Figures & Ornaments", icon: "🎄", layout: "shelf", trades: false,
    fields: [SERIES, YEAR] },
  { id: "pressed-pennies", name: "Coins & Medallions", icon: "🪙", layout: "list", trades: false,
    fields: [DESIGN, { id: "machine", name: "Machine", type: "text" },
      { id: "coin", name: "Coin", type: "choice", choices: ["Penny", "Nickel", "Dime", "Quarter", "Medallion"] }] },
  { id: "autographs", name: "Autographs", icon: "✍️", layout: "list", trades: false,
    fields: [CHARACTER, { id: "book", name: "Book", type: "text" }, { id: "page", name: "Page", type: "number" }] },
  { id: "paper", name: "Paper Keepsakes", icon: "🗺️", layout: "list", trades: false,
    fields: [{ id: "kind", name: "Kind", type: "choice",
      choices: ["Park map", "Times Guide", "Ticket", "Receipt", "Event guide", "Other"] }, YEAR] },
];

/** Where a deleted user category's items can go; shown only while it holds items. */
export const UNCATEGORISED_COLLECTION: BuiltInCollectionCategory = {
  id: "uncategorised", name: "Uncategorised", icon: "📦", layout: "shelf", trades: false, fields: [],
};

export const COLLECTION_STATES: readonly CollectionState[] = ["have", "want", "trade", "gone"];

/** Prefixes for ids the user's actions make. */
export const USER_COLLECTION_CATEGORY_PREFIX = "user_";
export const COLLECTION_FIELD_PREFIX = "field_";
export const COLLECTION_ITEM_PREFIX = "col_";

/** Custom fields a category can have (not counting deleted ones), to keep the form short on a phone. */
export const MAX_CUSTOM_FIELDS_PER_CATEGORY = 12;

/** How long a deleted custom field can be restored. */
export const DELETED_FIELD_RESTORE_MS = 30 * 24 * 60 * 60 * 1000;

/** Pal Free's limits (design §8a); VIP, Lapsed and the Planner have none. */
export const FREE_COLLECTION_LIMITS = { categories: 1, items: 25 } as const;

// ==================== LOOKUPS ====================

export function getBuiltInCollectionCategory(id: string): BuiltInCollectionCategory | undefined {
  if (id === UNCATEGORISED_COLLECTION.id) return UNCATEGORISED_COLLECTION;
  return BUILT_IN_COLLECTION_CATEGORIES.find((c) => c.id === id);
}

export function isUserCollectionCategoryId(id: string): boolean {
  return id.startsWith(USER_COLLECTION_CATEGORY_PREFIX);
}

/**
 * An item's category id as stored: trimmed, and blank becomes "uncategorised".
 * Unknown ids are kept (a user category from another device, or a built-in
 * a newer app version added), so nothing is lost before settings catch up.
 */
export function normalizeCollectionCategory(category?: string | null): string {
  const value = category?.trim();
  return value ? value : UNCATEGORISED_COLLECTION.id;
}

// Shopping sub-categories (PACKING_CATEGORIES.shopping) whose bought items
// Pal offers to add to a collection, with the built-in category they go to.
const SHOPPING_TO_COLLECTION: Readonly<Record<string, string>> = {
  "Pins & Collectibles": "pins",
  "Ears & Headwear": "ears",
  "Toys & Plush": "plush",
  Clothing: "apparel",
};

/** The built-in collection category a shopping sub-category's items belong in, if any. */
export function collectionCategoryForShopping(shoppingCategory?: string | null): string | undefined {
  const value = shoppingCategory?.trim();
  return value ? SHOPPING_TO_COLLECTION[value] : undefined;
}

/** Whether an item counts toward Pal Free's item limit: "gone" history doesn't. */
export function countsTowardCollectionLimit(state: CollectionState): boolean {
  return state !== "gone";
}
