// ==================== SYNC CONFORMANCE ====================
// The rules every synced record type must follow (docs/roadmap.md › Technical
// Debt › "Workflow improvements from the second changelog review", item 1).
// Most of a month's sync rework (25 Oct–30 Oct 2026, Planner 6.0.93–6.0.95)
// came from one mistake made separately in each type: taking the time a copy
// was pushed for the time it was edited. Old copies then beat newer edits,
// deletions came back, and every start re-sent and re-applied everything.
//
// A type joins by describing itself as a SyncContract that calls the same
// decision functions its app uses; checkSyncContract tries it against the
// rules. Tests: shared/__tests__/sync-conformance.test.ts (the shared rules)
// and Pal's utils/__tests__/syncConformance.test.ts (Pal's own rules, and the
// register of every synced Firestore path).

import type { RemoteStamp } from "./sync-helpers";

/** One synced record type, through the functions its app really uses. */
export interface SyncContract<T> {
  /** The Firestore path, as docs/data-flow.json names it (e.g. "users/{id}/wishes") */
  path: string;
  /** A local record after an edit at `editedAt` (ms); `variant` changes its content */
  edited(editedAt: number, variant: "a" | "b"): T;
  /** Startup: whether to push this local copy, given what the cloud holds */
  shouldPush(local: T, remote: RemoteStamp | undefined): boolean;
  /** The `updatedAt` the cloud document carries after this device pushes `local` at `pushedAt` (ms) */
  pushedStamp(local: T, pushedAt: number): string;
  /** Pull or listener: whether a cloud copy is applied over the local one (leave out for a type this app only pushes) */
  shouldApply?(local: T | undefined, remoteUpdatedAt: string, incoming: T): boolean;
  /** The local record after `incoming` (from a document stamped `remoteUpdatedAt`) is applied */
  applied?(local: T | undefined, incoming: T, remoteUpdatedAt: string): T;
}

/** A contract with both halves, for the apply rules. */
type Applying<T> = SyncContract<T> & Required<Pick<SyncContract<T>, "shouldApply" | "applied">>;

export interface ContractFailure {
  path: string;
  rule: string;
}

const EDIT = Date.UTC(2026, 10, 1, 9, 0, 0);
const MINUTE = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

type Rule<T, C = SyncContract<T>> = [string, (c: C) => boolean];

/** Startup push rules. */
function pushRules<T>(): Rule<T>[] {
  return [
    ["pushes a copy the cloud doesn't have", (c) => c.shouldPush(c.edited(EDIT, "a"), undefined)],
    ["pushes nothing when the cloud has this copy", (c) => {
      const local = c.edited(EDIT, "a");
      return !c.shouldPush(local, { updatedAt: c.pushedStamp(local, EDIT + MINUTE) });
    }],
    ["pushes an edit made after the last push", (c) => {
      const pushed = c.edited(EDIT, "a");
      return c.shouldPush(c.edited(EDIT + 5 * MINUTE, "b"), { updatedAt: c.pushedStamp(pushed, EDIT + MINUTE) });
    }],
    ["never pushes over a deletion", (c) =>
      !c.shouldPush(c.edited(EDIT, "a"), { updatedAt: iso(EDIT + MINUTE), deletedAt: iso(EDIT + MINUTE) })],
  ];
}

/** Pull and listener rules, and the round trip between the two. */
function applyRules<T>(): Rule<T, Applying<T>>[] {
  const fromCloud = (c: Applying<T>) => {
    const incoming = c.edited(EDIT, "a");
    const stamp = c.pushedStamp(incoming, EDIT + MINUTE);
    return { incoming, stamp, stored: c.applied(undefined, incoming, stamp) };
  };
  return [
    ["applies a copy it doesn't have", (c) => { const { incoming, stamp } = fromCloud(c); return c.shouldApply(undefined, stamp, incoming); }],
    ["skips a re-sent copy with nothing new", (c) => {
      const local = c.edited(EDIT, "a");
      return !c.shouldApply(local, c.pushedStamp(local, EDIT + MINUTE), c.edited(EDIT, "a"));
    }],
    ["applies a newer edit from another device", (c) => {
      const incoming = c.edited(EDIT + 5 * MINUTE, "b");
      return c.shouldApply(c.edited(EDIT, "a"), c.pushedStamp(incoming, EDIT + 6 * MINUTE), incoming);
    }],
    ["keeps a local edit newer than the cloud's copy", (c) => {
      const incoming = c.edited(EDIT, "a");
      return !c.shouldApply(c.edited(EDIT + 10 * MINUTE, "b"), c.pushedStamp(incoming, EDIT + MINUTE), incoming);
    }],
    ["doesn't push a downloaded copy back", (c) => { const { stamp, stored } = fromCloud(c); return !c.shouldPush(stored, { updatedAt: stamp }); }],
    ["doesn't apply a downloaded copy again", (c) => { const { incoming, stamp, stored } = fromCloud(c); return !c.shouldApply(stored, stamp, incoming); }],
  ];
}

/**
 * The rules this contract breaks (none when it conforms). A rule that throws
 * counts as broken. A push-only contract (no shouldApply) is checked on the
 * push rules alone.
 */
export function checkSyncContract<T>(contract: SyncContract<T>): ContractFailure[] {
  const failures: ContractFailure[] = [];
  const check = <C>(rules: Rule<T, C>[], c: C) => {
    for (const [rule, holds] of rules) {
      let ok = false;
      try { ok = holds(c); } catch { ok = false; }
      if (!ok) failures.push({ path: contract.path, rule });
    }
  };
  check(pushRules<T>(), contract);
  if (contract.shouldApply && contract.applied) check(applyRules<T>(), contract as Applying<T>);
  return failures;
}

/** The rules by name, for listing in a test. */
export const SYNC_CONTRACT_RULES: string[] = [...pushRules(), ...applyRules()].map(([rule]) => rule);
