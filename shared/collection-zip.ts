// ==================== COLLECTION ZIP (pure) ====================
// The collection export and import (docs/collections-design.md §8b): one zip
// holding collection.json (the settings, and the items without their photo
// data) and each item's full-size photos as files, named by item id. Import
// on either app matches by item id, then by name within the category, and
// skips or updates those duplicates; categories and fields the file uses are
// folded in (mergeImportedCollectionFields), so no value is dropped. It moves
// a big collection to a new phone or the Planner without Cloud Sync, and
// keeps backups. Separate from the trip sync file, so trip exports stay small.
// No I/O: Pal's and the Planner's zip code calls these.

import type { CollectionFieldDef, CollectionItem, CollectionSettings, CollectionState, UserCollectionCategory } from "./types/collection";
import { getBuiltInCollectionCategory } from "./constants/collections";
import {
  addUserCollectionCategory, mergeImportedCollectionFields, newUserCollectionCategoryId, remapCollectionDetails,
  setCollectionCategoryEnabled,
} from "./collections";

export const COLLECTION_ZIP_TYPE = "parqwish-collection";
export const COLLECTION_ZIP_VERSION = 1;
export const COLLECTION_ZIP_MANIFEST = "collection.json";

/** An item as collection.json holds it: no photo data, just the zip's photo file names, in order. */
export type CollectionZipItem = Omit<CollectionItem, "photoSets"> & { photos?: string[] };

export interface CollectionZipManifest {
  type: typeof COLLECTION_ZIP_TYPE;
  version: typeof COLLECTION_ZIP_VERSION;
  exportedAt: string;
  /** "Pal" or "Planner". */
  app: string;
  settings: CollectionSettings;
  items: CollectionZipItem[];
}

/** Which items to export: all, or one category, or one state. */
export interface CollectionExportFilter {
  categoryId?: string;
  state?: CollectionState;
}

// ==================== EXPORT ====================

/** A photo's file name in the zip: photos/{itemId}-{n}.{ext}. */
export function collectionZipPhotoName(itemId: string, index: number, ext: string): string {
  return `photos/${itemId.replace(/[^A-Za-z0-9_-]/g, "_")}-${index + 1}.${ext}`;
}

/** The file extension for an image data URL or path ("jpg" unless it says png, webp, heic or svg). */
export function collectionPhotoExtension(source: string): string {
  const mime = /^data:image\/([a-z0-9.+-]+)/i.exec(source)?.[1]?.toLowerCase();
  const ext = (mime ?? /\.([a-z0-9]+)$/i.exec(source)?.[1] ?? "jpg").toLowerCase();
  if (ext === "svg+xml") return "svg";
  return ["png", "webp", "heic", "svg"].includes(ext) ? ext : "jpg";
}

export function collectionItemsToExport(items: CollectionItem[], filter: CollectionExportFilter = {}): CollectionItem[] {
  return items.filter((i) => (!filter.categoryId || i.category === filter.categoryId) && (!filter.state || i.state === filter.state));
}

/** collection.json for these items; `photoNames` lists each item's photo files as the app wrote them. */
export function buildCollectionZipManifest(
  settings: CollectionSettings, items: CollectionItem[], photoNames: Record<string, string[]>, app: string, now: number,
): CollectionZipManifest {
  const zipItems = items.map((item): CollectionZipItem => {
    const copy: CollectionZipItem & { photoSets?: unknown } = { ...item };
    delete copy.photoSets;
    const photos = photoNames[item.id];
    return photos?.length ? { ...copy, photos } : copy;
  });
  return { type: COLLECTION_ZIP_TYPE, version: COLLECTION_ZIP_VERSION, exportedAt: new Date(now).toISOString(), app, settings, items: zipItems };
}

/** The file name a collection export is saved under: ParQwish-Collection-2026-11-10.zip. */
export function collectionZipFileName(now: number): string {
  const day = new Date(now).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return `ParQwish-Collection-${day}.zip`;
}

// ==================== READING A FILE ====================

/** collection.json from a zip, checked, or throws an error a person can read. */
export function parseCollectionZipManifest(text: string): CollectionZipManifest {
  let data: Partial<CollectionZipManifest>;
  try { data = JSON.parse(text); } catch { throw new Error("This zip's collection.json can't be read."); }
  if (data?.type !== COLLECTION_ZIP_TYPE) throw new Error("This isn't a ParQwish collection export.");
  if (data.version !== COLLECTION_ZIP_VERSION) throw new Error("This collection export is from a newer version. Update the app and try again.");
  if (!data.settings || !Array.isArray(data.items)) throw new Error("This collection export is incomplete.");
  const items = data.items.filter((i): i is CollectionZipItem => !!i && typeof i.id === "string" && typeof i.category === "string");
  return { ...(data as CollectionZipManifest), items };
}

// ==================== IMPORT ====================

export type CollectionDuplicateMode = "skip" | "update";

export interface CollectionImportPlan {
  settings: CollectionSettings;
  /** Items to save, each as it will be stored, without photos. */
  save: CollectionItem[];
  /** Saved item id → the zip's photo files for it, in order (only where the file's photos are used). */
  photos: Record<string, string[]>;
  added: number;
  updated: number;
  skipped: number;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * The local category an imported one is, adding a user category that's
 * missing (matched by id, then by name), and switching it on. A category the
 * file doesn't describe keeps its id (it shows under Uncategorised).
 */
function importCategory(settings: CollectionSettings, incoming: CollectionSettings, id: string, now: number): { settings: CollectionSettings; id: string } {
  const on = (s: CollectionSettings, cid: string) => (s.enabled.includes(cid) ? s : setCollectionCategoryEnabled(s, cid, true, now));
  if (getBuiltInCollectionCategory(id)) return { settings: on(settings, id), id };
  const theirs = incoming.userCategories.find((c) => c.id === id && !c.deletedAt);
  if (!theirs) return { settings, id };
  const mine = settings.userCategories.find((c) => !c.deletedAt && c.id === id)
    ?? settings.userCategories.find((c) => !c.deletedAt && sameName(c.name, theirs.name));
  if (mine) return { settings: on(settings, mine.id), id: mine.id };
  const taken = settings.userCategories.some((c) => c.id === id);
  const added: Omit<UserCollectionCategory, "deletedAt"> = {
    id: taken ? newUserCollectionCategoryId() : id, name: theirs.name, icon: theirs.icon, layout: theirs.layout, trades: theirs.trades,
  };
  return { settings: addUserCollectionCategory(settings, added, now), id: added.id };
}

/** Fold in every category the file's items use, and their fields: category id → local id, and field mappings per local category. */
function importCategories(
  settings: CollectionSettings, manifest: CollectionZipManifest, now: number,
): { settings: CollectionSettings; categories: Record<string, string>; fields: Record<string, Record<string, string>> } {
  let next = settings;
  const categories: Record<string, string> = {};
  const fields: Record<string, Record<string, string>> = {};
  for (const id of [...new Set(manifest.items.map((i) => i.category))]) {
    const cat = importCategory(next, manifest.settings, id, now);
    categories[id] = cat.id;
    const theirFields: CollectionFieldDef[] = manifest.settings.customFields?.[id] ?? [];
    const merged = mergeImportedCollectionFields(cat.settings, cat.id, theirFields, now);
    next = merged.settings;
    fields[cat.id] = merged.mapping;
  }
  return { settings: next, categories, fields };
}

/** The local item an imported one duplicates: same id, else the same name in the same category (not one already matched). */
function findDuplicate(local: CollectionItem[], item: CollectionItem, used: Set<string>): CollectionItem | undefined {
  const byId = local.find((l) => l.id === item.id);
  if (byId) return byId;
  if (!item.name.trim()) return undefined;
  return local.find((l) => !used.has(l.id) && l.category === item.category && sameName(l.name, item.name));
}

/** An imported item translated to this device's category and field ids, without its photo list. */
function translated(item: CollectionZipItem, categories: Record<string, string>, fields: Record<string, Record<string, string>>): CollectionItem {
  const copy: CollectionZipItem = { ...item };
  delete copy.photos;
  const category = categories[item.category] ?? item.category;
  const details = remapCollectionDetails(item.details, fields[category] ?? {});
  return { ...copy, category, ...(details ? { details } : {}) };
}

/**
 * What importing a file does: the settings with its categories and fields
 * folded in, and the items to save. A duplicate (same id, or same name in the
 * same category) is skipped, or with "update" takes the file's details and
 * photos (keeping its own id, and its own photos if the file has none). Saved
 * items are stamped now, so Cloud Sync sends them on.
 */
export function planCollectionImport(
  local: { settings: CollectionSettings; items: CollectionItem[] }, manifest: CollectionZipManifest,
  mode: CollectionDuplicateMode, now: number,
): CollectionImportPlan {
  const folded = importCategories(local.settings, manifest, now);
  const { categories, fields } = folded;
  // Importing a collection counts as choosing what you collect: no first-visit picker over it
  const settings = manifest.items.length && !folded.settings.firstRunDone ? { ...folded.settings, firstRunDone: true, updatedAt: now } : folded.settings;
  const plan: CollectionImportPlan = { settings, save: [], photos: {}, added: 0, updated: 0, skipped: 0 };
  const used = new Set<string>();
  for (const zipItem of manifest.items) {
    const item = translated(zipItem, categories, fields);
    const dup = findDuplicate(local.items, item, used);
    if (dup && mode === "skip") { plan.skipped++; used.add(dup.id); continue; }
    const photos = zipItem.photos ?? [];
    const saved: CollectionItem = dup
      ? { ...item, id: dup.id, createdAt: dup.createdAt, userId: item.userId ?? dup.userId, updatedAt: now, ...(photos.length ? {} : { photoSets: dup.photoSets }) }
      : { ...item, updatedAt: now };
    if (!saved.photoSets) delete saved.photoSets;
    plan.save.push(saved);
    if (photos.length) plan.photos[saved.id] = photos;
    if (dup) { plan.updated++; used.add(dup.id); } else plan.added++;
  }
  return plan;
}
