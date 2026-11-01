// ==================== TRIP COMPLETIONS (pure) ====================
// Whether a trip wish or packing item is done for an account, from its
// completion records (shared/types/completion.ts). An item is done for an
// account while it has a live record from either app; each app writes and
// clears only its own. No I/O: used by the Planner and Pal.
// Design: dland-wishes docs/completion-design.md.

import type { CompletionKind, CompletionSource, TripCompletion } from "./types/completion";

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

// ==================== READING ====================

/** The records for one item, from every account and app. */
export function completionsOf(completions: TripCompletion[], kind: CompletionKind, itemId: string): TripCompletion[] {
  return completions.filter((c) => c.kind === kind && c.itemId === itemId);
}

/** True when the account `uid` has done the item (a record from either app). */
export function isDoneFor(completions: TripCompletion[], kind: CompletionKind, itemId: string, uid: string): boolean {
  return completionsOf(completions, kind, itemId).some((c) => c.authorUid === uid);
}

/** The other accounts that have done the item, in the order they first did. */
export function othersDone(completions: TripCompletion[], kind: CompletionKind, itemId: string, uid: string): string[] {
  const others = completionsOf(completions, kind, itemId)
    .filter((c) => c.authorUid !== uid)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  return [...new Set(others.map((c) => c.authorUid))];
}

/**
 * The account's Pal record when only Pal has it ticked: the Planner can't
 * untick it, and says where it was ticked. Undefined otherwise.
 */
export function palOnlyCompletion(
  completions: TripCompletion[], kind: CompletionKind, itemId: string, uid: string,
): TripCompletion | undefined {
  const mine = completionsOf(completions, kind, itemId).filter((c) => c.authorUid === uid);
  if (mine.some((c) => c.source === "planner")) return undefined;
  return mine.find((c) => c.source === "pal");
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

/** A selection as the migration needs it: TripWishSelection or TripPackingSelection. */
interface MigratingSelection {
  tripId: string;
  completed: boolean;
  authorUid?: string;
  completedAt?: string;
}

/**
 * The Planner records that carry a trip's old shared ticks over, once: one
 * for each ticked selection this account has no record for yet, when this
 * account made the tick (it last pushed the selection, or the trip isn't
 * shared). Another household's old tick is theirs to carry over.
 */
export function migratedCompletions(
  kind: CompletionKind,
  selections: Array<MigratingSelection & { itemId: string }>,
  existing: TripCompletion[], uid: string, tripShared: boolean, now: Date,
): TripCompletion[] {
  return selections
    .filter((s) => s.completed && !isDoneFor(existing, kind, s.itemId, uid))
    .filter((s) => (s.authorUid ? s.authorUid === uid : !tripShared))
    .map((s) => ({
      id: completionDocId(kind, s.itemId, uid, "planner"), tripId: s.tripId, kind, itemId: s.itemId,
      authorUid: uid, source: "planner" as const,
      completedAt: s.completedAt ?? now.toISOString(), updatedAt: now.getTime(),
    }));
}
