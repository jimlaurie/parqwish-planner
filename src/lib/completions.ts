// ==================== TRIP COMPLETIONS (local) ====================
// "Done on this trip" ticks: one record per item, account and app in
// db.completions (shared/types/completion.ts), synced at
// sharedTrips/{tripId}/completions by wish-sync.ts. A household (accounts
// the trip's Owner grouped, else this account) has done an item while any
// of its accounts has a record; this Planner writes and clears only its own
// account's "planner" records. Pal writes "pal" ones from its day ticks.
//
// Selections keep a local `completed` (and a wish's status and completedAt)
// worked out from the records, so the many readers of it (filters, the
// Play pool, Publish, the PDF, exports) need no change. A pulled selection's
// own value is replaced; it says only what its pusher saw.
// Design: dland-wishes docs/completion-design.md.

import db, { type CompletionKind, type TripCompletion, type TripWishSelection, type TripPackingSelection, type WishStatus } from "@/lib/db";
import { auth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import {
  completionDocId, householdAccounts, householdTick, migratedCompletions, ticksPlannerCantClear,
} from "@shared/completions";

/** The account for ticks made without Cloud Sync; given the real uid when sync starts. */
export const LOCAL_ACCOUNT = "local";

const MIGRATED_PREFIX = "parqwish:completions:migrated:";

// ==================== ACCOUNT AND HOUSEHOLD ====================

/** This device's account for ticks: the signed-in uid with Cloud Sync on, else LOCAL_ACCOUNT. */
export function completionAccount(): string {
  const user = auth.currentUser;
  return useAppStore.getState().cloudSyncEnabled && user ? user.uid : LOCAL_ACCOUNT;
}

/** The accounts whose ticks count as this device's on a trip. */
export async function tripHousehold(tripId: string, account: string): Promise<string[]> {
  const trip = await db.trips.get(tripId);
  return householdAccounts(trip?.members, account);
}

// ==================== ONE-TIME CARRY-OVER ====================

function ticksMigrated(account: string): boolean {
  try {
    return localStorage.getItem(MIGRATED_PREFIX + account) === "done";
  } catch {
    return false; // can't remember: carrying over again only adopts ticks with no record
  }
}

function markTicksMigrated(account: string): void {
  try {
    localStorage.setItem(MIGRATED_PREFIX + account, "done");
  } catch {
    // Storage blocked: it runs again next time, which only adopts ticks with no record
  }
}

/**
 * Gives every ticked selection this account has no record for a Planner
 * record: once per account, for the ticks from before completion records
 * (every household carries over every old tick it sees), and after a sync
 * file brings ticks in. Then works out every selection's tick. Returns the
 * records written, for the caller to push.
 */
export async function carryOverTicks(account: string, opts: { once: boolean }): Promise<TripCompletion[]> {
  if (opts.once && ticksMigrated(account)) return [];
  const now = new Date();
  const [wishSels, packSels, existing] = await Promise.all([
    db.tripWishSelections.toArray(), db.tripPackingSelections.toArray(), db.completions.toArray(),
  ]);
  const written = [
    ...migratedCompletions("wish", wishSels.map((s) => ({ ...s, itemId: s.wishId })), existing, account, now),
    ...migratedCompletions("packing", packSels, existing, account, now),
  ];
  if (written.length) await db.completions.bulkPut(written);
  markTicksMigrated(account);
  const tripIds = new Set([...wishSels, ...packSels].map((s) => s.tripId));
  for (const tripId of tripIds) await refreshTicks(tripId, account);
  return written;
}

/** Gives ticks made without Cloud Sync to the account that just started syncing. Returns the new records. */
export async function claimLocalTicks(uid: string): Promise<TripCompletion[]> {
  const local = await db.completions.where("authorUid").equals(LOCAL_ACCOUNT).toArray();
  if (!local.length) return [];
  const claimed = local.map((c) => ({ ...c, id: completionDocId(c.kind, c.itemId, uid, c.source), authorUid: uid }));
  await db.transaction("rw", db.completions, async () => {
    await db.completions.bulkPut(claimed);
    await db.completions.bulkDelete(local.map((c) => c.id));
  });
  if (!ticksMigrated(uid) && ticksMigrated(LOCAL_ACCOUNT)) markTicksMigrated(uid);
  return claimed;
}

// ==================== WORKING OUT SELECTIONS' TICKS ====================

/** A wish selection's tick fields for done or not done (status follows, as the old toggle did). */
function wishTickFields(sel: TripWishSelection, tick: { completed: boolean; completedAt?: string }): Partial<TripWishSelection> {
  const status: WishStatus = tick.completed ? "completed" : sel.status === "completed" ? "idea" : sel.status;
  return { completed: tick.completed, completedAt: tick.completedAt, status };
}

const differs = (sel: object, fields: object): boolean =>
  Object.entries(fields).some(([k, v]) => (sel as Record<string, unknown>)[k] !== v);

/**
 * Sets the trip's selections' tick fields from its records, for every item
 * or just `only`. Leaves updatedAt alone: it's a local view, not an edit to
 * push. Waits until this account's old ticks have been carried over, so
 * they aren't cleared first.
 */
export async function refreshTicks(tripId: string, account: string, only?: { kind: CompletionKind; itemId: string }): Promise<void> {
  if (!ticksMigrated(account)) return;
  await db.transaction("rw", [db.trips, db.completions, db.tripWishSelections, db.tripPackingSelections], async () => {
    const household = await tripHousehold(tripId, account);
    const records = await db.completions.where("tripId").equals(tripId).toArray();
    if (!only || only.kind === "wish") {
      const sels = await db.tripWishSelections.where("tripId").equals(tripId).toArray();
      for (const sel of sels) {
        if (only && sel.wishId !== only.itemId) continue;
        const fields = wishTickFields(sel, householdTick(records, "wish", sel.wishId, household));
        if (differs(sel, fields)) await db.tripWishSelections.update(sel.id, fields);
      }
    }
    if (!only || only.kind === "packing") {
      const sels = await db.tripPackingSelections.where("tripId").equals(tripId).toArray();
      for (const sel of sels) {
        if (only && sel.itemId !== only.itemId) continue;
        const { completed } = householdTick(records, "packing", sel.itemId, household);
        if (sel.completed !== completed) await db.tripPackingSelections.update(sel.id, { completed });
      }
    }
  });
}

/** A pulled wish selection with this household's tick in place of its pusher's. */
export async function withHouseholdTick(sel: TripWishSelection): Promise<TripWishSelection> {
  const account = completionAccount();
  if (!ticksMigrated(account)) return sel;
  const [household, records] = await Promise.all([
    tripHousehold(sel.tripId, account), db.completions.where("tripId").equals(sel.tripId).toArray(),
  ]);
  return { ...sel, ...wishTickFields(sel, householdTick(records, "wish", sel.wishId, household)) };
}

/** A pulled packing selection with this household's "packed" in place of its pusher's. */
export async function withHouseholdPacked(sel: TripPackingSelection): Promise<TripPackingSelection> {
  const account = completionAccount();
  if (!ticksMigrated(account)) return sel;
  const [household, records] = await Promise.all([
    tripHousehold(sel.tripId, account), db.completions.where("tripId").equals(sel.tripId).toArray(),
  ]);
  return { ...sel, completed: householdTick(records, "packing", sel.itemId, household).completed };
}

// ==================== APPLYING CHANGES ====================

/** Saves or removes a pulled record (already validated), then updates its item's tick. */
export async function applyCompletion(tripId: string, docId: string, record: TripCompletion | null): Promise<void> {
  const local = await db.completions.get(docId);
  if (record) {
    if (local && local.updatedAt >= record.updatedAt) return;
    await db.completions.put(record);
  } else {
    if (!local) return;
    await db.completions.delete(docId);
  }
  const item = record ?? local!;
  await refreshTicks(tripId, completionAccount(), { kind: item.kind, itemId: item.itemId });
}

/** What a Planner tick did: records to push, the id to tombstone, and the household's ticks it couldn't clear. */
export interface PlannerTickResult {
  written: TripCompletion[];
  removedId?: string;
  remaining: TripCompletion[];
}

/**
 * Ticks or unticks an item for this account in the Planner. Ticking writes
 * this account's Planner record. Unticking removes it; the item stays done
 * while the household has others (this account's Pal, or another of its
 * accounts), which come back in `remaining` for the caller to explain.
 * Old ticks are carried over first if that hasn't happened on this device.
 */
export async function togglePlannerTick(tripId: string, kind: CompletionKind, itemId: string): Promise<PlannerTickResult> {
  const account = completionAccount();
  const carried = await carryOverTicks(account, { once: true });
  const household = await tripHousehold(tripId, account);
  const records = await db.completions.where("tripId").equals(tripId).toArray();
  const id = completionDocId(kind, itemId, account, "planner");
  const result: PlannerTickResult = { written: carried, remaining: ticksPlannerCantClear(records, kind, itemId, account, household) };
  if (householdTick(records, kind, itemId, household).completed) {
    if (records.some((c) => c.id === id)) {
      await db.completions.delete(id);
      result.removedId = id;
    }
  } else {
    const now = new Date();
    const record: TripCompletion = { id, tripId, kind, itemId, authorUid: account, source: "planner", completedAt: now.toISOString(), updatedAt: now.getTime() };
    await db.completions.put(record);
    result.written.push(record);
  }
  await refreshTicks(tripId, account, { kind, itemId });
  return result;
}
