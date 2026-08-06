/**
 * shared/sync/firestore-schema.ts
 *
 * Firestore document shapes for the ParQwish sync layer.
 *
 * Firestore path: users/{uid}/wishes/{wishId}
 *
 * Only structural fields (id, updatedAt, deletedAt) are plaintext.
 * encryptedPayload contains the full Wish object AES-GCM encrypted.
 */

// ==================== SYNCED WISH ====================

/**
 * Firestore document stored at users/{uid}/wishes/{wishId}
 */
export interface SyncedWishDoc {
  /** Wish ID — matches the local wish id and the Firestore document ID */
  id: string;

  /**
   * AES-GCM ciphertext of the full Wish object (JSON → encrypted → base64).
   * Decrypt with shared/sync/crypto.ts decrypt().
   */
  encryptedPayload: string;

  /**
   * ISO-8601 timestamp of last write. Used for last-write-wins conflict
   * resolution: the document with the higher updatedAt wins on merge.
   */
  updatedAt: string;

  /**
   * Set when the wish is deleted. Soft deletes propagate the deletion
   * to all devices without losing the document (which would race with
   * a stale "existing" record on a device that was offline).
   */
  deletedAt?: string;

  /**
   * Firebase Auth uid of whoever wrote this doc's real content — set only
   * by trails/photos (mobile-authored-only collections whose Firestore
   * security rules need a plaintext field to verify the true writer,
   * since the payload itself is opaque ciphertext). Every other collection
   * using this envelope leaves it unset.
   */
  authorUid?: string;
}

// ==================== SHARED TRIP KEY WRAP (Phase D) ====================

/**
 * One member's wrapped copy of a shared trip's data key.
 * Stored at sharedTrips/{tripId}/keyWraps/{uid} — NOT inside the
 * SyncedWishDoc envelope, since this isn't itself an encrypted payload of
 * app data; it's the key material other payloads on the trip are encrypted
 * with. wrappedKey is produced by shared/sync/crypto.ts wrapKey(tripKey,
 * deriveKey(uid)) and only that uid can unwrap it back to the raw trip key.
 *
 * Firestore rules restrict each doc to read/write by its own uid only —
 * a member can never read another member's wrap, only their own.
 */
export interface SyncedKeyWrap {
  wrappedKey: string;
  updatedAt: string;
}

// ==================== TRIP INVITE (Phase D.3) ====================

/**
 * An open invitation to join a shared trip. Stored at
 * sharedTrips/{tripId}/invites/{inviteId} — created by the trip Owner,
 * consumed by an invitee self-joining via the Firestore rules carve-out on
 * the parent trip doc (see firestore.rules).
 *
 * wrappedKey is the trip's data key wrapped with deriveKey(inviteSecret) —
 * NOT the account-derived key used everywhere else. inviteSecret travels
 * only in the invite link's URL fragment (never sent to any server, never
 * stored here) so this Firestore doc alone can't be used to decrypt
 * anything; a reader also needs the link.
 *
 * expiresAt is a Firestore Timestamp (not an ISO string like the rest of
 * this file) so firestore.rules can compare it against request.time
 * server-side — expiry is enforced by the rule, not just the client.
 */
export interface SyncedInvite {
  role: "editor" | "viewer";
  wrappedKey: string;
  createdBy: string; // uid of the trip Owner who generated this invite
  createdAt: string; // ISO-8601
  expiresAt: unknown; // Firestore Timestamp — typed unknown here to avoid a firebase/firestore dependency in shared/
}

// ==================== SYNCED TRIP USER ====================

/**
 * Wire payload for a Trip User profile (name/color/role), encrypted before
 * being written to Firestore. Stored at users/{uid}/tripUsers/{tripUserId}
 * using the same SyncedWishDoc envelope shape (id/encryptedPayload/updatedAt/
 * deletedAt) as every other synced collection in this file.
 *
 * id matches the platform-local Trip User id (e.g. "user_primary",
 * "user_guest_1") — sync does NOT introduce a new identifier scheme. Two
 * devices that independently created guest profiles before ever syncing can
 * still end up with colliding ids that mean different people; the pull-side
 * reconciliation (see wish-sync.ts / WishSyncManager.ts) detects a name
 * collision against an existing local profile and skips creating a
 * duplicate rather than guessing, logging a warning instead.
 *
 * Deletes ARE synced, as a tombstone (deletedAt set, encryptedPayload still
 * populated with the last-known name/color/role — unlike other collections'
 * deletes, which clear the payload). The populated payload lets the
 * receiving device verify identity before honoring the delete: it only
 * deletes its own local profile for that id if the local profile's name
 * still matches the tombstone's name. A mismatch means the id collided with
 * a different local person (the same risk described above for creates), so
 * the delete is skipped and logged rather than risking removing the wrong
 * profile. See applyRemoteTripUser in wish-sync.ts / WishSyncManager.ts.
 */
export interface SyncedTripUser {
  id: string;
  name: string;
  color: string;
  role: "primary" | "guest";
}

// ==================== SYNC METADATA ====================

/**
 * Stored locally (AsyncStorage / localStorage) to track sync state.
 * Key: "@parqwish:syncMeta"
 */
export interface SyncMeta {
  /** UID of the currently signed-in user */
  uid: string;

  /**
   * ISO-8601 timestamp of the last successful full pull from Firestore.
   * Incremental syncs only fetch documents updated after this time.
   */
  lastPulledAt: string;

  /** ISO-8601 timestamp of the last successful push */
  lastPushedAt: string;
}

// ==================== SYNC STATUS ====================

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "error"
  | "offline"
  | "unauthenticated";
