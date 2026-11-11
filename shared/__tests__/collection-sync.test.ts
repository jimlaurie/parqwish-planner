import {
  collectionDocStamp,
  collectionItemForCloud,
  collectionItemFromCloud,
  collectionPhotoKey,
  collectionPhotoKeyFromPath,
  collectionSettingsFromCloud,
  collectionSettingsNeedPushBack,
  collectionStartupPush,
  collectionSyncRetryDelay,
  collectionThumbnailFileName,
  mergeCollectionPhotos,
  shouldPushCollectionSettings,
} from "../collection-sync";
import type { CollectionItem, CollectionSettings } from "../types/collection";

const T = Date.parse("2026-11-10T12:00:00Z");
const A = "data:image/jpeg;base64,AAAA";
const B = "data:image/jpeg;base64,BBBBBB";
const C = "data:image/jpeg;base64,CCCCCCCC";
const iso = (ms: number) => new Date(ms).toISOString();

function item(extra: Partial<CollectionItem> = {}): CollectionItem {
  return { id: "col_1", name: "Figment", category: "pins", state: "have", createdAt: T, updatedAt: T, ...extra };
}
const full = (thumb: string, path: string) => ({ thumbnail: thumb, display: `${path}-display`, full: `${path}-full` });
const palFile = (thumb: string) => `file:///docs/collection/${collectionThumbnailFileName(thumb)}`;
const palSet = (thumb: string, photo: string) => ({ thumbnail: palFile(thumb), display: photo, full: photo });

function settings(extra: Partial<CollectionSettings> = {}): CollectionSettings {
  return { enabled: ["pins"], userCategories: [], firstRunDone: true, createdAt: T, updatedAt: T, ...extra };
}

describe("photo keys", () => {
  it("are the same for the same picture and differ for another", () => {
    expect(collectionPhotoKey(A)).toBe(collectionPhotoKey(`data:image/jpeg;base64,${"AAAA"}`));
    expect(collectionPhotoKey(A)).not.toBe(collectionPhotoKey(B));
  });

  it("round-trip through Pal's thumbnail file names, and other paths have none", () => {
    expect(collectionPhotoKeyFromPath(palFile(B))).toBe(collectionPhotoKey(B));
    expect(collectionPhotoKeyFromPath("file:///docs/photos/IMG_1.jpg")).toBeUndefined();
  });
});

describe("an item for the cloud", () => {
  it("carries every photo as its thumbnail only", () => {
    const cloud = collectionItemForCloud(item({ photoSets: [full(A, "a"), full(B, "b")] }));
    expect(cloud.photoSets).toEqual([{ thumbnail: A, display: "", full: "" }, { thumbnail: B, display: "", full: "" }]);
  });

  it("takes Pal's thumbnails read from its files, one per photo", () => {
    const cloud = collectionItemForCloud(item({ photoSets: [palSet(A, "file:///IMG_1.jpg")] }), [A]);
    expect(cloud.photoSets).toEqual([{ thumbnail: A, display: "", full: "" }]);
  });

  it("refuses an item with a photo that has no thumbnail, so no device loses it", () => {
    expect(() => collectionItemForCloud(item({ photoSets: [palSet(A, "file:///IMG_1.jpg")] }))).toThrow("without a thumbnail");
    expect(() => collectionItemForCloud(item({ photoSets: [full(A, "a"), full(B, "b")] }), [A])).toThrow();
  });

  it("leaves an item without photos alone", () => {
    expect(collectionItemForCloud(item())).toEqual(item());
  });
});

describe("photos arriving from the cloud", () => {
  const cloudSets = (...thumbs: string[]) => thumbs.map((t) => ({ thumbnail: t, display: "", full: "" }));

  it("keep this device's full-size photos, in the cloud's order", () => {
    expect(mergeCollectionPhotos(cloudSets(B, A), [full(A, "a"), full(B, "b")])).toEqual([full(B, "b"), full(A, "a")]);
    expect(mergeCollectionPhotos(cloudSets(A), [palSet(A, "file:///IMG_1.jpg")])).toEqual([palSet(A, "file:///IMG_1.jpg")]);
  });

  it("add a new photo as its thumbnail and drop one deleted elsewhere", () => {
    expect(mergeCollectionPhotos(cloudSets(A, C), [full(A, "a"), full(B, "b")])).toEqual([full(A, "a"), { thumbnail: C, display: C, full: C }]);
  });
});

describe("an item arriving from the cloud", () => {
  it("is stored when it's new here or newer, with this device's photos kept", () => {
    const local = item({ photoSets: [full(A, "a")] });
    const incoming = item({ name: "Figment 50th", updatedAt: T + 1000, photoSets: [{ thumbnail: A, display: "", full: "" }] });
    expect(collectionItemFromCloud(incoming, iso(T + 1000), local)).toEqual({ ...incoming, photoSets: [full(A, "a")] });
    expect(collectionItemFromCloud(incoming, iso(T + 1000), undefined)?.photoSets).toEqual([{ thumbnail: A, display: A, full: A }]);
  });

  it("is skipped when it's older, or changes nothing but the photo sizes", () => {
    const local = item({ name: "Mine", updatedAt: T + 5000 });
    expect(collectionItemFromCloud(item({ updatedAt: T + 1000 }), iso(T + 1000), local)).toBeNull();
    const same = item({ photoSets: [full(A, "a")] });
    expect(collectionItemFromCloud(item({ photoSets: [{ thumbnail: A, display: "", full: "" }] }), iso(T + 1), same)).toBeNull();
  });
});

describe("settings", () => {
  const blank = settings({ enabled: [], firstRunDone: false });

  it("a new device's blank settings are never pushed or applied, and take the cloud's", () => {
    expect(shouldPushCollectionSettings(blank, { updatedAt: iso(T - 1000) })).toBe(false);
    expect(shouldPushCollectionSettings(blank, undefined)).toBe(false);
    expect(collectionSettingsFromCloud({ ...blank, updatedAt: T + 99 }, settings())).toBeNull();
    expect(collectionSettingsFromCloud(settings(), blank)).toEqual(settings());
    expect(collectionSettingsFromCloud(settings(), undefined)).toEqual(settings());
  });

  it("otherwise the newer copy wins", () => {
    expect(shouldPushCollectionSettings(settings({ updatedAt: T + 1 }), { updatedAt: iso(T) })).toBe(true);
    expect(shouldPushCollectionSettings(settings(), { updatedAt: iso(T + 1) })).toBe(false);
    expect(shouldPushCollectionSettings(undefined, undefined)).toBe(false);
    const newer = settings({ enabled: ["pins", "plush"], updatedAt: T + 1 });
    expect(collectionSettingsFromCloud(newer, settings())?.enabled).toEqual(["pins", "plush"]);
    expect(collectionSettingsFromCloud(settings(), newer)).toBeNull();
  });

  it("merges a cloud copy part by part, and pushes back what the cloud lacks", () => {
    const mine = settings({ enabled: ["pins"], stamps: { "on:pins": T, "on:plush": T + 5, order: T + 5, firstRun: T } });
    const cloud = settings({ enabled: ["pins", "ears"], stamps: { "on:pins": T, "on:ears": T + 9, order: T + 9, firstRun: T } });
    const stored = collectionSettingsFromCloud(cloud, mine)!;
    expect(stored.enabled).toEqual(["pins", "ears"]);
    expect(collectionSettingsNeedPushBack(stored, cloud)).toBe(false);
    const mineWithPlush = settings({ enabled: ["pins", "plush"], stamps: { "on:pins": T, "on:plush": T + 12, order: T + 12, firstRun: T } });
    const both = collectionSettingsFromCloud(cloud, mineWithPlush)!;
    expect(both.enabled).toEqual(["pins", "plush", "ears"]);
    expect(collectionSettingsNeedPushBack(both, cloud)).toBe(true);
  });

  it("documents carry the item's own time", () => {
    expect(collectionDocStamp(T)).toBe(iso(T));
    expect(collectionDocStamp(undefined)).toBe(iso(0));
  });
});

describe("the startup push", () => {
  const one = item({ id: "a", updatedAt: T + 10 });
  const two = item({ id: "b", updatedAt: T });

  it("on a first sync compares every item with the cloud", () => {
    const stamps = new Map([["a", { updatedAt: iso(T) }], ["b", { updatedAt: iso(T + 99) }]]);
    expect(collectionStartupPush([one, two], stamps, {}, true).save.map((i) => i.id)).toEqual(["a"]);
  });

  it("afterwards pushes only this device's pending changes, unless the cloud's copy is newer", () => {
    const stamps = new Map([["b", { updatedAt: iso(T + 99) }]]);
    const plan = collectionStartupPush([one, two], stamps, { a: "save", b: "save", gone: "save" }, false);
    expect(plan.save.map((i) => i.id)).toEqual(["a"]);
    expect(plan.settled).toEqual(["b", "gone"]);
  });

  it("pushes pending deletes the cloud doesn't have yet", () => {
    const stamps = new Map([["x", { updatedAt: iso(T), deletedAt: iso(T) }]]);
    const plan = collectionStartupPush([one], stamps, { x: "delete", y: "delete", a: "delete" }, false);
    expect(plan.delete).toEqual(["y"]);
    expect(plan.settled).toEqual(["x", "a"]);
  });
});

describe("collectionSyncRetryDelay", () => {
  it("waits 5 s, 15 s, a minute, then every 5 minutes", () => {
    expect([0, 1, 2, 3, 4, 50].map(collectionSyncRetryDelay)).toEqual([5_000, 15_000, 60_000, 300_000, 300_000, 300_000]);
  });
  it("treats odd attempt numbers safely", () => {
    expect(collectionSyncRetryDelay(-3)).toBe(5_000);
    expect(collectionSyncRetryDelay(1.7)).toBe(15_000);
    expect(collectionSyncRetryDelay(Number.NaN)).toBe(300_000);
  });
});
