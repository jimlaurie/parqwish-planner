// ==================== COLLECTION SYNC (pure) ====================
// What a collection item and the collection settings look like in Cloud Sync,
// and how a cloud copy lands on a device (docs/collections-design.md §8, §8b).
// One encrypted document per item, users/{uid}/collectionItems/{itemId}, and
// one for the settings, users/{uid}/collectionSettings/settings, both with the
// account key, like users/{uid}/packingItems.
//
// Photos travel as thumbnails only (about 300 px, data URLs); full photos stay
// on the device that took them. A cloud copy's photos are matched to the
// device's own by a key made from the thumbnail (collectionPhotoKey), not by
// position, so a reordered photo keeps its full-size file, a photo deleted
// elsewhere goes, and a thumbnail never replaces a device's full photo. Pal
// keeps its thumbnails as files named by that key (collectionThumbnailFileName).
// No I/O here: both apps' sync code calls these.

import type { CollectionItem, CollectionSettings } from "./types/collection";
import type { PhotoSet } from "./types/wish";
import { localUpdatedAtISO, shouldApplyRemote, shouldPushAtStartup, type RemoteStamp } from "./sync-helpers";

/** users/{uid}/{COLLECTION_ITEMS_COLLECTION}/{itemId} */
export const COLLECTION_ITEMS_COLLECTION = "collectionItems";
/** users/{uid}/{COLLECTION_SETTINGS_COLLECTION}/{COLLECTION_SETTINGS_DOC} */
export const COLLECTION_SETTINGS_COLLECTION = "collectionSettings";
export const COLLECTION_SETTINGS_DOC = "settings";
/** Documents per page of the first download ("Restoring your collection… 600 of 2,000"). */
export const COLLECTION_PAGE_SIZE = 250;
/** Firestore's cap is 1 MiB a document; an item's encrypted payload over this isn't pushed. */
export const MAX_COLLECTION_PAYLOAD_CHARS = 900_000;

// ==================== PHOTO KEYS ====================

/** A short key for a thumbnail's content (FNV-1a and the length): the same picture gives the same key on every device. */
export function collectionPhotoKey(thumbnail: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < thumbnail.length; i++) {
    hash ^= thumbnail.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(36)}${thumbnail.length.toString(36)}`;
}

const THUMB_FILE = /(?:^|\/)ct_([0-9a-z]+)\.jpg$/;

/** The file name Pal keeps a synced thumbnail under, so its key can be read back from the path. */
export function collectionThumbnailFileName(thumbnail: string): string {
  return `ct_${collectionPhotoKey(thumbnail)}.jpg`;
}

/** The key in a thumbnail file's path (collectionThumbnailFileName), or undefined for any other path. */
export function collectionPhotoKeyFromPath(path: string | undefined): string | undefined {
  return path ? THUMB_FILE.exec(path)?.[1] : undefined;
}

/** Whether a thumbnail can travel: an image data URL (a file path means nothing on another device). */
export function isSyncableThumbnail(thumbnail: string | undefined): thumbnail is string {
  return !!thumbnail && thumbnail.startsWith("data:image/");
}

// ==================== ITEMS ====================

/** A copy of the item with these photos, or none when the list is empty. */
function withPhotos(item: CollectionItem, photoSets: PhotoSet[]): CollectionItem {
  const copy = { ...item };
  delete copy.photoSets;
  return photoSets.length ? { ...copy, photoSets } : copy;
}

/**
 * The item as it's stored in the cloud: every photo as its thumbnail only.
 * `thumbnails` (one per photo, in order) are Pal's data URLs read from its
 * files; the Planner's photo sets already hold them. Throws when a photo has
 * no syncable thumbnail, so an item is never pushed with photos missing (which
 * would take them off every other device).
 */
export function collectionItemForCloud(item: CollectionItem, thumbnails?: string[]): CollectionItem {
  const sets = item.photoSets ?? [];
  const thumbs = thumbnails ?? sets.map((s) => s.thumbnail);
  if (thumbs.length !== sets.length || !thumbs.every(isSyncableThumbnail)) {
    throw new Error(`[collection-sync] ${item.id} has a photo without a thumbnail to sync`);
  }
  return withPhotos(item, thumbs.map((t) => ({ thumbnail: t, display: "", full: "" })));
}

/** The key of one of this device's photos: from its thumbnail data URL, or from Pal's thumbnail file name. */
function localPhotoKey(set: PhotoSet): string | undefined {
  return isSyncableThumbnail(set.thumbnail) ? collectionPhotoKey(set.thumbnail) : collectionPhotoKeyFromPath(set.thumbnail);
}

/**
 * The photos after a cloud copy arrives: each cloud photo this device already
 * has (same key) keeps the device's own set, with its full-size files; a new
 * one is its thumbnail in all three sizes (Pal then writes it to a file).
 * Photos the cloud copy no longer has are dropped.
 */
export function mergeCollectionPhotos(incoming: PhotoSet[] | undefined, local: PhotoSet[] | undefined): PhotoSet[] {
  const mine = new Map<string, PhotoSet>();
  for (const set of local ?? []) {
    const key = localPhotoKey(set);
    if (key && !mine.has(key)) mine.set(key, set);
  }
  return (incoming ?? []).filter((s) => isSyncableThumbnail(s.thumbnail)).map((s) =>
    mine.get(collectionPhotoKey(s.thumbnail)) ?? { thumbnail: s.thumbnail, display: s.thumbnail, full: s.thumbnail });
}

/** A comparable view of an item: photos as keys, so a device's own full-size files don't count as a difference. */
function comparable(item: CollectionItem): object {
  return { ...item, photoSets: (item.photoSets ?? []).map(localPhotoKey) };
}

/**
 * The item to store after a cloud copy arrives, or null when it changes
 * nothing or this device's copy is as new (last write wins on updatedAt).
 */
export function collectionItemFromCloud(
  incoming: CollectionItem, remoteUpdatedAt: string | undefined, local: CollectionItem | undefined,
): CollectionItem | null {
  const viewLocal = local && { ...comparable(local), updatedAt: local.updatedAt };
  if (!shouldApplyRemote(viewLocal, remoteUpdatedAt, comparable(incoming))) return null;
  return withPhotos(incoming, mergeCollectionPhotos(incoming.photoSets, local?.photoSets));
}

// ==================== SETTINGS ====================

/** Settings that hold nothing chosen yet: a new device's, never pushed over the cloud's. */
export function isBlankCollectionSettings(settings: CollectionSettings): boolean {
  return !settings.firstRunDone && settings.enabled.length === 0 && settings.userCategories.length === 0;
}

/** Whether startup pushes this device's settings: never blank ones over a cloud copy, otherwise when newer. */
export function shouldPushCollectionSettings(settings: CollectionSettings | undefined, remote: RemoteStamp | undefined): boolean {
  if (!settings) return false;
  if (remote && isBlankCollectionSettings(settings)) return false;
  return shouldPushAtStartup(settings.updatedAt, remote);
}

/** The settings to store after a cloud copy arrives, or null to keep this device's. */
export function collectionSettingsFromCloud(
  incoming: CollectionSettings, remoteUpdatedAt: string | undefined, local: CollectionSettings | undefined,
): CollectionSettings | null {
  const blankHere = !local || isBlankCollectionSettings(local);
  if (blankHere) return incoming;
  return shouldApplyRemote(local, remoteUpdatedAt, incoming) ? incoming : null;
}

/** The stamp a document carries: the item's or settings' own updatedAt, so an unchanged copy is never "newer". */
export function collectionDocStamp(updatedAt: number | string | undefined): string {
  return localUpdatedAtISO(updatedAt) || new Date(0).toISOString();
}

// ==================== STARTUP PUSH ====================
// The first download on a device reads every document; after that each start
// reads only documents written since the newest one this device has seen (the
// server's own time, serverUpdatedAt, so device clocks don't matter), and the
// listener only receives changes. So startup can't compare every item with the
// cloud, and pushes what this device changed instead: every local write marks
// its item pending until a push succeeds (made while signed out, offline or
// before sync was turned on). The first sync of an account on a device compares
// everything, like the packing catalog.

/** This device's changes not yet in the cloud: item id → saved or deleted. */
export type CollectionPendingItems = Record<string, "save" | "delete">;

export interface CollectionStartupPush {
  save: CollectionItem[];
  delete: string[];
  /** Pending ids that need no push (the cloud is as new, already deleted, or the item is gone): clear their marks. */
  settled: string[];
}

/**
 * What startup pushes after its pull. `stamps` are the documents the pull
 * read (all of them on a first sync). A pending save the cloud has a newer
 * copy of was just applied here instead; a pending delete the cloud already
 * has is done.
 */
export function collectionStartupPush(
  local: CollectionItem[], stamps: Map<string, RemoteStamp>, pending: CollectionPendingItems, firstSync: boolean,
): CollectionStartupPush {
  const byId = new Map(local.map((i) => [i.id, i]));
  const wanted = firstSync ? local : Object.entries(pending).filter(([, op]) => op === "save").map(([id]) => byId.get(id)).filter((i): i is CollectionItem => !!i);
  const save = wanted.filter((i) => shouldPushAtStartup(i.updatedAt, stamps.get(i.id)));
  const deleted = Object.entries(pending).filter(([id, op]) => op === "delete" && !byId.has(id) && !stamps.get(id)?.deletedAt).map(([id]) => id);
  const pushed = new Set([...save.map((i) => i.id), ...deleted]);
  return { save, delete: deleted, settled: Object.keys(pending).filter((id) => !pushed.has(id)) };
}
