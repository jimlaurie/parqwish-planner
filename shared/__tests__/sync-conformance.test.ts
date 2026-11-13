// The sync contract (shared/sync-conformance.ts) for the record types whose
// rules live in shared/: everything that uses shouldPushAtStartup and
// shouldApplyRemote, and Collections' own rules. Pal's own rules and the
// register of every synced path: utils/__tests__/syncConformance.test.ts.

import { checkSyncContract, SYNC_CONTRACT_RULES, type SyncContract } from "../sync-conformance";
import { localUpdatedAtISO, shouldApplyRemote, shouldPushAtStartup, type RemoteStamp } from "../sync-helpers";
import {
  collectionDocStamp,
  collectionItemFromCloud,
  collectionSettingsFromCloud,
  collectionStartupPush,
  shouldPushCollectionSettings,
} from "../collection-sync";
import type { CollectionItem, CollectionSettings } from "../types/collection";

const iso = (ms: number) => new Date(ms).toISOString();

interface Rec { id: string; name: string; priority: string; updatedAt: number }

/**
 * Records stamped with their push time in the cloud, using the shared rules:
 * wishes, day items, packing items, trip selections and trip copies.
 * `keepCloudStamp`: the local copy takes the document's time when applied (Trip Users).
 */
function sharedRulesContract(path: string, keepCloudStamp = false): SyncContract<Rec> {
  return {
    path,
    edited: (at, v) => ({ id: "r1", name: v === "a" ? "Space Mountain" : "Space Mountain (night)", priority: v === "a" ? "C" : "E", updatedAt: at }),
    shouldPush: (local, remote) => shouldPushAtStartup(local.updatedAt, remote),
    pushedStamp: (_local, pushedAt) => iso(pushedAt),
    shouldApply: (local, stamp, incoming) => shouldApplyRemote(local, stamp, incoming),
    applied: (local, incoming, stamp) => ({ ...local, ...incoming, ...(keepCloudStamp ? { updatedAt: Date.parse(stamp) } : {}) }),
  };
}

/** Collection items: pushed with their own updatedAt; startup compares everything on a first sync. */
const collectionItems: SyncContract<CollectionItem> = {
  path: "users/{id}/collectionItems",
  edited: (at, v) => ({ id: "col_1", category: "pins", name: "Figment", state: v === "a" ? "have" : "trade", createdAt: at, updatedAt: at }),
  shouldPush: (local, remote) => {
    const stamps = new Map<string, RemoteStamp>(remote ? [[local.id, remote]] : []);
    return collectionStartupPush([local], stamps, {}, true).save.length === 1;
  },
  pushedStamp: (local) => collectionDocStamp(local.updatedAt),
  shouldApply: (local, stamp, incoming) => collectionItemFromCloud(incoming, stamp, local) !== null,
  applied: (local, incoming, stamp) => collectionItemFromCloud(incoming, stamp, local) ?? local ?? incoming,
};

/** Collection settings: one document, merged part by part. */
const collectionSettings: SyncContract<CollectionSettings> = {
  path: "users/{id}/collectionSettings/settings",
  edited: (at, v) => ({
    enabled: v === "a" ? ["pins"] : ["pins", "plush"], userCategories: [], firstRunDone: true,
    stamps: { "on:pins": at, ...(v === "b" ? { "on:plush": at } : {}) }, createdAt: at, updatedAt: at,
  }),
  shouldPush: (local, remote) => shouldPushCollectionSettings(local, remote),
  pushedStamp: (local) => collectionDocStamp(local.updatedAt),
  shouldApply: (local, _stamp, incoming) => collectionSettingsFromCloud(incoming, local) !== null,
  applied: (local, incoming) => collectionSettingsFromCloud(incoming, local) ?? local ?? incoming,
};

describe("the sync contract", () => {
  it("has ten rules", () => {
    expect(SYNC_CONTRACT_RULES).toHaveLength(10);
  });

  it.each([
    "users/{id}/wishes",
    "users/{id}/packingItems",
    "sharedTrips/{id}/wishes",
    "sharedTrips/{id}/packingItems",
    "sharedTrips/{id}/wishSelections",
    "sharedTrips/{id}/packingSelections",
    "sharedTrips/{id}/dayItems",
    "sharedTrips/{id}",
  ])("holds for %s with the shared rules", (path) => {
    expect(checkSyncContract(sharedRulesContract(path))).toEqual([]);
  });

  it("holds for Trip Users, which keep the cloud's time", () => {
    expect(checkSyncContract(sharedRulesContract("users/{id}/tripUsers", true))).toEqual([]);
  });

  it("holds for collection items and the collection settings", () => {
    expect(checkSyncContract(collectionItems)).toEqual([]);
    expect(checkSyncContract(collectionSettings)).toEqual([]);
  });
});

describe("the contract catches the old mistakes", () => {
  it("re-applying whenever the cloud's push time is later than the local edit", () => {
    const naive: SyncContract<Rec> = {
      ...sharedRulesContract("naive apply"),
      shouldApply: (local, stamp) => !local || stamp > localUpdatedAtISO(local.updatedAt),
    };
    expect(checkSyncContract(naive).map((f) => f.rule)).toEqual([
      "skips a re-sent copy with nothing new",
      "doesn't apply a downloaded copy again",
    ]);
  });

  it("re-pushing everything at startup", () => {
    const naive: SyncContract<Rec> = { ...sharedRulesContract("naive push"), shouldPush: () => true };
    expect(checkSyncContract(naive).map((f) => f.rule)).toEqual([
      "pushes nothing when the cloud has this copy",
      "never pushes over a deletion",
      "doesn't push a downloaded copy back",
    ]);
  });

  it("stamping a download with the time it arrived", () => {
    const naive: SyncContract<Rec> = {
      ...sharedRulesContract("naive stamp"),
      applied: (local, incoming) => ({ ...local, ...incoming, updatedAt: Date.parse("2026-11-02T00:00:00Z") }),
    };
    expect(checkSyncContract(naive).map((f) => f.rule)).toContain("doesn't push a downloaded copy back");
  });
});
