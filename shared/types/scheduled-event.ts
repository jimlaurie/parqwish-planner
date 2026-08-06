// ==================== SCHEDULED EVENT TYPES ====================
// A ScheduledEvent is a single timeline instance of an activity.
// It links to a source item (show, dining, ride, etc.) by sourceId/itemType
// and adds time-specific data: scheduled time, completion, per-instance
// notes and photos.
//
// Key design properties:
//   • One source item can have multiple ScheduledEvent records on the same day
//     (e.g., Indiana Jones at 2pm and 5pm = two ScheduledEvent records)
//   • Source items (scheduledShows, scheduledDining, etc.) remain unchanged —
//     ScheduledEvent is purely additive
//   • Photos and notes on a ScheduledEvent are per-instance (taken/written at
//     that specific showing), separate from photos on the source item
//   • completionDate/completionTime capture when the activity ACTUALLY happened,
//     which may differ from scheduledTime (e.g., ride ran late)

// ==================== ITEM TYPES ====================

export type ScheduledEventItemType =
  | 'ride'
  | 'show'
  | 'dining'
  | 'lightning_lane'
  | 'wish'
  | 'place';

// ==================== SCHEDULED EVENT ====================

export interface ScheduledEvent {
  /** Unique ID — prefix 'event-' (e.g. 'event-1746123456789-a3f2b1') */
  id: string;

  /** The park day this event belongs to (YYYY-MM-DD, local timezone) */
  date: string;

  /** Owner user ID */
  userId: string;

  /**
   * Optional tripId — set by PWA when importing; not used on mobile
   * (mobile data is not trip-scoped)
   */
  tripId?: string;

  // ---- Source link ----

  /** ID of the source item this event is an instance of */
  sourceId: string;

  /** What kind of source item this is */
  itemType: ScheduledEventItemType;

  // ---- Scheduling ----

  /** When this instance is scheduled to occur (HH:MM, 24-hour) */
  scheduledTime?: string;

  // ---- Completion ----

  /** Whether this specific instance was completed */
  completed: boolean;

  /** ISO-8601 timestamp when marked complete */
  completedAt?: string;

  /** Actual date activity occurred (YYYY-MM-DD) — may differ from date if event
   *  ran past midnight */
  completionDate?: string;

  /** Actual time activity occurred (HH:MM, 24-hour) */
  completionTime?: string;

  // ---- Per-instance data ----

  /** Notes specific to this instance (override or supplement source item notes) */
  notes?: string;

  /** Photos taken at/during this specific instance (base64 data URIs) */
  photos?: string[];

  // ---- Timestamps ----

  createdAt: number; // Unix ms
  updatedAt: number; // Unix ms
}

// ==================== DEXIE RECORD (PWA) ====================
// When stored in IndexedDB, tripId is required (Dexie always has trip context).

export interface ScheduledEventRecord extends ScheduledEvent {
  tripId: string;
}
