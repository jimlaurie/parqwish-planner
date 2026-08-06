// ==================== TRIP TYPES ====================

import type { Timestamped } from "./common";

export type TripPhase = "plan" | "prepare" | "play" | "publish";

// ==================== COLLABORATION (Phase D) ====================

export type TripMemberRole = "owner" | "editor" | "viewer";

/**
 * One collaborating Firebase account's membership on a shared trip.
 * Keyed by Firebase UID in Trip.members — NOT the same dimension as Trip
 * User (see shared/sync/firestore-schema.ts SyncedTripUser docs): a single
 * collaborator account can have several of its own local Trip Users nested
 * underneath it (a family), or just itself (a friend on a group trip).
 */
export interface TripMember {
  role: TripMemberRole;
  joinedAt: string; // ISO-8601
  /**
   * The invites/{inviteId} doc this member used to self-join (see Phase D.3
   * design). Absent for the Owner, who is stamped in at trip creation, not
   * via an invite. Firestore rules cross-check this against a real,
   * unexpired invite doc before allowing the self-join write — required so
   * that knowing a tripId alone (its doc ID) isn't enough to join a trip.
   */
  invitedBy?: string;
  /**
   * How this member is shown to other collaborators. Plaintext, like every
   * other field on TripMember — anyone who can already read this record
   * has the trip key, so there's nothing to protect by encrypting a name.
   * Not enforced unique: at accept time the invitee can't yet read the
   * other members' names (the read rule requires already being a member),
   * so there's no way to check for collisions before joining.
   */
  displayName?: string;
}

/** Hard cap on collaborating accounts per trip: Owner + 12. */
export const MAX_TRIP_MEMBERS = 13;

/** Invite links expire 48 hours after creation (Phase D design decision). */
export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

// ==================== TRAVEL LEG TYPES ====================

/** A single flight leg (one direction). */
export interface FlightLeg {
  airline?: string;
  flightNumber?: string;
  date?: string;       // YYYY-MM-DD
  time?: string;       // HH:MM
  from?: string;       // airport code or city
  to?: string;         // airport code or city
  confirmation?: string;
  notes?: string;
}

/** A single hotel stay. */
export interface HotelStay {
  name?: string;
  confirmation?: string;
  checkIn?: string;    // YYYY-MM-DD
  checkOut?: string;   // YYYY-MM-DD
  notes?: string;
}

/** A single transportation leg. */
export interface TransportLeg {
  type?: string;       // "Rental Car", "Uber/Lyft", "Shuttle", etc.
  details?: string;
  date?: string;       // YYYY-MM-DD
  notes?: string;
}

// ==================== TRIP RECORD ====================

/** Trip record */
export interface Trip extends Timestamped {
  id: string;
  name: string;
  startDate: string;          // "" for templates
  endDate: string;            // "" for templates
  isTemplate: boolean;
  phase: TripPhase;
  // Travel — array-based (v15+)
  flights?: FlightLeg[];
  hotels?: HotelStay[];
  transports?: TransportLeg[];
  // Legacy single-string fields (pre-v15, kept for mobile compat)
  flightArrival?: string;
  flightDeparture?: string;
  flightConfirmation?: string;
  flightNotes?: string;
  hotelName?: string;
  hotelConfirmation?: string;
  hotelCheckIn?: string;
  hotelCheckOut?: string;
  hotelNotes?: string;
  transportationType?: string;
  transportationDetails?: string;
  transportationNotes?: string;
  // General
  notes?: string;
  // Archive
  isArchived?: boolean;
  archiveFileName?: string;
  // Collaboration (Phase D) — present once a trip has been shared at least
  // once; absent/undefined for a private, never-shared trip.
  members?: Record<string, TripMember>;
}

/** User profile — shared between mobile and PWA */
export interface UserProfile {
  id: string; // "user_primary", "user_guest_1", etc.
  username: string;
  isOwner?: boolean;
  color?: string; // hex color for avatar
  role?: "primary" | "guest";
  createdAt: number | string; // number (PWA) or ISO string (mobile)
  importedDate?: string;
  importedFrom?: string;
}
