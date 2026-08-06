// ==================== COMMON TYPES ====================

/** Priority system: E (must-do) → A (if-time), modeled after Disney ticket tiers */
export type Priority = "A" | "B" | "C" | "D" | "E";

/** Park location keys used throughout the app */
export type ParkKey =
  | "disneyland"
  | "californiaadventure"
  | "downtown"
  | "grandcalifornian"
  | "disneyland_hotel"
  | "pixar_place_hotel"
  | "disneyland_resort";

/**
 * Standard timestamp fields for database records. Both epoch-ms — a synced
 * Firestore envelope's own updatedAt (SyncedWishDoc.updatedAt) is always an
 * ISO-8601 string instead; use localUpdatedAtISO() (sync-helpers.ts) to
 * compare the two rather than reinventing the conversion at the call site.
 */
export interface Timestamped {
  createdAt: number;
  updatedAt: number;
}

/** ID generation prefix for each item type */
export type IdPrefix =
  | "wish"
  | "ride"
  | "show"
  | "dining"
  | "outfit"
  | "eq"
  | "su"
  | "shopping"
  | "itin"
  | "ensemble"
  | "trip"
  | "photo"
  | "event"
  | "day";
