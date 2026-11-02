// ==================== TRIP COMPLETIONS (pure) ====================
// Whether a trip wish or packing item is done for a household, from its
// completion records (shared/types/completion.ts). Each account writes and
// clears only its own records, one per app; a household (accounts the trip
// Owner grouped, e.g. a family with Pal on two phones, else one account)
// has done an item while any of its accounts has a live record. No I/O:
// used by the Planner and Pal. Design: dland-wishes docs/completion-design.md.
//
// The reading helpers take ONE trip's records: an item packed or done on
// one trip isn't on another. Filter by tripId first (found 1 Nov 2026,
// when Pal passed every trip's records and one trip's "packed" showed on all).

import type { CompletionKind, CompletionSource, TripCompletion } from "./types/completion";
import type { TripMember } from "./types/trip";

const KINDS: readonly CompletionKind[] = ["wish", "packing"];
const SOURCES: readonly CompletionSource[] = ["pal", "planner"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// ==================== IDS AND VALIDATION ====================

/** The record's id, which is also its Firestore document id. */
export function completionDocId(kind: CompletionKind, itemId: string, uid: string, source: CompletionSource): string {
  return `${kind}__${itemId}__${uid}__${source}`;
}

/**
 * Whether a pulled record is well formed and is what its document says it
 * is: the payload's id matches the document id and its fields, and its
 * account matches the plaintext authorUid the rules checked. A record that
 * fails is ignored, never applied.
 */
export function isValidCompletion(c: unknown, docId: string, docAuthorUid: string | undefined): c is TripCompletion {
  if (!c || typeof c !== "object") return false;
  const r = c as Partial<TripCompletion>;
  if (!r.kind || !KINDS.includes(r.kind) || !r.source || !SOURCES.includes(r.source)) return false;
  if (!r.itemId || !r.authorUid || !r.tripId || typeof r.completedAt !== "string") return false;
  if (r.dates !== undefined && !(Array.isArray(r.dates) && r.dates.every((d) => typeof d === "string" && DATE.test(d)))) return false;
  return r.id === docId && r.authorUid === docAuthorUid
    && completionDocId(r.kind, r.itemId, r.authorUid, r.source) === docId;
}

// ==================== HOUSEHOLDS ====================

/**
 * The accounts in `uid`'s household on a trip: those whose household
 * (`members[x].household`, else their own uid) is the same as uid's.
 * Always includes uid; just [uid] when the trip has no members (not
 * shared) or uid isn't one of them.
 */
export function householdAccounts(members: Record<string, Pick<TripMember, "household">> | undefined, uid: string): string[] {
  const own = members?.[uid];
  if (!members || !own) return [uid];
  const anchor = own.household ?? uid;
  const accounts = Object.keys(members).filter((id) => (members[id].household ?? id) === anchor);
  return accounts.includes(uid) ? accounts : [uid, ...accounts];
}

// ==================== READING ====================

/** The records for one item, from every account and app. */
export function completionsOf(completions: TripCompletion[], kind: CompletionKind, itemId: string): TripCompletion[] {
  return completions.filter((c) => c.kind === kind && c.itemId === itemId);
}

/** True when any of `accounts` (a household, or one account) has a record for the item, from either app. */
export function isDoneFor(completions: TripCompletion[], kind: CompletionKind, itemId: string, accounts: readonly string[]): boolean {
  return completionsOf(completions, kind, itemId).some((c) => accounts.includes(c.authorUid));
}

/** The accounts outside the household that have done the item, in the order they first did. */
export function othersDone(completions: TripCompletion[], kind: CompletionKind, itemId: string, household: readonly string[]): string[] {
  const others = completionsOf(completions, kind, itemId)
    .filter((c) => !household.includes(c.authorUid))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  return [...new Set(others.map((c) => c.authorUid))];
}

/**
 * The household's records that the Planner on account `uid` can't clear:
 * all of them except uid's own Planner record (uid's Pal, and the other
 * accounts' Pal and Planner). While any is left, unticking in the Planner
 * leaves the item done, and the Planner says where it was ticked.
 */
export function ticksPlannerCantClear(
  completions: TripCompletion[], kind: CompletionKind, itemId: string, uid: string, household: readonly string[],
): TripCompletion[] {
  return completionsOf(completions, kind, itemId)
    .filter((c) => household.includes(c.authorUid) && !(c.authorUid === uid && c.source === "planner"));
}

/**
 * What a selection's local `completed` and `completedAt` say for a
 * household: done, from its earliest record, or not done. The Planner keeps
 * these on its selections so its many readers (filters, Play pool, Publish,
 * PDF, exports) need no change; a pulled selection's own value is replaced.
 */
export function householdTick(
  completions: TripCompletion[], kind: CompletionKind, itemId: string, household: readonly string[],
): { completed: boolean; completedAt?: string } {
  const first = completionsOf(completions, kind, itemId)
    .filter((c) => household.includes(c.authorUid))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))[0];
  return first ? { completed: true, completedAt: first.completedAt } : { completed: false, completedAt: undefined };
}

// ==================== PAL ROLL-UP ====================

/** One of this account's Pal day ticks on a trip date, for an item on the trip. */
export interface PalTick {
  kind: CompletionKind;
  itemId: string;
  date: string;
}

/**
 * Pal's records for one trip against its day ticks: a record for each item
 * this account has ticked on any trip date (new, or with changed dates) and
 * the ids of its records with no tick left. `existing` may hold any records;
 * only this account's Pal ones for the trip are considered.
 */
export function palCompletionWrites(
  tripId: string, uid: string, ticks: PalTick[], existing: TripCompletion[], now: Date,
): { put: TripCompletion[]; remove: string[] } {
  const mine = new Map(existing
    .filter((c) => c.tripId === tripId && c.authorUid === uid && c.source === "pal")
    .map((c) => [c.id, c]));
  const datesById = new Map<string, { kind: CompletionKind; itemId: string; dates: Set<string> }>();
  for (const t of ticks) {
    const id = completionDocId(t.kind, t.itemId, uid, "pal");
    const entry = datesById.get(id) ?? { kind: t.kind, itemId: t.itemId, dates: new Set<string>() };
    entry.dates.add(t.date);
    datesById.set(id, entry);
  }
  const put: TripCompletion[] = [];
  for (const [id, { kind, itemId, dates }] of datesById) {
    const sorted = [...dates].sort();
    const prev = mine.get(id);
    if (prev && JSON.stringify(prev.dates ?? []) === JSON.stringify(sorted)) continue;
    put.push({
      id, tripId, kind, itemId, authorUid: uid, source: "pal",
      completedAt: prev?.completedAt ?? now.toISOString(), dates: sorted, updatedAt: now.getTime(),
    });
  }
  const remove = [...mine.keys()].filter((id) => !datesById.has(id));
  return { put, remove };
}

// ==================== MIGRATION ====================

/** A selection as the migration needs it: TripWishSelection or TripPackingSelection, with its item id. */
interface MigratingSelection {
  tripId: string;
  itemId: string;
  completed: boolean;
  completedAt?: string;
}

/**
 * The Planner records that carry the old shared ticks this account sees
 * over, once: one for each ticked selection it has no record for yet.
 * Every household carries over every old tick, since the old tick was
 * shared and a selection's authorUid only says who pushed it last (the
 * Planner re-pushed every selection at startup). Also used for ticks a
 * sync file brings in.
 */
export function migratedCompletions(
  kind: CompletionKind, selections: MigratingSelection[], existing: TripCompletion[], uid: string, now: Date,
): TripCompletion[] {
  return selections
    .filter((s) => s.completed && !isDoneFor(existing.filter((c) => c.tripId === s.tripId), kind, s.itemId, [uid]))
    .map((s) => ({
      id: completionDocId(kind, s.itemId, uid, "planner"), tripId: s.tripId, kind, itemId: s.itemId,
      authorUid: uid, source: "planner" as const,
      completedAt: s.completedAt ?? now.toISOString(), updatedAt: now.getTime(),
    }));
}
