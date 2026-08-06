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

export const PACKING_CATEGORIES: Record<PackingType, string[]> = {
  outfit: ["Day Wear", "Evening Wear", "Sleepwear", "Swimwear", "Shoes", "Accessories", "Weather Gear", "Other"],
  equipment: ["Electronics", "Chargers & Cables", "Camera Gear", "Bags & Carriers", "Comfort", "First Aid", "Other"],
  sundry: ["Toiletries", "Skincare", "Medications", "Hygiene", "Baby & Kids", "Snacks", "Other"],
  shopping: ["Souvenirs", "Clothing & Accessories", "Pins & Collectibles", "Toys & Plush", "Home & Kitchen", "Food & Treats", "Other"],
  dining: ["Breakfast", "Lunch", "Dinner", "Snack", "Character Dining", "Special Event", "Other"],
};

export function getPackingTab(type: PackingType): PackingTabConfig | undefined {
  return PACKING_TABS.find((t) => t.id === type);
}
