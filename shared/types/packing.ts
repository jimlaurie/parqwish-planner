// ==================== PACKING TYPES ====================

import type { Priority, Timestamped } from "./common";
import type { PhotoSet } from "./wish";

export type PackingType = "outfit" | "equipment" | "sundry" | "shopping" | "dining";

/** Global catalog packing item — exists independently of any trip */
export interface PackingItem extends Timestamped {
  id: string;
  type: PackingType;
  name: string;
  notes?: string;
  category: string;
  priority: string;           // Priority values, but string for flexibility
  price?: string;
  url?: string;
  photos?: string[];          // Legacy: single-res thumbnails
  photoSets?: PhotoSet[];     // Multi-res photos (preferred)
  linkedWishIds?: string[];
  linkedParkDataIds?: string[];
  // Dining-specific fields
  reservationTime?: string;
  reservationConfirmation?: string;
  partySize?: number;
  diningType?: "reservation" | "walk-up" | "mobile-order";
  dietaryNotes?: string;
  userId?: string;      // Creator of this catalog item (default: "user_primary")
}

/** Junction: links a catalog item to a trip with per-trip completion state */
export interface TripPackingSelection {
  id: string;           // Deterministic: `${tripId}__${itemId}`
  tripId: string;
  itemId: string;
  completed: boolean;
  addedAt: number;
  updatedAt?: number;    // Bumped on every mutation — used for cloud-sync last-write-wins
  userId?: string;      // Owner of this selection (default: "user_primary")
  /** Firebase Auth uid of the account that pushed this selection — see TripWishSelection.authorUid (shared/types/wish.ts) for the full rationale. */
  authorUid?: string;
}

/** Ensemble — a reusable grouping of catalog items (global, not per-trip) */
export interface Ensemble extends Timestamped {
  id: string;
  name: string;
  description?: string;
  itemIds: string[];        // PackingItem IDs in this ensemble
  coverPhoto?: string;
  userId?: string;          // Owner of this ensemble (default: "user_primary")
}
