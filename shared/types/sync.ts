// ==================== SYNC PROTOCOL TYPES ====================
// Shared wire format for file-based data transfer between mobile and PWA.

// ==================== SYNC CATEGORIES ====================

export type SyncCategory =
  | "rides"
  | "shows"
  | "dining"
  | "outfits"
  | "equipment"
  | "sundries"
  | "shopping"
  | "wishes"
  | "places"
  | "trail"
  | "scheduled_events"   // legacy — superseded by day_items; kept for import compat
  | "day_items";

export type ImportMode = "replace" | "merge";

// ==================== V2.0 ENVELOPE ====================

export interface SyncEnvelopeV2 {
  version: "2.0";
  type: "sync" | "archive";
  source: "mobile" | "pwa";
  encrypted: boolean;
  exportDate: string; // ISO-8601
  exportedBy: string;
  exportedByUserId?: string;
  categories: SyncCategory[];
  dateRange: { startDate: string; endDate: string };
  codeHash?: string; // SHA-256 of 6-digit code (sync only)
  data: SyncPayload;
}

// ==================== V1.0 ENVELOPE (Legacy) ====================

export interface SyncEnvelopeV1 {
  version: "1.0";
  source: "pwa" | "mobile";
  timestamp: string;
  dates: string[];
  hash?: string;
  items: SyncPayload;
}

// ==================== SYNC PAYLOAD ====================

export interface SyncPayload {
  rides: SyncRide[];
  shows: SyncShow[];
  dining: SyncDining[];
  wishes: SyncWish[];
  outfits: SyncPackingItem[];
  equipment: SyncPackingItem[];
  sundries: SyncPackingItem[];
  shopping: SyncShoppingItem[];
  places: SyncPlace[];
  photos: SyncPhoto[];
  trails?: SyncTrail[];
  scheduledEvents?: SyncScheduledEvent[]; // legacy — kept for import compat
  dayItems?: SyncDayItem[];
}

// ==================== TRAIL ====================

export interface SyncTrailPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
}

export interface SyncTrail {
  id: string;
  date: string; // YYYY-MM-DD
  resolution: "high" | "medium" | "low";
  points: SyncTrailPoint[];
  distanceMiles: number;
  durationMinutes: number;
  pointCount: number;
}

// ==================== ITEM TYPES ====================

export interface SyncRide {
  id: string;
  name: string;
  park: string;
  land: string;
  priority: string;
  maxWait?: number;
  completed: boolean;
  completedAt?: string; // ISO-8601
  notes?: string;
  date: string; // YYYY-MM-DD
}

export interface SyncPlace {
  id: string;
  name: string;
  park: string;
  land: string;
  priority: string;
  completed: boolean;
  completedAt?: string; // ISO-8601
  notes?: string;
  latitude?: number;
  longitude?: number;
  capturedAt?: string; // ISO-8601, when the GPS fix was captured
  date: string; // YYYY-MM-DD
}

export interface SyncShow {
  id: string;
  name: string;
  park: string;
  land: string;
  showTime?: string;
  timeType?: "fixed" | "range";
  travelTime?: number;
  priority: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  date: string;
}

export interface SyncDining {
  id: string;
  name: string;
  park: string;
  land: string;
  time?: string;
  type?: "reservation" | "walk-up" | "mobile-order";
  travelTime?: number;
  priority: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  reservationConfirmation?: string;
  partySize?: number;
  dietaryNotes?: string;
  date: string;
}

export interface SyncWish {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  priority: string;
  completed: boolean;
  completedAt?: string;
  url?: string;
  notes?: string;
  date: string;
  /** Linked park entity, when the wish points at a specific attraction/place
   *  (e.g. a "place" or "rides"-tagged wish) — needed so the receiving
   *  platform can convert it into a typed Ride/Place record instead of a
   *  generic wish. Omitted for unlinked wishes. */
  parkDataId?: string;
  park?: string;
  land?: string;
}

export interface SyncPackingItem {
  id: string;
  name: string;
  category: string;
  priority: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  date: string;
}

export interface SyncShoppingItem extends SyncPackingItem {
  price?: string;
  shops?: string[];
  url?: string;
  purchased?: boolean;
}

// ==================== SCHEDULED EVENTS ====================

export interface SyncScheduledEvent {
  id: string;
  date: string;           // YYYY-MM-DD
  userId: string;
  sourceId: string;       // ID of the source item (show, dining, ride, etc.)
  itemType: string;       // 'ride' | 'show' | 'dining' | 'lightning_lane' | 'wish' | 'place'
  scheduledTime?: string; // HH:MM (24-hour)
  completed: boolean;
  completedAt?: string;   // ISO-8601
  completionDate?: string; // YYYY-MM-DD
  completionTime?: string; // HH:MM (24-hour)
  notes?: string;
  photos?: string[];      // base64 data URIs (photos taken during this instance)
  createdAt: number;      // Unix ms
  updatedAt: number;      // Unix ms
}

// ==================== DAY ITEMS ====================

export interface SyncDayItem {
  id: string;
  date: string;             // YYYY-MM-DD
  userId: string;

  // Scheduling
  scheduledTime?: string;   // HH:MM 24-hour; absent = "Anytime"
  durationMinutes?: number;
  sortOrder: number;

  // Snapshot — self-contained display data
  title: string;
  itemType: string;         // DayItemType as string for forward compat
  park?: string;
  land?: string;
  notes?: string;
  priority?: string;
  tags?: string[];
  photos?: string[];

  // Back-reference
  sourceId?: string;
  parkDataId?: string;

  // Completion
  completed: boolean;
  completedAt?: string;     // ISO-8601

  // Metadata
  createdAt: number;        // Unix ms
  updatedAt: number;        // Unix ms
}

// ==================== PHOTOS ====================

export interface SyncPhoto {
  id: string;
  data: string; // base64 data URI
  mimeType: string;
  itemId: string;
  itemType: string;
  timestamp?: string; // ISO-8601 when photo was taken
}

// ==================== PHOTO ZIP MANIFEST (v1) ====================
// Wire format for the dedicated zip-based photo transfer (Photo Gallery →
// Publish), distinct from SyncPhoto/SyncEnvelopeV2 above: photo bytes live
// as real files inside the zip under photos/, this type only describes the
// manifest.json entry that points at one of those files.

export interface PhotoManifestEntry {
  filename: string;    // e.g. "photos/photo_0001.jpg", relative to zip root
  itemId: string;      // source-device item id (best-effort; cross-device IDs are not assumed stable — see itemName)
  itemType: string;    // 'wish'|'ride'|'show'|'dining'|'outfit'|'equipment'|'sundry'|'shopping'|'photo'
  itemName: string;    // required fallback matching key — raw IDs diverge cross-device
  date: string | null; // day-level YYYY-MM-DD, mirrors mobile's PhotoItemMeta.date
  timestamp?: string;  // ISO-8601, not currently surfaced by mobile's Photo Gallery
  latitude?: number;   // itemType 'photo' (Places) only — carried from the source PhotoSpot
  longitude?: number;
  capturedAt?: string; // ISO-8601, when the GPS fix was captured
}

export interface PhotoZipManifest {
  version: "1.0";
  exportedAt: string; // ISO-8601
  exportedBy: string;
  exportedByUserId?: string;
  photos: PhotoManifestEntry[];
}
