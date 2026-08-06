// ==================== WISH TYPES ====================

import type { Priority } from "./common";

export type WishTagId = "rides" | "shows" | "eats" | "shopping" | "photos" | "characters" | "place" | "other";

export type WishStatus = "idea" | "planned" | "assigned-to-day" | "completed" | "skipped";

export type WishSourceType = "app" | "web" | "shared";

/** Multi-resolution photo set for high-quality display at various sizes */
export interface PhotoSet {
  thumbnail: string;  // 300px max — card thumbnails, grid views
  display: string;    // 800px max — lightbox, detail views
  full: string;       // 1600px max — full-size viewing, export
}

/** Global catalog wish — exists independently of any trip */
export interface Wish {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  url?: string;
  tags: string[];             // WishTagId values, but string[] for flexibility
  priority: string;           // Priority values, but string for flexibility
  photos?: string[];          // Legacy: single-res thumbnails
  photoSets?: PhotoSet[];     // Multi-res photos (preferred)
  parkDataId?: string;
  parkDataName?: string;  // human-readable attraction name — needed by mobile for display/lookup
  park?: string;
  land?: string;
  maxWaitTime?: number;       // Max wait in minutes (rides only)
  sourcePlaceId?: string;     // Mobile PhotoSpot.id, for custom (non-catalog) places — stable cross-device dedup key, parallel to parkDataId
  latitude?: number;          // GPS capture — custom places created via mobile's ParkMap "Create Place"
  longitude?: number;
  capturedAt?: string;        // ISO-8601, when the GPS fix was captured
  sourceType?: WishSourceType;
  createdAt: number;
  updatedAt?: number;
  userId?: string;      // Creator of this catalog item (default: "user_primary")
}

/** Junction: links a catalog wish to a trip with per-trip state */
export interface TripWishSelection {
  id: string;           // Deterministic: `${tripId}__${wishId}`
  tripId: string;
  wishId: string;
  completed: boolean;
  status: WishStatus;
  addedAt: number;
  updatedAt?: number;    // Bumped on every mutation — used for cloud-sync last-write-wins
  userId?: string;      // Owner of this selection (default: "user_primary")
  completedAt?: string; // ISO-8601 — preserved from mobile sync for round-trip fidelity
  maxWait?: number;     // Mobile-only: ride wait-time alert threshold (minutes)
  travelTime?: number;  // Mobile-only: show/dining travel-time reminder offset (minutes)
  /**
   * Firebase Auth uid of the account that pushed this selection — stamped at
   * push time (web/src/lib/wish-sync.ts pushSelection), not creation time.
   * userId alone is ambiguous across collaborator accounts (each account has
   * its own local Trip Users, and ids like "user_primary" collide between
   * accounts); authorUid disambiguates whose Trip User namespace userId
   * belongs to when resolving a display badge. Unset on pre-existing records
   * and on solo (non-collaborative) trips — falls back to trusting userId.
   */
  authorUid?: string;
}
