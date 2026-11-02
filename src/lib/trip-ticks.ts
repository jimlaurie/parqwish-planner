// ==================== TRIP TICKS (Plan and Prepare) ====================
// The Plan and Prepare pages' tick: this account's "planner" completion
// record (src/lib/completions.ts), pushed when the trip is shared. When the
// item stays done because someone else in the household ticked it (this
// account's ParQwish Pal, or another of the household's accounts), a toast
// says where, since only that app can take it off.

import db, { type CompletionKind, type TripCompletion, type Trip } from "@/lib/db";
import { auth, canCollaborate } from "@/lib/auth";
import { carryOverTicks, completionAccount, togglePlannerTick } from "@/lib/completions";
import { pushCompletion, deleteCompletionRemote } from "@/lib/wish-sync";
import { showInfoToast } from "@/lib/undo-toast";

/** "Tue, Nov 11" for a park calendar date. */
function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/** A member's name on the trip, or a fallback for someone without one. */
export function memberName(trip: Pick<Trip, "members"> | undefined, uid: string): string {
  return trip?.members?.[uid]?.displayName?.trim() || "another member";
}

/** Where a tick the Planner can't take off came from, in words. */
function tickOrigin(c: TripCompletion, account: string, trip: Trip | undefined): string {
  if (c.authorUid === account) {
    const day = c.dates?.length ? ` on ${shortDate(c.dates[0])}` : "";
    return `in ParQwish Pal${day}`;
  }
  const name = memberName(trip, c.authorUid);
  return c.source === "pal" ? `in ${name}'s ParQwish Pal` : `by ${name}`;
}

/** The toast for an item that stays done: "Ticked in ParQwish Pal on Tue, Nov 11. Untick it there." */
export function stillTickedMessage(remaining: TripCompletion[], account: string, trip: Trip | undefined): string {
  const origins = [...new Set(remaining.map((c) => tickOrigin(c, account, trip)))];
  const there = remaining.length === 1 && remaining[0].authorUid === account ? "Untick it there." : "Only they can untick it.";
  return `Ticked ${origins.join(" and ")}. ${there}`;
}

/** The signed-in uid when this device's ticks sync, else undefined. */
function syncingUid(): string | undefined {
  const user = auth.currentUser;
  return user && canCollaborate(user) && completionAccount() === user.uid ? user.uid : undefined;
}

function pushRecords(records: TripCompletion[], uid: string): void {
  for (const record of records) pushCompletion(record, uid).catch((err) => console.error("[trip-ticks] push failed:", err));
}

/** After a sync file import: its ticks become this account's records, synced. */
export async function adoptImportedTicks(): Promise<void> {
  const written = await carryOverTicks(completionAccount(), { once: false });
  const uid = syncingUid();
  if (uid) pushRecords(written, uid);
}

/** Ticks or unticks an item on the current trip for this account, and syncs it. */
export async function toggleTripTick(tripId: string, kind: CompletionKind, itemId: string): Promise<void> {
  const result = await togglePlannerTick(tripId, kind, itemId);
  const uid = syncingUid();
  if (uid) {
    pushRecords(result.written, uid);
    if (result.removedId) {
      deleteCompletionRemote(tripId, result.removedId, uid).catch((err) => console.error("[trip-ticks] untick failed:", err));
    }
  }
  if (result.remaining.length) {
    showInfoToast(stillTickedMessage(result.remaining, completionAccount(), await db.trips.get(tripId)));
  }
}
