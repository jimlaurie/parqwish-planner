// ==================== CONSTANTS ====================
// Re-exported from shared data layer with PWA-specific additions.

// Wish tags
export type { WishTag } from "@shared/constants/tags";
export { WISH_TAGS, getTagById, getTagIcon } from "@shared/constants/tags";
export type { WishTagId } from "@shared/types/wish";

// Priority system
export type { PriorityConfig } from "@shared/constants/priorities";
export { TICKET_PRIORITIES, TICKET_COLORS, PRIORITY_SORT_ORDER } from "@shared/constants/priorities";

// Packing
export type { PackingTabConfig } from "@shared/constants/packing";
export { PACKING_TABS, PACKING_CATEGORIES, getPackingTab } from "@shared/constants/packing";

// Common types
export type { Priority, ParkKey } from "@shared/types/common";
