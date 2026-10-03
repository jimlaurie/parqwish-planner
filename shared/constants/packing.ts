// ==================== PACKING CONSTANTS ====================

import type { PackingType } from "../types/packing";

export interface PackingTabConfig {
  id: PackingType;
  label: string;
  icon: string;
  idPrefix: string;
}

export const PACKING_TABS: readonly PackingTabConfig[] = [
  { id: "outfit", label: "Outfits", icon: "👗", idPrefix: "outfit_" },
  { id: "equipment", label: "Equipment", icon: "🎒", idPrefix: "eq_" },
  { id: "sundry", label: "Sundries", icon: "🧴", idPrefix: "su_" },
  { id: "shopping", label: "Shopping", icon: "🛍️", idPrefix: "shopping_" },
  { id: "dining", label: "Dining", icon: "🍽️", idPrefix: "dining_" },
] as const;

// Sub-categories per packing type. ParQwish Planner and ParQwish Pal both
// offer exactly these, so an item keeps its sub-category across sync.
export const PACKING_CATEGORIES: Record<PackingType, string[]> = {
  outfit: ["Day Wear", "Evening Wear", "Themed", "Sleepwear", "Swimwear", "Shoes", "Accessories", "Weather Gear", "Other"],
  equipment: ["Bags & Carriers", "Essentials", "Electronics", "Chargers & Cables", "Camera Gear", "Comfort", "First Aid", "Other"],
  sundry: ["Health & Hygiene", "Skincare & Sun", "Toiletries", "Medications", "Baby & Kids", "Snacks", "Money", "Comfort", "Other"],
  shopping: ["Clothing", "Accessories", "Ears & Headwear", "Pins & Collectibles", "Toys & Plush", "Home & Decor", "Food & Treats", "Souvenirs", "Other"],
  dining: ["Breakfast", "Lunch", "Dinner", "Snack", "Character Dining", "Special Event", "Other"],
};

/** The catch-all sub-category, used when an item has none. */
export const DEFAULT_PACKING_CATEGORY = "Other";

// Names the two apps used before the lists were unified (Oct 2026), mapped
// to their replacements. Older app versions can still send these, so they
// are translated on every import and sync pull, not just once.
const LEGACY_PACKING_CATEGORIES: Record<PackingType, Record<string, string>> = {
  outfit: { Casual: "Day Wear", "Dapper Day": "Themed", Custom: "Other" },
  equipment: { Bags: "Bags & Carriers", Tech: "Electronics", Accessories: "Comfort", Custom: "Other" },
  sundry: { Health: "Health & Hygiene", Hygiene: "Health & Hygiene", Skincare: "Skincare & Sun", Food: "Snacks", Custom: "Other" },
  shopping: {
    Apparel: "Clothing",
    "Clothing & Accessories": "Clothing",
    "Home & Kitchen": "Home & Decor",
    "Home Decor": "Home & Decor",
    Custom: "Other",
  },
  dining: {},
};

/**
 * An item's sub-category in the current shared list: old names are
 * translated, a blank one becomes "Other", and anything else (a name
 * neither app ever offered) is kept as it is.
 */
export function normalizePackingCategory(type: PackingType, category?: string | null): string {
  const value = category?.trim();
  if (!value) return DEFAULT_PACKING_CATEGORY;
  return LEGACY_PACKING_CATEGORIES[type]?.[value] ?? value;
}

export function getPackingTab(type: PackingType): PackingTabConfig | undefined {
  return PACKING_TABS.find((t) => t.id === type);
}
