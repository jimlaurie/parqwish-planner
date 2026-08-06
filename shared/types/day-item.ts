// ==================== DAY ITEM TYPES ====================
// A DayItem is a self-contained snapshot of a planned activity for a specific
// trip day. All display data is recorded at scheduling time so the record is
// readable without joining any other table.
//
// Live/dynamic fields (waitTime, rideStatus, lightningLaneTime) are overlaid
// at runtime from the live API and are never persisted here.

// ==================== ITEM TYPE ====================

export type DayItemType =
  | "ride"
  | "show"
  | "dining"
  | "lightning_lane"
  | "wish"
  | "shopping"
  | "outfit"
  | "equipment"
  | "sundry"
  | "place"
  | "custom";

// ==================== CORE TYPE ====================

export interface DayItem {
  // ---- Identity ----
  id: string;
  tripId?: string;          // required on PWA; omitted on mobile (no trip concept)
  userId: string;
  /** Firebase Auth uid of the account that pushed this item — see TripWishSelection.authorUid (shared/types/wish.ts) for the full rationale. Stamped at push time on both platforms (web/src/lib/wish-sync.ts pushDayItem, utils/WishSyncManager.ts pushDayItemNow). */
  authorUid?: string;
  date: string;             // YYYY-MM-DD

  // ---- Scheduling ----
  // scheduledTime is undefined → item lives in the "Anytime" section (no clock time)
  scheduledTime?: string;   // HH:MM 24-hour
  durationMinutes?: number; // optional; meaningful for ride/show/dining
  sortOrder: number;        // ordering within a time slot or Anytime section

  // ---- Snapshot (self-contained — no joins needed to display this record) ----
  title: string;
  itemType: DayItemType;
  park?: string;
  land?: string;
  notes?: string;
  priority?: string;        // A/B/C/D/E
  tags?: string[];
  photos?: string[];        // base64 data URIs or local file paths

  // ---- Back-reference (for live data overlay and pool deduplication) ----
  // sourceId links back to the originating catalog record.
  // A DayItem is valid without these — they are hints, not requirements.
  sourceId?: string;        // ID of the originating source item
  parkDataId?: string;      // park data catalog ID (for wait times, GPS coords)

  // ---- Completion ----
  completed: boolean;
  completedAt?: string;     // ISO-8601 datetime when marked complete

  // ---- Metadata ----
  createdAt: number;        // Unix ms
  updatedAt: number;        // Unix ms
}

// ==================== PWA DEXIE VARIANT ====================

/** DayItemRecord requires tripId for Dexie compound index queries [tripId+date]. */
export type DayItemRecord = DayItem & { tripId: string };

// ==================== TYPE HELPERS ====================

/** Items that typically have a duration worth showing in the UI. */
export const TIMED_ITEM_TYPES: DayItemType[] = [
  "ride",
  "show",
  "dining",
  "lightning_lane",
];

/** Display label for each item type. */
export const DAY_ITEM_TYPE_LABELS: Record<DayItemType, string> = {
  ride: "Ride",
  show: "Show",
  dining: "Dining",
  lightning_lane: "Lightning Lane",
  wish: "Wish",
  shopping: "Shopping",
  outfit: "Outfit",
  equipment: "Equipment",
  sundry: "Sundry",
  place: "Place",
  custom: "Custom",
};

/** Emoji icon for each item type. */
export const DAY_ITEM_TYPE_ICONS: Record<DayItemType, string> = {
  ride: "🎢",
  show: "🎭",
  dining: "🍽️",
  lightning_lane: "⚡",
  wish: "⭐",
  shopping: "🛍️",
  outfit: "👗",
  equipment: "🎒",
  sundry: "🧴",
  place: "📍",
  custom: "🗓️",
};
