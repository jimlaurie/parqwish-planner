// ==================== SHARED SYNC HELPERS ====================
// Pure utility functions used by both mobile and PWA sync-translate layers.
// No platform dependencies (no Dexie, no AsyncStorage, no expo-file-system).

import { PARK_NAME_TO_KEY, PARK_KEY_TO_NAME } from "./constants/parks";
import type { SyncPayload } from "./types/sync";

// ==================== CONSTANTS ====================

export const DEFAULT_PRIORITY = "C";
export const DEFAULT_DURATION_RIDE = 60;
export const DEFAULT_DURATION_SHOW = 30;
export const DEFAULT_DURATION_DINING = 60;
export const DEFAULT_TRAVEL_TIME = 10;

// ==================== PARK KEY HELPERS ====================

/**
 * Normalize a park name or key to a canonical park key.
 * Accepts display names ("Disneyland Park"), keys ("disneyland"), or unknown strings.
 */
export function normalizeParkKey(parkName?: string): string {
  if (!parkName) return "disneyland";
  // Already a known key?
  if (parkName in PARK_KEY_TO_NAME) return parkName;
  // Known display name?
  if (parkName in PARK_NAME_TO_KEY) return PARK_NAME_TO_KEY[parkName];
  // Fallback: lowercase with spaces stripped
  return parkName.toLowerCase().replace(/\s+/g, "");
}

/**
 * Convert a park key back to a display name.
 */
export function parkKeyToDisplayName(key: string): string {
  return PARK_KEY_TO_NAME[key] || key;
}

// ==================== ID GENERATION ====================

/**
 * Generate a unique ID for sync-imported items.
 * Format: `{prefix}_sync_{timestamp}_{random6}`
 */
export function generateSyncId(prefix: string, now?: number): string {
  const ts = now ?? Date.now();
  return `${prefix}_sync_${ts}_${Math.random().toString(36).slice(2, 8)}`;
}

// ==================== TAG → CATEGORY MAPPING ====================

/**
 * Determine which sync category a wish belongs to based on its tags.
 * Returns the first matching category, or "wishes" as fallback.
 */
export function wishTagToSyncCategory(
  tags?: string[]
): "rides" | "shows" | "dining" | "wishes" {
  if (!tags) return "wishes";
  if (tags.includes("rides")) return "rides";
  if (tags.includes("shows")) return "shows";
  if (tags.includes("eats")) return "dining";
  return "wishes";
}

// ==================== DINING TYPE NORMALIZATION ====================

const VALID_DINING_TYPES = new Set(["reservation", "walk-up", "mobile-order"]);

/**
 * Normalize a dining type string to one of the valid wire values.
 * Handles mobile's "diningType" field, underscore/space variants, and various casing.
 */
export function normalizeDiningType(
  type?: string
): "reservation" | "walk-up" | "mobile-order" {
  if (!type) return "walk-up";
  // Normalise separators and case, then check exact match first
  const lower = type.toLowerCase();
  if (VALID_DINING_TYPES.has(lower))
    return lower as "reservation" | "walk-up" | "mobile-order";
  // Collapse underscores/spaces to hyphens for fuzzy match
  const hyphenated = lower.replace(/[\s_]+/g, "-");
  if (VALID_DINING_TYPES.has(hyphenated))
    return hyphenated as "reservation" | "walk-up" | "mobile-order";
  // Substring match for common aliases
  if (lower.includes("reserv")) return "reservation";
  if (lower.includes("mobile") || lower.includes("order")) return "mobile-order";
  return "walk-up";
}

// ==================== TIMESTAMP HELPERS ====================

/**
 * Normalizes a local record's updatedAt (epoch-ms number, from Timestamped)
 * into an ISO-8601 string comparable against a synced Firestore envelope's
 * own updatedAt (SyncedWishDoc.updatedAt, always a string) for last-write-wins
 * checks. Returns "" for a missing/falsy input so `remote.updatedAt > ""` is
 * always true (any real remote timestamp wins over "no local record yet").
 */
export function localUpdatedAtISO(updatedAt: number | string | undefined | null): string {
  return updatedAt ? new Date(updatedAt).toISOString() : "";
}

// ==================== PAYLOAD FACTORY ====================

/**
 * Create an empty SyncPayload with all arrays initialized.
 */
export function emptyPayload(): SyncPayload {
  return {
    rides: [],
    shows: [],
    dining: [],
    wishes: [],
    outfits: [],
    equipment: [],
    sundries: [],
    shopping: [],
    places: [],
    photos: [],
  };
}
