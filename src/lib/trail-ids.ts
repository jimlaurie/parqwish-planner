// ==================== TRAIL IDS ====================
// A GPS trail belongs to one person on one day. A person is an account plus
// one of its Trip Users: "user_primary" exists on every account, so two
// collaborators recording the same day used to share an id and replace each
// other's trail. Synced trails are now keyed by account too:
//   Firestore  sharedTrips/{tripId}/trails/{date}__{authorUid}__{userId}
//   Dexie      {tripId}__{date}__{authorUid}__{userId}
// Pal before 1.1.0 wrote {date}__{userId} (with the account in the doc's
// plaintext authorUid), and older Planner copies are stored as
// {tripId}__{date}__{userId}; both are still read. Pure helpers.

import type { TripTrail } from "@/lib/db";

/** The Firestore doc id for a trail (without the account when it isn't known). */
export function trailDocId(date: string, userId: string, authorUid?: string): string {
  return authorUid ? `${date}__${authorUid}__${userId}` : `${date}__${userId}`;
}

/** The Dexie row id for a trail. */
export function trailRowId(tripId: string, date: string, userId: string, authorUid?: string): string {
  return `${tripId}__${trailDocId(date, userId, authorUid)}`;
}

/** The pre-account id an older copy of this trail may be stored under. */
export function legacyTrailRowId(tripId: string, date: string, userId: string): string {
  return trailRowId(tripId, date, userId);
}

type Recording = Pick<TripTrail, "date" | "userId" | "points">;

/**
 * Whether two rows hold the same recording (one possibly an older, shorter
 * copy): same day and Trip User, and the same first point. Used to drop an
 * older copy kept under the pre-account id once the keyed one arrives,
 * without touching a different recording that happens to share the old id.
 */
export function isSameRecording(a: Recording, b: Recording): boolean {
  return a.date === b.date && a.userId === b.userId
    && a.points.length > 0 && b.points.length > 0
    && a.points[0].timestamp === b.points[0].timestamp;
}
