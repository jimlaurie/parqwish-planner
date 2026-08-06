"use client";

/**
 * web/src/lib/wish-sync.ts
 *
 * Bidirectional sync for wishes, trips, and tripWishSelections between
 * IndexedDB (Dexie) and Firestore.
 *
 * Architecture:
 *   - Local (Dexie) is the source of truth for reads — app is always fast.
 *   - Writes go to Dexie first (immediate UI update), then Firestore.
 *   - Firestore real-time listeners push remote changes back to Dexie.
 *   - Conflict resolution: last-write-wins on syncedAt ISO string.
 *
 * Encryption:
 *   - Full objects are AES-GCM-256 encrypted before Firestore writes.
 *   - Key derived from Firebase UID via HKDF-SHA256.
 *   - Firestore stores ciphertext only — unreadable without the key.
 */

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import app from "./firebase";
import { auth, isSyncEnabled } from "./auth";
import { deriveKey, encrypt, decrypt, generateRandomKey, wrapKey, unwrapKey, toBase64 } from "@shared/sync/crypto";
import type { SyncedWishDoc, SyncedTripUser, SyncedKeyWrap } from "@shared/sync/firestore-schema";
import type { Wish, TripWishSelection } from "@shared/types/wish";
import { INVITE_TTL_MS, type Trip, type TripMember } from "@shared/types/trip";
import type { DayItemRecord } from "@shared/types/day-item";
import type { PackingItem, TripPackingSelection } from "@shared/types/packing";
import { localUpdatedAtISO } from "@shared/sync-helpers";
import db, { type User } from "./db";

const firestore = getFirestore(app);

// ==================== KEY CACHE ====================

let _keyCache: { uid: string; key: Uint8Array } | null = null;

async function getKey(uid: string): Promise<Uint8Array> {
  if (_keyCache?.uid === uid) return _keyCache.key;
  const key = await deriveKey(uid);
  _keyCache = { uid, key };
  return key;
}

// ==================== FIRESTORE HELPERS ====================

function wishesCol(uid: string) {
  return collection(firestore, "users", uid, "wishes");
}

function wishDoc(uid: string, wishId: string) {
  return doc(firestore, "users", uid, "wishes", wishId);
}

// ==================== PUSH (local → Firestore) ====================

/**
 * Encrypt and push a single wish to Firestore.
 * Called after every local wish write.
 */
export async function pushWish(wish: Wish, uid: string): Promise<void> {
  const key = await getKey(uid);
  const encryptedPayload = await encrypt(wish, key);

  const syncDoc: SyncedWishDoc = {
    id: wish.id,
    encryptedPayload,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(wishDoc(uid, wish.id), syncDoc, { merge: false });

  // Clear pendingSync flag in Dexie
  await db.wishes.update(wish.id, { pendingSync: 0 } as Partial<Wish>);
}

/**
 * Push all locally pending wishes (pendingSync = 1) to Firestore.
 * Called on app focus / auth state change.
 */
export async function flushPendingWishes(uid: string): Promise<void> {
  const pending = await db.wishes
    .where("pendingSync")
    .equals(1)
    .toArray();

  await Promise.allSettled(pending.map((w) => pushWish(w, uid)));
}

// ==================== PULL (Firestore → local) ====================

/**
 * Pull all wishes from Firestore, decrypt, and merge into Dexie.
 * Uses last-write-wins: remote wins if its updatedAt is newer.
 */
export async function pullWishes(uid: string): Promise<number> {
  const key = await getKey(uid);
  const snapshot = await getDocs(wishesCol(uid));
  let updated = 0;

  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedWishDoc;

    // Soft-deleted wish — remove wish and any orphaned selections locally
    if (remote.deletedAt) {
      const local = await db.wishes.get(remote.id);
      if (local) {
        await db.wishes.delete(remote.id);
        await db.tripWishSelections.where("wishId").equals(remote.id).delete();
        updated++;
      }
      continue;
    }

    const decrypted = await decrypt<Wish>(remote.encryptedPayload, key);
    if (!decrypted) continue; // decryption failure — skip

    const local = await db.wishes.get(remote.id);
    const remoteTime = remote.updatedAt;
    const localTime = localUpdatedAtISO(local?.updatedAt);

    if (!local || remoteTime > localTime) {
      await db.wishes.put({ ...decrypted, pendingSync: 0 } as Wish);
      updated++;
    }
  }

  return updated;
}

// ==================== REAL-TIME LISTENER ====================

/**
 * Subscribe to Firestore wish changes for the signed-in user.
 * New/updated/deleted wishes from other devices arrive here in real time.
 * Returns an unsubscribe function.
 */
export function subscribeToWishes(uid: string): Unsubscribe {
  // Cache key as a resolved value (not a promise) so a failed derivation
  // doesn't permanently poison the keyPromise across snapshots.
  let _key: Uint8Array | null = null;

  return onSnapshot(
    wishesCol(uid),
    async (snapshot) => {
      try {
        const changes = snapshot.docChanges();
        console.log("[wish-sync] snapshot fired —", changes.length, "changes");

        if (!_key) _key = await getKey(uid);
        const key = _key;

        for (const change of changes) {
          const remote = change.doc.data() as SyncedWishDoc;
          console.log("[wish-sync] change:", change.type, "id:", remote.id?.slice(-8));

          if (change.type === "removed" || remote.deletedAt) {
            await db.wishes.delete(remote.id);
            await db.tripWishSelections.where("wishId").equals(remote.id).delete();
            continue;
          }

          const decrypted = await decrypt<Wish>(remote.encryptedPayload, key);
          if (!decrypted) {
            console.warn("[wish-sync] decryption failed for:", remote.id?.slice(-8));
            continue;
          }

          // Only apply if remote is newer than our local copy
          const local = await db.wishes.get(remote.id);
          const remoteTime = remote.updatedAt;
          const localTime = localUpdatedAtISO(local?.updatedAt);

          console.log("[wish-sync] remote:", remoteTime, "local:", localTime, "apply:", !local || remoteTime > localTime);

          if (!local || remoteTime > localTime) {
            await db.wishes.put({ ...decrypted, pendingSync: 0 } as Wish);
            console.log("[wish-sync] applied wish:", decrypted.title);
          }
        }
      } catch (err) {
        console.error("[wish-sync] snapshot processing error:", err);
        _key = null; // reset so next snapshot retries key derivation
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] Firestore listener error:", err); }
  );
}

// ==================== SOFT DELETE ====================

/**
 * Mark a wish as deleted in Firestore (tombstone) so the deletion
 * propagates to all devices. The local delete should happen first via Dexie.
 */
export async function deleteWishRemote(
  wishId: string,
  uid: string
): Promise<void> {
  await setDoc(
    wishDoc(uid, wishId),
    { id: wishId, deletedAt: new Date().toISOString(), encryptedPayload: "", updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

// ==================== SHARED TRIPS (Phase D) ====================
//
// Every trip — shared or not — lives at sharedTrips/{tripId} from the
// moment it's created (see CLAUDE.md "Every Trip lives here from day one").
// Trip content is encrypted with a random per-trip key, never the UID key,
// so any future collaborator can be granted access by wrapping a copy of
// that same key for their UID — no re-encryption of content when
// membership changes. See shared/sync/crypto.ts envelope encryption.

interface SyncedTripDoc {
  id: string;
  encryptedPayload: string;
  updatedAt: string;
  deletedAt?: string;
  members: Record<string, TripMember>;
}

function sharedTripsCol() {
  return collection(firestore, "sharedTrips");
}
function sharedTripDocRef(tripId: string) {
  return doc(firestore, "sharedTrips", tripId);
}
function keyWrapDocRef(tripId: string, uid: string) {
  return doc(firestore, "sharedTrips", tripId, "keyWraps", uid);
}

const _tripKeyCache = new Map<string, Uint8Array>();

/**
 * Resolve a trip's data key by unwrapping this uid's keyWrap doc. Cached
 * per tripId for the lifetime of the page — a trip's key never changes.
 *
 * Retries a few times if the keyWrap doc doesn't exist yet: createSharedTrip
 * writes the trip doc and its keyWrap in two separate round-trips, and a
 * caller (e.g. generating an invite right after creating a trip) can
 * legitimately race ahead of that write completing. Doesn't retry on a
 * doc that exists but fails to unwrap — that's a real error, not a timing
 * issue, and retrying it would just waste time before failing anyway.
 */
async function getTripKey(
  tripId: string,
  uid: string,
  retries = 3,
  delayMs = 400
): Promise<Uint8Array | null> {
  const cached = _tripKeyCache.get(tripId);
  if (cached) return cached;

  for (let attempt = 0; ; attempt++) {
    const wrapSnap = await getDoc(keyWrapDocRef(tripId, uid));
    if (wrapSnap.exists()) {
      const wrap = wrapSnap.data() as SyncedKeyWrap;
      const wrapperKey = await getKey(uid);
      const tripKey = await unwrapKey(wrap.wrappedKey, wrapperKey);
      if (tripKey) _tripKeyCache.set(tripId, tripKey);
      return tripKey;
    }
    if (attempt >= retries) return null;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

/**
 * Create a brand-new shared trip: generates its data key, wraps a copy for
 * the creator, and writes the trip document (members = { [uid]: owner })
 * plus the creator's own keyWrap. Every trip goes through this exactly once,
 * at creation — there's no separate "upgrade to shared" step later; a trip
 * that's never invited anyone just has a members map of size 1 forever.
 */
export async function createSharedTrip(trip: Trip, uid: string, displayName?: string): Promise<void> {
  const tripKey = generateRandomKey();
  _tripKeyCache.set(trip.id, tripKey);

  const wrapperKey = await getKey(uid);
  const wrappedKey = await wrapKey(tripKey, wrapperKey);

  const { members: _members, ...content } = trip;
  const encryptedPayload = await encrypt(content, tripKey);
  const members: Record<string, TripMember> = {
    [uid]: { role: "owner", joinedAt: new Date().toISOString(), ...(displayName ? { displayName } : {}) },
  };

  await setDoc(sharedTripDocRef(trip.id), {
    id: trip.id,
    encryptedPayload,
    updatedAt: new Date().toISOString(),
    members,
  });
  await setDoc(keyWrapDocRef(trip.id, uid), {
    wrappedKey,
    updatedAt: new Date().toISOString(),
  });

  // Feed membership back into the local record — createSharedTrip is the
  // only place that ever sets it on the client.
  await db.trips.update(trip.id, { members });
}

/**
 * Push a content-only update (metadata edits) for a trip that already
 * exists in Firestore. Never touches `members` — Firestore rules only let
 * the Owner write this document at all, so a non-owner's push simply
 * fails with permission-denied (caught by the caller's .catch(() => {})).
 */
export async function pushTrip(trip: Trip, uid: string): Promise<void> {
  const tripKey = await getTripKey(trip.id, uid);
  if (!tripKey) {
    console.warn("[wish-sync] pushTrip: no trip key for", trip.id, "— trip may not be created remotely yet");
    return;
  }
  const { members: _members, ...content } = trip;
  const encryptedPayload = await encrypt(content, tripKey);
  await updateDoc(sharedTripDocRef(trip.id), {
    encryptedPayload,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTripRemote(tripId: string, uid: string): Promise<void> {
  void uid; // kept for call-site symmetry with the other deleteXRemote helpers
  await updateDoc(sharedTripDocRef(tripId), {
    encryptedPayload: "",
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
  });
  _tripKeyCache.delete(tripId);
}

async function applyRemoteTrip(uid: string, remote: SyncedTripDoc): Promise<void> {
  if (remote.deletedAt) { await db.trips.delete(remote.id); return; }
  const tripKey = await getTripKey(remote.id, uid);
  if (!tripKey) return; // no keyWrap for us yet (shouldn't happen if members includes us)
  const decrypted = await decrypt<Omit<Trip, "members">>(remote.encryptedPayload, tripKey);
  if (!decrypted) return;
  const local = await db.trips.get(remote.id);
  const localTime = localUpdatedAtISO(local?.updatedAt);
  if (!local || remote.updatedAt > localTime) {
    await db.trips.put({ ...decrypted, members: remote.members } as Trip);
  } else {
    // Content is locally newer, but membership is always Firestore's word.
    await db.trips.update(remote.id, { members: remote.members });
  }
}

/** One-time pull of every shared trip this uid is a member of. Returns the
 *  tripIds found so the caller can pull each trip's content subcollections. */
export async function pullSharedTrips(uid: string): Promise<string[]> {
  const q = query(sharedTripsCol(), where(`members.${uid}`, "!=", null));
  const snapshot = await getDocs(q);
  const tripIds: string[] = [];
  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedTripDoc;
    await applyRemoteTrip(uid, remote);
    if (!remote.deletedAt) tripIds.push(remote.id);
  }
  return tripIds;
}

// Per-trip content listeners (wishSelections/packingSelections/dayItems),
// keyed by tripId. Started/stopped as subscribeToSharedTrips sees this
// account's membership change.
const _tripContentUnsubs = new Map<string, Unsubscribe[]>();

function subscribeToSharedTrips(uid: string): Unsubscribe {
  const q = query(sharedTripsCol(), where(`members.${uid}`, "!=", null));
  return onSnapshot(
    q,
    async (snapshot) => {
      try {
        for (const change of snapshot.docChanges()) {
          const remote = change.doc.data() as SyncedTripDoc;

          if (change.type === "removed") {
            _tripContentUnsubs.get(remote.id)?.forEach((u) => u());
            _tripContentUnsubs.delete(remote.id);
            continue;
          }

          await applyRemoteTrip(uid, remote);
          console.log("[wish-sync] applied trip:", remote.id.slice(-8));

          if (remote.deletedAt) {
            _tripContentUnsubs.get(remote.id)?.forEach((u) => u());
            _tripContentUnsubs.delete(remote.id);
            continue;
          }

          if (!_tripContentUnsubs.has(remote.id)) {
            _tripContentUnsubs.set(remote.id, [
              subscribeToWishSelectionsForTrip(remote.id, uid),
              subscribeToPackingSelectionsForTrip(remote.id, uid),
              subscribeToDayItemsForTrip(remote.id, uid),
              subscribeToWishMirrorForTrip(remote.id, uid),
              subscribeToPackingItemMirrorForTrip(remote.id, uid),
              subscribeToTrailsForTrip(remote.id, uid),
              subscribeToPhotoMetadataForTrip(remote.id, uid),
            ]);
          }
        }
      } catch (err) {
        console.error("[wish-sync] sharedTrips snapshot error:", err);
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] sharedTrips listener error:", err); }
  );
}

function unsubscribeAllTripContent(): void {
  for (const unsubs of _tripContentUnsubs.values()) unsubs.forEach((u) => u());
  _tripContentUnsubs.clear();
}

// ==================== TRIP INVITES (Phase D.3) ====================
//
// An invite grants a role on a trip to whoever holds its link — the
// Firestore doc alone isn't enough (see firestore.rules): the trip's data
// key is wrapped with deriveKey(inviteSecret), and inviteSecret only ever
// travels in the invite link's URL fragment, never written to Firestore.
// Accepting an invite is: unwrap the trip key with the secret, self-join
// (Firestore rules cross-check the invite is real/unexpired/role-matched),
// then wrap a fresh copy of the trip key for the invitee's own account key
// — same as any other member going forward.

export interface TripInvite {
  tripId: string;
  inviteId: string;
  role: "editor" | "viewer";
  expiresAt: number; // epoch ms, for client-side display/countdown
  createdBy: string;
}

function invitesCol(tripId: string) {
  return collection(firestore, "sharedTrips", tripId, "invites");
}
function inviteDocRef(tripId: string, inviteId: string) {
  return doc(firestore, "sharedTrips", tripId, "invites", inviteId);
}

// URL-safe base64 — invite secrets travel in a URL fragment, so standard
// base64's `+`, `/`, `=` need converting. deriveKey() treats this string as
// opaque input either way, so there's no need to convert it back to raw
// bytes on the accepting side — the same string in both directions is
// enough to derive the same wrapper key.
function toUrlSafeBase64(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate a fresh invite: a random secret (never stored), the trip key
 * wrapped with that secret, and a Firestore doc recording role + expiry.
 * Returns the full shareable link (secret lives only in the URL fragment).
 */
export async function createInvite(
  tripId: string,
  role: "editor" | "viewer",
  uid: string
): Promise<string> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) throw new Error("createInvite: no trip key — is this trip synced yet?");

  const secretBytes = generateRandomKey(); // 256 bits is plenty for a 48h-lived secret
  const secret = toUrlSafeBase64(toBase64(secretBytes));
  const secretWrapperKey = await deriveKey(secret);
  const wrappedKey = await wrapKey(tripKey, secretWrapperKey);

  const expiresAtMs = Date.now() + INVITE_TTL_MS;
  const inviteRef = doc(invitesCol(tripId));
  await setDoc(inviteRef, {
    role,
    wrappedKey,
    createdBy: uid,
    createdAt: new Date().toISOString(),
    expiresAt: Timestamp.fromMillis(expiresAtMs),
  });

  const base = typeof window !== "undefined" ? window.location.origin : "https://parqwish.com";
  return `${base}/join#trip=${encodeURIComponent(tripId)}&invite=${encodeURIComponent(inviteRef.id)}&secret=${encodeURIComponent(secret)}`;
}

/** Revoke an invite before it's used or expires. Owner only (enforced by rules). */
export async function revokeInvite(tripId: string, inviteId: string): Promise<void> {
  await deleteDoc(inviteDocRef(tripId, inviteId));
}

/** Read + validate an invite's metadata (role, expiry) without accepting it. */
export async function getInvite(tripId: string, inviteId: string): Promise<TripInvite | null> {
  const snap = await getDoc(inviteDocRef(tripId, inviteId));
  if (!snap.exists()) return null;
  const data = snap.data() as { role: "editor" | "viewer"; createdBy: string; expiresAt: Timestamp };
  return {
    tripId,
    inviteId,
    role: data.role,
    createdBy: data.createdBy,
    expiresAt: data.expiresAt.toMillis(),
  };
}

/**
 * Accept an invite: unwrap the trip key with the secret from the link,
 * self-join the trip's members map (Firestore rules validate the invite
 * server-side), then wrap a fresh copy of the trip key for this account —
 * from this point on the invitee is a normal member using getTripKey()
 * like everyone else. Returns the joined trip's plaintext content so the
 * caller can show something immediately without waiting for the next pull.
 */
export async function acceptInvite(
  tripId: string,
  inviteId: string,
  secret: string,
  uid: string,
  displayName: string
): Promise<void> {
  const inviteSnap = await getDoc(inviteDocRef(tripId, inviteId));
  if (!inviteSnap.exists()) throw new Error("This invite is no longer valid.");
  const invite = inviteSnap.data() as { role: "editor" | "viewer"; wrappedKey: string; expiresAt: Timestamp };
  if (invite.expiresAt.toMillis() < Date.now()) throw new Error("This invite has expired.");

  const secretWrapperKey = await deriveKey(secret);
  const tripKey = await unwrapKey(invite.wrappedKey, secretWrapperKey);
  if (!tripKey) throw new Error("This invite link looks corrupted — ask for a new one.");

  // Can't getDoc the trip first to check/merge current membership — the
  // read rule requires isMember(), and we aren't one yet. Instead, update
  // just the members.{uid} field path: Firestore resolves the rule against
  // the full resulting document either way, so this self-join is exactly
  // as valid as if we'd read-then-merged, without needing read access.
  const tripRef = sharedTripDocRef(tripId);
  const newMember: TripMember = {
    role: invite.role,
    joinedAt: new Date().toISOString(),
    invitedBy: inviteId,
    displayName,
  };
  try {
    await updateDoc(tripRef, { [`members.${uid}`]: newMember });
  } catch (err) {
    // The self-join rule branch only fires for a non-member — a repeat
    // attempt (re-clicked an old link) lands here instead. Confirm via
    // keyWraps, which only an existing member can read, before treating
    // the failure as "already joined" rather than a real error.
    const alreadyMember = await getDoc(keyWrapDocRef(tripId, uid))
      .then((s) => s.exists())
      .catch(() => false);
    if (!alreadyMember) throw err;
  }

  // Wrap our own copy with this account's key so future syncs use the
  // normal per-account keyWrap path, same as every other member.
  const accountKey = await getKey(uid);
  const wrappedForMe = await wrapKey(tripKey, accountKey);
  await setDoc(keyWrapDocRef(tripId, uid), {
    wrappedKey: wrappedForMe,
    updatedAt: new Date().toISOString(),
  });

  _tripKeyCache.set(tripId, tripKey);
}

/**
 * Change how a member is shown to other collaborators. Any existing member
 * can rename THEMSELVES (targetUid === their own uid); only the Owner can
 * rename anyone else — both are enforced by firestore.rules, not by this
 * function. Uses a members.{uid}.displayName field-path update rather than
 * read-then-merge so it works even for a member who can't necessarily read
 * every other field on the trip doc's members map.
 */
export async function updateMemberDisplayName(
  tripId: string,
  targetUid: string,
  displayName: string
): Promise<void> {
  await updateDoc(sharedTripDocRef(tripId), {
    [`members.${targetUid}.displayName`]: displayName,
  });
}

/**
 * Change an existing member's role. Firestore rules only let the trip
 * Owner's write through (see firestore.rules isOwner() branch on
 * sharedTrips/{tripId}) — a non-owner calling this gets permission-denied.
 */
export async function updateMemberRole(
  tripId: string,
  targetUid: string,
  newRole: "editor" | "viewer"
): Promise<void> {
  const tripSnap = await getDoc(sharedTripDocRef(tripId));
  if (!tripSnap.exists()) throw new Error("This trip no longer exists.");
  const remote = tripSnap.data() as SyncedTripDoc;
  const existing = remote.members[targetUid];
  if (!existing) throw new Error("That person is no longer a member.");
  await updateDoc(sharedTripDocRef(tripId), {
    members: { ...remote.members, [targetUid]: { ...existing, role: newRole } },
  });
}

/**
 * Revoke a member's access. Owner-only, same as updateMemberRole. Note this
 * only stops *future* sync for that member — any data they already pulled
 * to their device before removal stays there, decrypted, same tradeoff as
 * every local-first E2E-encrypted app (there's no way to remotely erase
 * data already on a device you don't control).
 */
export async function removeMember(tripId: string, targetUid: string): Promise<void> {
  const tripSnap = await getDoc(sharedTripDocRef(tripId));
  if (!tripSnap.exists()) throw new Error("This trip no longer exists.");
  const remote = tripSnap.data() as SyncedTripDoc;
  const updated = { ...remote.members };
  delete updated[targetUid];
  await updateDoc(sharedTripDocRef(tripId), { members: updated });
}

// ==================== TRIP WISH SELECTIONS ====================

function wishSelectionsCol(tripId: string) {
  return collection(firestore, "sharedTrips", tripId, "wishSelections");
}
function wishSelectionDocRef(tripId: string, id: string) {
  return doc(firestore, "sharedTrips", tripId, "wishSelections", id);
}

export async function pushSelection(sel: TripWishSelection, uid: string): Promise<void> {
  const tripKey = await getTripKey(sel.tripId, uid);
  if (!tripKey) { console.warn("[wish-sync] pushSelection: no trip key for", sel.tripId); return; }
  // Stamped at push time (not creation) — see TripWishSelection.authorUid docs.
  const encryptedPayload = await encrypt({ ...sel, authorUid: uid }, tripKey);
  await setDoc(wishSelectionDocRef(sel.tripId, sel.id), {
    id: sel.id,
    encryptedPayload,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteSelectionRemote(selId: string, uid: string, tripId: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  await setDoc(wishSelectionDocRef(tripId, selId), {
    id: selId,
    encryptedPayload: "",
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
  }, { merge: true });
}

async function pullWishSelectionsForTrip(tripId: string, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  const snapshot = await getDocs(wishSelectionsCol(tripId));
  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedWishDoc;
    if (remote.deletedAt) { await db.tripWishSelections.delete(remote.id); continue; }
    const decrypted = await decrypt<TripWishSelection>(remote.encryptedPayload, tripKey);
    if (!decrypted) continue;
    const local = await db.tripWishSelections.get(remote.id);
    const localTime = localUpdatedAtISO(local?.updatedAt);
    if (!local || remote.updatedAt > localTime) {
      await db.tripWishSelections.put(decrypted);
    }
  }
}

function subscribeToWishSelectionsForTrip(tripId: string, uid: string): Unsubscribe {
  let _key: Uint8Array | null = null;
  return onSnapshot(
    wishSelectionsCol(tripId),
    async (snapshot) => {
      try {
        if (!_key) _key = await getTripKey(tripId, uid);
        if (!_key) return;
        const key = _key;
        for (const change of snapshot.docChanges()) {
          const remote = change.doc.data() as SyncedWishDoc;
          if (change.type === "removed" || remote.deletedAt) {
            await db.tripWishSelections.delete(remote.id); continue;
          }
          const decrypted = await decrypt<TripWishSelection>(remote.encryptedPayload, key);
          if (!decrypted) continue;
          const local = await db.tripWishSelections.get(remote.id);
          const localTime = localUpdatedAtISO(local?.updatedAt);
          if (!local || remote.updatedAt > localTime) {
            await db.tripWishSelections.put(decrypted);
            console.log("[wish-sync] applied selection:", remote.id.slice(-16));
          }
        }
      } catch (err) {
        console.error("[wish-sync] selections snapshot error:", err);
        _key = null;
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] selections listener error:", err); }
  );
}

// ==================== TRIP WISH CONTENT MIRROR ====================
//
// wishSelections only stores a reference (wishId) — the actual wish content
// lives in users/{uid}/wishes, readable only by the account that created it
// (see firestore.rules users/{uid} rule). Without a mirror, anything an
// Editor adds would be invisible to every other member. This is a per-trip
// copy of the wish, encrypted with the TRIP key (not the author's account
// key) so any current member can decrypt it. No photo stripping here —
// matches pushWish's existing account-level behavior (unlike day items and
// packing items, wishes have never stripped photos before syncing).

function wishMirrorCol(tripId: string) {
  return collection(firestore, "sharedTrips", tripId, "wishes");
}
function wishMirrorDocRef(tripId: string, wishId: string) {
  return doc(firestore, "sharedTrips", tripId, "wishes", wishId);
}

export async function pushWishMirror(tripId: string, wish: Wish, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) { console.warn("[wish-sync] pushWishMirror: no trip key for", tripId); return; }
  const encryptedPayload = await encrypt(wish, tripKey);
  await setDoc(wishMirrorDocRef(tripId, wish.id), {
    id: wish.id,
    encryptedPayload,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteWishMirrorRemote(tripId: string, wishId: string, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  await setDoc(wishMirrorDocRef(tripId, wishId), {
    id: wishId,
    encryptedPayload: "",
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
  }, { merge: true });
}

async function pullWishMirrorForTrip(tripId: string, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  const snapshot = await getDocs(wishMirrorCol(tripId));
  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedWishDoc;
    // A mirror tombstone means "no longer part of this trip", not "the wish
    // doesn't exist" — db.wishes is a shared, un-trip-scoped table, and the
    // account-level pullWishes/subscribeToWishes already own the real
    // delete-from-catalog signal. Removing it here on every unselect would
    // wrongly wipe it out from other trips or the owner's own catalog.
    if (remote.deletedAt) continue;
    const decrypted = await decrypt<Wish>(remote.encryptedPayload, tripKey);
    if (!decrypted) continue;
    const local = await db.wishes.get(remote.id);
    const localTime = localUpdatedAtISO(local?.updatedAt);
    if (!local || remote.updatedAt > localTime) {
      await db.wishes.put({ ...decrypted, pendingSync: 0 } as Wish);
    }
  }
}

function subscribeToWishMirrorForTrip(tripId: string, uid: string): Unsubscribe {
  let _key: Uint8Array | null = null;
  return onSnapshot(
    wishMirrorCol(tripId),
    async (snapshot) => {
      try {
        if (!_key) _key = await getTripKey(tripId, uid);
        if (!_key) return;
        const key = _key;
        for (const change of snapshot.docChanges()) {
          const remote = change.doc.data() as SyncedWishDoc;
          if (change.type === "removed" || remote.deletedAt) continue;
          const decrypted = await decrypt<Wish>(remote.encryptedPayload, key);
          if (!decrypted) continue;
          const local = await db.wishes.get(remote.id);
          const localTime = localUpdatedAtISO(local?.updatedAt);
          if (!local || remote.updatedAt > localTime) {
            await db.wishes.put({ ...decrypted, pendingSync: 0 } as Wish);
            console.log("[wish-sync] applied wish mirror:", decrypted.title);
          }
        }
      } catch (err) {
        console.error("[wish-sync] wish mirror snapshot error:", err);
        _key = null;
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] wish mirror listener error:", err); }
  );
}

// ==================== TRIP USERS ====================
// Syncs Trip User profiles (name/color/role) — see SyncedTripUser in
// shared/sync/firestore-schema.ts for the reconciliation rules this
// implements (id-match wins, name-match skips to avoid a duplicate,
// deletes are synced as a name-verified tombstone).

function tripUsersCol(uid: string) {
  return collection(firestore, "users", uid, "tripUsers");
}
function tripUserDocRef(uid: string, id: string) {
  return doc(firestore, "users", uid, "tripUsers", id);
}

export async function pushTripUser(user: User, uid: string): Promise<void> {
  const key = await getKey(uid);
  const payload: SyncedTripUser = { id: user.id, name: user.name, color: user.color, role: user.role };
  const encryptedPayload = await encrypt(payload, key);
  await setDoc(tripUserDocRef(uid, user.id), {
    id: user.id,
    encryptedPayload,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Tombstone a trip user. Unlike deleteWishRemote, the payload is kept
 * populated (not cleared) so the receiving device can verify the local
 * profile it's about to delete is still the same person before doing so.
 */
export async function deleteTripUserRemote(user: User, uid: string): Promise<void> {
  const key = await getKey(uid);
  const payload: SyncedTripUser = { id: user.id, name: user.name, color: user.color, role: user.role };
  const encryptedPayload = await encrypt(payload, key);
  await setDoc(
    tripUserDocRef(uid, user.id),
    { id: user.id, encryptedPayload, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/**
 * Apply a decrypted remote trip user to local storage.
 * - Tombstoned (remote.deletedAt set): delete the local profile ONLY if it
 *   still exists and its name matches the tombstone's name — a mismatch
 *   means this id collided with a different local person, so skip and log
 *   rather than deleting the wrong profile. Never deletes user_primary.
 * - Local record with the same id: last-write-wins on updatedAt.
 * - No local record, but a local user already has the same name: skip —
 *   this is the cross-device id-collision case (Finding 2 in the sync
 *   analysis). Auto-merging risks silently combining two different family
 *   members who share a name, so we log and leave both sides as-is; the
 *   user can rename one profile to resolve it manually.
 * - Otherwise: create a new local user with the incoming id.
 */
async function applyRemoteTripUser(remote: SyncedWishDoc, decrypted: SyncedTripUser | null): Promise<void> {
  if (remote.deletedAt) {
    if (remote.id === "user_primary") return;
    const local = await db.users.get(remote.id);
    if (!local) return; // already gone locally
    if (!decrypted) return; // can't verify identity, skip for safety

    if (local.name.trim().toLowerCase() !== decrypted.name.trim().toLowerCase()) {
      console.warn(
        `[wish-sync] Trip user delete for "${decrypted.name}" (${remote.id}) doesn't match local name "${local.name}" — skipping to avoid deleting the wrong profile.`
      );
      return;
    }

    await db.tripWishSelections.where("userId").equals(remote.id).modify({ userId: "user_primary" });
    await db.tripPackingSelections.where("userId").equals(remote.id).modify({ userId: "user_primary" });
    await db.dayItems.where("userId").equals(remote.id).modify({ userId: "user_primary" });
    await db.users.delete(remote.id);
    return;
  }

  if (!decrypted) return;

  const local = await db.users.get(decrypted.id);
  const localTime = localUpdatedAtISO(local?.updatedAt);
  if (local && remote.updatedAt <= localTime) return;

  if (local) {
    await db.users.update(decrypted.id, {
      name: decrypted.name,
      color: decrypted.color,
      role: decrypted.role,
      updatedAt: Date.now(),
    });
    return;
  }

  const allLocal = await db.users.toArray();
  const nameCollision = allLocal.find(
    (u) => u.name.trim().toLowerCase() === decrypted.name.trim().toLowerCase()
  );
  if (nameCollision) {
    console.warn(
      `[wish-sync] Trip user "${decrypted.name}" (${decrypted.id}) collides by name with local user ${nameCollision.id} — skipping to avoid a duplicate profile.`
    );
    return;
  }

  if (allLocal.length >= 6) {
    console.warn(`[wish-sync] Skipping synced trip user "${decrypted.name}" — already at the 6-user limit.`);
    return;
  }

  await db.users.add({
    id: decrypted.id,
    name: decrypted.name,
    color: decrypted.color,
    role: decrypted.role,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncedFromMobile: true,
  });
}

export async function pullTripUsers(uid: string): Promise<void> {
  const key = await getKey(uid);
  const snapshot = await getDocs(tripUsersCol(uid));
  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedWishDoc;
    const decrypted = remote.encryptedPayload ? await decrypt<SyncedTripUser>(remote.encryptedPayload, key) : null;
    if (!remote.deletedAt && !decrypted) continue;
    await applyRemoteTripUser(remote, decrypted);
  }
}

function subscribeToTripUsers(uid: string): Unsubscribe {
  let _key: Uint8Array | null = null;
  return onSnapshot(
    tripUsersCol(uid),
    async (snapshot) => {
      try {
        if (!_key) _key = await getKey(uid);
        const key = _key;
        for (const change of snapshot.docChanges()) {
          const remote = change.doc.data() as SyncedWishDoc;
          if (change.type === "removed") continue;
          const decrypted = remote.encryptedPayload
            ? await decrypt<SyncedTripUser>(remote.encryptedPayload, key)
            : null;
          if (!remote.deletedAt && !decrypted) continue;
          await applyRemoteTripUser(remote, decrypted);
          console.log("[wish-sync] applied tripUser:", decrypted?.name ?? remote.id);
        }
      } catch (err) {
        console.error("[wish-sync] tripUsers snapshot error:", err);
        _key = null;
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] tripUsers listener error:", err); }
  );
}

// ==================== DAY ITEMS ====================

function dayItemsCol(tripId: string) {
  return collection(firestore, "sharedTrips", tripId, "dayItems");
}
function dayItemDocRef(tripId: string, id: string) {
  return doc(firestore, "sharedTrips", tripId, "dayItems", id);
}

/** Strip photos before syncing — base64 blobs are too large for Firestore and
 *  are excluded from cloud sync per the privacy policy. */
function stripPhotos(item: DayItemRecord): DayItemRecord {
  const { photos: _photos, ...rest } = item;
  return rest as DayItemRecord;
}

export async function pushDayItem(item: DayItemRecord, uid: string): Promise<void> {
  const tripKey = await getTripKey(item.tripId, uid);
  if (!tripKey) { console.warn("[wish-sync] pushDayItem: no trip key for", item.tripId); return; }
  // Stamped at push time (not creation) — see TripWishSelection.authorUid docs.
  const encryptedPayload = await encrypt({ ...stripPhotos(item), authorUid: uid }, tripKey);
  await setDoc(dayItemDocRef(item.tripId, item.id), {
    id: item.id,
    encryptedPayload,
    updatedAt: new Date(item.updatedAt).toISOString(),
  });
}

export async function deleteDayItemRemote(id: string, uid: string, tripId: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  await setDoc(dayItemDocRef(tripId, id), {
    id,
    encryptedPayload: "",
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
  }, { merge: true });
}

async function pullDayItemsForTrip(tripId: string, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  const snapshot = await getDocs(dayItemsCol(tripId));
  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedWishDoc;
    if (remote.deletedAt) { await db.dayItems.delete(remote.id); continue; }
    const decrypted = await decrypt<DayItemRecord>(remote.encryptedPayload, tripKey);
    if (!decrypted) continue;
    const local = await db.dayItems.get(remote.id);
    const localTime = localUpdatedAtISO(local?.updatedAt);
    if (!local || remote.updatedAt > localTime) {
      // Preserve local photos — remote never carries them. Stamp tripId from
      // the collection path, not the payload — mobile-authored items never
      // carry one (mobile has no trip concept), so trusting the payload
      // left them un-indexed and invisible in the [tripId+date] query.
      await db.dayItems.put({ ...decrypted, tripId, photos: local?.photos });
    }
  }
}

function subscribeToDayItemsForTrip(tripId: string, uid: string): Unsubscribe {
  let _key: Uint8Array | null = null;
  return onSnapshot(
    dayItemsCol(tripId),
    async (snapshot) => {
      try {
        if (!_key) _key = await getTripKey(tripId, uid);
        if (!_key) return;
        const key = _key;
        for (const change of snapshot.docChanges()) {
          const remote = change.doc.data() as SyncedWishDoc;
          if (change.type === "removed" || remote.deletedAt) {
            await db.dayItems.delete(remote.id); continue;
          }
          const decrypted = await decrypt<DayItemRecord>(remote.encryptedPayload, key);
          if (!decrypted) continue;
          const local = await db.dayItems.get(remote.id);
          const localTime = localUpdatedAtISO(local?.updatedAt);
          if (!local || remote.updatedAt > localTime) {
            // See the matching comment in pullDayItemsForTrip — tripId comes
            // from the collection path, not the (possibly mobile-authored,
            // tripId-less) decrypted payload.
            await db.dayItems.put({ ...decrypted, tripId, photos: local?.photos });
            console.log("[wish-sync] applied dayItem:", decrypted.title);
          }
        }
      } catch (err) {
        console.error("[wish-sync] dayItems snapshot error:", err);
        _key = null;
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] dayItems listener error:", err); }
  );
}

// ==================== GPS TRAILS (Phase 3B) ====================
//
// Only the mobile app has GPS hardware, so content is one-way: mobile pushes
// (utils/WishSyncManager.ts pushTrailNow), the PWA pulls/subscribes but never
// writes trail content back. Trails are always pushed as the full
// accumulated day, so there's no field-level merge to do — the latest
// remote write always simply replaces the local copy.
//
// Deletion is a deliberate, narrow exception: the PWA's TrailGallery is the
// only place a trail is ever viewed, so it's also where a user deletes one
// (deleteTrailRemote below) — independent of which device recorded it.

function trailsCol(tripId: string) {
  return collection(firestore, "sharedTrips", tripId, "trails");
}
function trailDocRef(tripId: string, id: string) {
  return doc(firestore, "sharedTrips", tripId, "trails", id);
}

interface TrailPayload {
  id: string;
  date: string;
  userId: string;
  resolution: "high" | "medium" | "low";
  points: Array<{ latitude: number; longitude: number; timestamp: number; accuracy: number }>;
  distanceMiles: number;
  durationMinutes: number;
  pointCount: number;
}

export async function deleteTrailRemote(tripId: string, trailId: string, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  await setDoc(trailDocRef(tripId, trailId), {
    id: trailId,
    encryptedPayload: "",
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
  }, { merge: true });
}

async function applyRemoteTrail(tripId: string, tripKey: Uint8Array, remote: SyncedWishDoc): Promise<void> {
  if (remote.deletedAt) {
    // The Firestore doc's plaintext id is "{date}__{userId}", and the Dexie
    // id is "{tripId}__{date}__{userId}" — reconstructable without
    // decrypting, same pattern as photo metadata above.
    await db.trails.delete(`${tripId}__${remote.id}`);
    return;
  }
  const decrypted = await decrypt<TrailPayload>(remote.encryptedPayload, tripKey);
  if (!decrypted) return;
  await db.trails.put({
    id: `${tripId}__${decrypted.date}__${decrypted.userId}`,
    tripId,
    userId: decrypted.userId,
    date: decrypted.date,
    resolution: decrypted.resolution,
    points: decrypted.points,
    distanceMiles: decrypted.distanceMiles,
    durationMinutes: decrypted.durationMinutes,
    pointCount: decrypted.pointCount,
    importedAt: Date.now(),
  });
}

async function pullTrailsForTrip(tripId: string, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  const snapshot = await getDocs(trailsCol(tripId));
  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedWishDoc;
    await applyRemoteTrail(tripId, tripKey, remote);
  }
}

function subscribeToTrailsForTrip(tripId: string, uid: string): Unsubscribe {
  let _key: Uint8Array | null = null;
  return onSnapshot(
    trailsCol(tripId),
    async (snapshot) => {
      try {
        if (!_key) _key = await getTripKey(tripId, uid);
        if (!_key) return;
        const key = _key;
        for (const change of snapshot.docChanges()) {
          if (change.type === "removed") continue;
          const remote = change.doc.data() as SyncedWishDoc;
          await applyRemoteTrail(tripId, key, remote);
        }
      } catch (err) {
        console.error("[wish-sync] trails snapshot error:", err);
        _key = null;
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] trails listener error:", err); }
  );
}

// ==================== PHOTO METADATA (Phase 3C) — pull/subscribe only ====================
//
// Never the image bytes — id/itemId/itemType/timestamp/location only.
// Mobile-authored only (utils/WishSyncManager.ts pushPhotoMetadataNow); the
// PWA pulls/subscribes but never writes back. Same always-replace merge
// policy as trails — there's no local-only field to preserve, so the latest
// remote write simply replaces the local copy.

function photosCol(tripId: string) {
  return collection(firestore, "sharedTrips", tripId, "photos");
}

interface PhotoMetadataPayload {
  id: string;
  itemId: string;
  itemType: string;
  userId: string;
  date: string;
  takenAt?: string;
  location?: { lat: number; lng: number } | null;
}

async function applyRemotePhotoMetadata(tripId: string, tripKey: Uint8Array, remote: SyncedWishDoc): Promise<void> {
  if (remote.deletedAt) {
    // The Firestore doc's plaintext id IS the photoId (no decryption needed
    // to know which local record to remove — see pushPhotoMetadataNow).
    await db.photoMetadata.delete(`${tripId}__${remote.id}`);
    return;
  }
  const decrypted = await decrypt<PhotoMetadataPayload>(remote.encryptedPayload, tripKey);
  if (!decrypted) return;
  await db.photoMetadata.put({
    id: `${tripId}__${decrypted.id}`,
    tripId,
    photoId: decrypted.id,
    itemId: decrypted.itemId,
    itemType: decrypted.itemType,
    userId: decrypted.userId,
    date: decrypted.date,
    takenAt: decrypted.takenAt,
    location: decrypted.location,
    importedAt: Date.now(),
  });
}

async function pullPhotoMetadataForTrip(tripId: string, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  const snapshot = await getDocs(photosCol(tripId));
  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedWishDoc;
    await applyRemotePhotoMetadata(tripId, tripKey, remote);
  }
}

function subscribeToPhotoMetadataForTrip(tripId: string, uid: string): Unsubscribe {
  let _key: Uint8Array | null = null;
  return onSnapshot(
    photosCol(tripId),
    async (snapshot) => {
      try {
        if (!_key) _key = await getTripKey(tripId, uid);
        if (!_key) return;
        const key = _key;
        for (const change of snapshot.docChanges()) {
          if (change.type === "removed") continue;
          const remote = change.doc.data() as SyncedWishDoc;
          await applyRemotePhotoMetadata(tripId, key, remote);
        }
      } catch (err) {
        console.error("[wish-sync] photo metadata snapshot error:", err);
        _key = null;
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] photo metadata listener error:", err); }
  );
}

// ==================== PACKING ITEMS ====================

function packingItemsCol(uid: string) {
  return collection(firestore, "users", uid, "packingItems");
}
function packingItemDocRef(uid: string, id: string) {
  return doc(firestore, "users", uid, "packingItems", id);
}

function packingSelectionsCol(tripId: string) {
  return collection(firestore, "sharedTrips", tripId, "packingSelections");
}
function packingSelectionDocRef(tripId: string, id: string) {
  return doc(firestore, "sharedTrips", tripId, "packingSelections", id);
}

/** Strip full/display photos before syncing — only thumbnail (300px) travels.
 *  Legacy `photos` array is also stripped per privacy policy. */
function stripPackingPhotos(item: PackingItem): PackingItem {
  const thumbnailOnly = item.photoSets?.map((ps) => ({
    thumbnail: ps.thumbnail,
    display: "",
    full: "",
  }));
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    notes: item.notes,
    category: item.category,
    priority: item.priority,
    price: item.price,
    url: item.url,
    linkedWishIds: item.linkedWishIds,
    linkedParkDataIds: item.linkedParkDataIds,
    reservationTime: item.reservationTime,
    reservationConfirmation: item.reservationConfirmation,
    partySize: item.partySize,
    diningType: item.diningType,
    dietaryNotes: item.dietaryNotes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    photoSets: thumbnailOnly?.length ? thumbnailOnly : undefined,
  };
}

export async function pushPackingItem(item: PackingItem, uid: string): Promise<void> {
  const key = await getKey(uid);
  const encryptedPayload = await encrypt(stripPackingPhotos(item), key);
  await setDoc(packingItemDocRef(uid, item.id), {
    id: item.id,
    encryptedPayload,
    updatedAt: new Date(item.updatedAt).toISOString(),
  });
}

export async function deletePackingItemRemote(id: string, uid: string): Promise<void> {
  await setDoc(packingItemDocRef(uid, id), {
    id,
    encryptedPayload: "",
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function pullPackingItems(uid: string): Promise<void> {
  const key = await getKey(uid);
  const snapshot = await getDocs(packingItemsCol(uid));
  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedWishDoc;
    if (remote.deletedAt) {
      await db.packingItems.delete(remote.id);
      await db.tripPackingSelections.where("itemId").equals(remote.id).delete();
      continue;
    }
    const decrypted = await decrypt<PackingItem>(remote.encryptedPayload, key);
    if (!decrypted) continue;
    const local = await db.packingItems.get(remote.id);
    const localTime = localUpdatedAtISO(local?.updatedAt);
    if (!local || remote.updatedAt > localTime) {
      // Preserve local full/display photos — remote only carries thumbnails
      const mergedPhotoSets = decrypted.photoSets?.map((remote_set, idx) => ({
        ...remote_set,
        display: local?.photoSets?.[idx]?.display ?? remote_set.display,
        full:    local?.photoSets?.[idx]?.full    ?? remote_set.full,
      }));
      await db.packingItems.put({
        ...decrypted,
        photos:    local?.photos,
        photoSets: mergedPhotoSets?.length ? mergedPhotoSets : decrypted.photoSets,
      });
    }
  }
}

function subscribeToPackingItems(uid: string): Unsubscribe {
  let _key: Uint8Array | null = null;
  return onSnapshot(
    packingItemsCol(uid),
    async (snapshot) => {
      try {
        if (!_key) _key = await getKey(uid);
        const key = _key;
        for (const change of snapshot.docChanges()) {
          const remote = change.doc.data() as SyncedWishDoc;
          if (change.type === "removed" || remote.deletedAt) {
            await db.packingItems.delete(remote.id);
            await db.tripPackingSelections.where("itemId").equals(remote.id).delete();
            continue;
          }
          const decrypted = await decrypt<PackingItem>(remote.encryptedPayload, key);
          if (!decrypted) continue;
          const local = await db.packingItems.get(remote.id);
          const localTime = localUpdatedAtISO(local?.updatedAt);
          if (!local || remote.updatedAt > localTime) {
            const mergedPhotoSets = decrypted.photoSets?.map((remote_set, idx) => ({
              ...remote_set,
              display: local?.photoSets?.[idx]?.display ?? remote_set.display,
              full:    local?.photoSets?.[idx]?.full    ?? remote_set.full,
            }));
            await db.packingItems.put({
              ...decrypted,
              photos:    local?.photos,
              photoSets: mergedPhotoSets?.length ? mergedPhotoSets : decrypted.photoSets,
            });
            console.log("[wish-sync] applied packingItem:", decrypted.name);
          }
        }
      } catch (err) {
        console.error("[wish-sync] packingItems snapshot error:", err);
        _key = null;
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] packingItems listener error:", err); }
  );
}

export async function pushPackingSelection(sel: TripPackingSelection, uid: string): Promise<void> {
  const tripKey = await getTripKey(sel.tripId, uid);
  if (!tripKey) { console.warn("[wish-sync] pushPackingSelection: no trip key for", sel.tripId); return; }
  // Stamped at push time (not creation) — see TripWishSelection.authorUid docs.
  const encryptedPayload = await encrypt({ ...sel, authorUid: uid }, tripKey);
  await setDoc(packingSelectionDocRef(sel.tripId, sel.id), {
    id: sel.id,
    encryptedPayload,
    updatedAt: new Date().toISOString(),
  });
}

export async function deletePackingSelectionRemote(id: string, uid: string, tripId: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  await setDoc(packingSelectionDocRef(tripId, id), {
    id,
    encryptedPayload: "",
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
  }, { merge: true });
}

async function pullPackingSelectionsForTrip(tripId: string, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  const snapshot = await getDocs(packingSelectionsCol(tripId));
  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedWishDoc;
    if (remote.deletedAt) { await db.tripPackingSelections.delete(remote.id); continue; }
    const decrypted = await decrypt<TripPackingSelection>(remote.encryptedPayload, tripKey);
    if (!decrypted) continue;
    const local = await db.tripPackingSelections.get(remote.id);
    const localTime = localUpdatedAtISO(local?.updatedAt);
    if (!local || remote.updatedAt > localTime) {
      await db.tripPackingSelections.put(decrypted);
    }
  }
}

function subscribeToPackingSelectionsForTrip(tripId: string, uid: string): Unsubscribe {
  let _key: Uint8Array | null = null;
  return onSnapshot(
    packingSelectionsCol(tripId),
    async (snapshot) => {
      try {
        if (!_key) _key = await getTripKey(tripId, uid);
        if (!_key) return;
        const key = _key;
        for (const change of snapshot.docChanges()) {
          const remote = change.doc.data() as SyncedWishDoc;
          if (change.type === "removed" || remote.deletedAt) {
            await db.tripPackingSelections.delete(remote.id); continue;
          }
          const decrypted = await decrypt<TripPackingSelection>(remote.encryptedPayload, key);
          if (!decrypted) continue;
          const local = await db.tripPackingSelections.get(remote.id);
          const localTime = localUpdatedAtISO(local?.updatedAt);
          if (!local || remote.updatedAt > localTime) {
            await db.tripPackingSelections.put(decrypted);
            console.log("[wish-sync] applied packingSelection:", remote.id.slice(-16));
          }
        }
      } catch (err) {
        console.error("[wish-sync] packingSelections snapshot error:", err);
        _key = null;
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] packingSelections listener error:", err); }
  );
}

// ==================== TRIP PACKING ITEM CONTENT MIRROR ====================
// Same rationale as the wish mirror above — packingSelections is only a
// reference (itemId); the actual item lives in users/{uid}/packingItems,
// readable only by its creator. This is a per-trip copy encrypted with the
// trip key. Reuses stripPackingPhotos — thumbnail only, same as the
// account-level push.

function packingItemMirrorCol(tripId: string) {
  return collection(firestore, "sharedTrips", tripId, "packingItems");
}
function packingItemMirrorDocRef(tripId: string, itemId: string) {
  return doc(firestore, "sharedTrips", tripId, "packingItems", itemId);
}

export async function pushPackingItemMirror(tripId: string, item: PackingItem, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) { console.warn("[wish-sync] pushPackingItemMirror: no trip key for", tripId); return; }
  const encryptedPayload = await encrypt(stripPackingPhotos(item), tripKey);
  await setDoc(packingItemMirrorDocRef(tripId, item.id), {
    id: item.id,
    encryptedPayload,
    updatedAt: new Date(item.updatedAt).toISOString(),
  });
}

export async function deletePackingItemMirrorRemote(tripId: string, itemId: string, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  await setDoc(packingItemMirrorDocRef(tripId, itemId), {
    id: itemId,
    encryptedPayload: "",
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
  }, { merge: true });
}

async function pullPackingItemMirrorForTrip(tripId: string, uid: string): Promise<void> {
  const tripKey = await getTripKey(tripId, uid);
  if (!tripKey) return;
  const snapshot = await getDocs(packingItemMirrorCol(tripId));
  for (const docSnap of snapshot.docs) {
    const remote = docSnap.data() as SyncedWishDoc;
    if (remote.deletedAt) continue; // see wish mirror note — not a real delete signal
    const decrypted = await decrypt<PackingItem>(remote.encryptedPayload, tripKey);
    if (!decrypted) continue;
    const local = await db.packingItems.get(remote.id);
    const localTime = localUpdatedAtISO(local?.updatedAt);
    if (!local || remote.updatedAt > localTime) {
      const mergedPhotoSets = decrypted.photoSets?.map((remote_set, idx) => ({
        ...remote_set,
        display: local?.photoSets?.[idx]?.display ?? remote_set.display,
        full:    local?.photoSets?.[idx]?.full    ?? remote_set.full,
      }));
      await db.packingItems.put({
        ...decrypted,
        photos:    local?.photos,
        photoSets: mergedPhotoSets?.length ? mergedPhotoSets : decrypted.photoSets,
      });
    }
  }
}

function subscribeToPackingItemMirrorForTrip(tripId: string, uid: string): Unsubscribe {
  let _key: Uint8Array | null = null;
  return onSnapshot(
    packingItemMirrorCol(tripId),
    async (snapshot) => {
      try {
        if (!_key) _key = await getTripKey(tripId, uid);
        if (!_key) return;
        const key = _key;
        for (const change of snapshot.docChanges()) {
          const remote = change.doc.data() as SyncedWishDoc;
          if (change.type === "removed" || remote.deletedAt) continue;
          const decrypted = await decrypt<PackingItem>(remote.encryptedPayload, key);
          if (!decrypted) continue;
          const local = await db.packingItems.get(remote.id);
          const localTime = localUpdatedAtISO(local?.updatedAt);
          if (!local || remote.updatedAt > localTime) {
            const mergedPhotoSets = decrypted.photoSets?.map((remote_set, idx) => ({
              ...remote_set,
              display: local?.photoSets?.[idx]?.display ?? remote_set.display,
              full:    local?.photoSets?.[idx]?.full    ?? remote_set.full,
            }));
            await db.packingItems.put({
              ...decrypted,
              photos:    local?.photos,
              photoSets: mergedPhotoSets?.length ? mergedPhotoSets : decrypted.photoSets,
            });
            console.log("[wish-sync] applied packingItem mirror:", decrypted.name);
          }
        }
      } catch (err) {
        console.error("[wish-sync] packingItem mirror snapshot error:", err);
        _key = null;
      }
    },
    (err) => { if (!_stopping) console.error("[wish-sync] packingItem mirror listener error:", err); }
  );
}

// ==================== MARK PENDING ====================

/**
 * Mark a wish as needing sync. Call this alongside every local Dexie write
 * so the flush queue picks it up on next sync cycle.
 */
export async function markWishPending(wishId: string): Promise<void> {
  await db.wishes.update(wishId, { pendingSync: 1 } as Partial<Wish>);
}

// ==================== SYNC ENGINE ====================

let _unsubscribeWishes:          Unsubscribe | null = null;
let _unsubscribeSharedTrips:     Unsubscribe | null = null;
let _unsubscribePackingItems:    Unsubscribe | null = null;
let _unsubscribeTripUsers:       Unsubscribe | null = null;
let _stopping = false; // suppresses permission-denied errors during intentional sign-out

/** Pull wishSelections/packingSelections/dayItems and their content mirrors
 *  for a known set of trips. Used by startSync (after pullSharedTrips
 *  resolves membership) and by AppInit's focus-pull (which already knows
 *  the locally cached trip ids). */
export async function pullAllTripContent(uid: string, tripIds: string[]): Promise<void> {
  await Promise.allSettled(
    tripIds.flatMap((tripId) => [
      pullWishSelectionsForTrip(tripId, uid),
      pullPackingSelectionsForTrip(tripId, uid),
      pullDayItemsForTrip(tripId, uid),
      pullWishMirrorForTrip(tripId, uid),
      pullPackingItemMirrorForTrip(tripId, uid),
      pullTrailsForTrip(tripId, uid),
      pullPhotoMetadataForTrip(tripId, uid),
    ])
  );
}

/**
 * Pull + self-heal-push + subscribe to every shared trip this uid belongs
 * to. This is the trip-collaboration half of sync — it works for ANY
 * signed-in identity (Apple, Google, email link, or bare anonymous), unlike
 * the account catalog below which stays Apple-only. Shared between
 * startSync() (full) and startCollaboratorSync() (trip content only, for
 * non-Apple members participating in someone else's trip).
 */
async function startTripCollaboration(uid: string): Promise<void> {
  const tripIds = await pullSharedTrips(uid).catch((err) => {
    console.error("[wish-sync] pullSharedTrips failed:", err);
    return [] as string[];
  });
  const pullContent = await Promise.allSettled([pullAllTripContent(uid, tripIds)]);
  console.log("[wish-sync] pull — sharedTrips:", tripIds.length, "content:", pullContent[0].status);

  // Push everything local so nothing added while offline is lost.
  // A trip missing `members` predates this sync model — create it fresh
  // (generates its key + owner membership) instead of pushing content-only.
  // For a non-owner this fails safely (permission-denied, caught below).
  const [trips, selections, dayItems, packingSelections, wishes, packingItems] = await Promise.all([
    db.trips.toArray(),
    db.tripWishSelections.toArray(),
    db.dayItems.toArray(),
    db.tripPackingSelections.toArray(),
    db.wishes.toArray(),
    db.packingItems.toArray(),
  ]);
  const wishById = new Map(wishes.map(w => [w.id, w]));
  const packingItemById = new Map(packingItems.map(p => [p.id, p]));

  await Promise.allSettled([
    ...trips.map(t => (t.members ? pushTrip(t, uid) : createSharedTrip(t, uid))),
    ...selections.map(s => pushSelection(s, uid)),
    ...selections.flatMap(s => {
      const wish = wishById.get(s.wishId);
      return wish ? [pushWishMirror(s.tripId, wish, uid)] : [];
    }),
    ...dayItems.map(d => pushDayItem(d, uid)),
    ...packingSelections.map(ps => pushPackingSelection(ps, uid)),
    ...packingSelections.flatMap(ps => {
      const item = packingItemById.get(ps.itemId);
      return item ? [pushPackingItemMirror(ps.tripId, item, uid)] : [];
    }),
  ]);
  console.log(`[wish-sync] pushed ${trips.length} trips, ${selections.length} selections, ${dayItems.length} dayItems, ${packingSelections.length} packingSelections`);

  // subscribeToSharedTrips manages per-trip content listeners (selections,
  // day items, mirrors) internally as this account's membership changes.
  _unsubscribeSharedTrips = subscribeToSharedTrips(uid);
}

/**
 * Start the FULL sync engine — this account's own wish/packing catalog
 * (Apple-only) plus every shared trip it belongs to. Safe to call multiple
 * times — tears down previous listeners first.
 */
export async function startSync(): Promise<void> {
  const user = auth.currentUser;
  if (!user || !isSyncEnabled(user)) {
    console.log("[wish-sync] startSync skipped — no sync-enabled user");
    return;
  }

  const uid = user.uid;
  console.log("[wish-sync] startSync starting for uid tail:", uid.slice(-8));

  stopSync();

  // Pushing everything (not just pendingSync items) is intentional:
  //   - pendingSync isn't an indexed Dexie field so where() on it is unreliable
  //   - items added while sync was disabled are NOT marked pending
  //   - a full push is idempotent and self-healing for any missed writes
  const [pullW, pullPI, pullU] = await Promise.allSettled([
    pullWishes(uid), pullPackingItems(uid), pullTripUsers(uid),
  ]);
  console.log("[wish-sync] pull — wishes:", pullW.status, "packingItems:", pullPI.status, "tripUsers:", pullU.status);

  const [wishes, packingItems, tripUsers] = await Promise.all([
    db.wishes.toArray(), db.packingItems.toArray(), db.users.toArray(),
  ]);
  await Promise.allSettled([
    ...wishes.map(w => pushWish(w, uid)),
    ...packingItems.map(p => pushPackingItem(p, uid)),
    ...tripUsers.map(u => pushTripUser(u, uid)),
  ]);
  console.log(`[wish-sync] pushed ${wishes.length} wishes, ${packingItems.length} packingItems, ${tripUsers.length} tripUsers`);

  await startTripCollaboration(uid);

  _unsubscribeWishes       = subscribeToWishes(uid);
  _unsubscribePackingItems = subscribeToPackingItems(uid);
  _unsubscribeTripUsers    = subscribeToTripUsers(uid);
  console.log("[wish-sync] all listeners started");
}

/**
 * Start sync for a non-Apple collaborator (Google, email link, or a bare
 * anonymous session) — shared-trip content only, never this account's own
 * wish/packing catalog. If this account IS Apple-verified, defers entirely
 * to startSync(), which already covers everything here.
 */
export async function startCollaboratorSync(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.log("[wish-sync] startCollaboratorSync skipped — no user");
    return;
  }
  if (isSyncEnabled(user)) {
    await startSync();
    return;
  }

  console.log("[wish-sync] startCollaboratorSync starting for uid tail:", user.uid.slice(-8));
  stopSync();
  await startTripCollaboration(user.uid);
  console.log("[wish-sync] collaborator listeners started");
}

export function stopSync(): void {
  _stopping = true;
  _unsubscribeWishes?.();         _unsubscribeWishes         = null;
  _unsubscribeSharedTrips?.();    _unsubscribeSharedTrips    = null;
  _unsubscribePackingItems?.();   _unsubscribePackingItems   = null;
  _unsubscribeTripUsers?.();      _unsubscribeTripUsers      = null;
  unsubscribeAllTripContent();
  // Reset after a tick — any pending error callbacks will have fired by then
  setTimeout(() => { _stopping = false; }, 500);
}
