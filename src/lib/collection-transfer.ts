"use client";

// ==================== COLLECTION TRANSFER ====================
// The collection zip on the Planner (dland-wishes docs/collections-design.md
// §8b): export writes collection.json (settings and items) and each item's
// photos at full size; import reads one made here or on Pal, folds its
// categories and fields in, skips or updates duplicates, and remakes each
// photo's three sizes. The rules are shared with Pal (@shared/collection-zip);
// saving goes through collection-store, so Cloud Sync sends the result on.

import JSZip from "jszip";
import db, { type CollectionItem } from "./db";
import { COLLECTION_SETTINGS_ID, saveCollectionItems, settingsFromRecord, updateCollectionSettings } from "./collection-store";
import { compressDataURLMultiRes } from "./image-utils";
import {
  COLLECTION_ZIP_MANIFEST, buildCollectionZipManifest, collectionItemsToExport, collectionPhotoExtension, collectionZipFileName,
  collectionZipPhotoName, parseCollectionZipManifest, planCollectionImport,
  type CollectionDuplicateMode, type CollectionExportFilter, type CollectionZipManifest,
} from "@shared/collection-zip";
import type { PhotoSet } from "@shared/types/wish";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", svg: "image/svg+xml" };

// ==================== EXPORT ====================

/** Put one photo (a data URL) in the zip; false if it can't be read. */
function addPhoto(zip: JSZip, name: string, dataUrl: string): boolean {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma < 0) return false;
  const head = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  zip.file(name, head.endsWith(";base64") ? body : decodeURIComponent(body), head.endsWith(";base64") ? { base64: true } : {});
  return true;
}

/** Each of an item's photos at its largest size, added to the zip; returns their file names. */
function addItemPhotos(zip: JSZip, item: CollectionItem): string[] {
  return (item.photoSets ?? []).flatMap((set, i) => {
    const source = set.full || set.display || set.thumbnail;
    const name = collectionZipPhotoName(item.id, i, collectionPhotoExtension(source));
    return addPhoto(zip, name, source) ? [name] : [];
  });
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download the collection (or one category or state of it) as a zip. Returns what it held. */
export async function exportCollectionZip(filter: CollectionExportFilter = {}): Promise<{ items: number; photos: number }> {
  const now = Date.now();
  const settings = settingsFromRecord(await db.collectionSettings.get(COLLECTION_SETTINGS_ID), now);
  const items = collectionItemsToExport(await db.collectionItems.toArray(), filter);
  if (!items.length) throw new Error("There's nothing to export yet.");
  const zip = new JSZip();
  const names: Record<string, string[]> = {};
  for (const item of items) {
    const files = addItemPhotos(zip, item);
    if (files.length) names[item.id] = files;
  }
  zip.file(COLLECTION_ZIP_MANIFEST, JSON.stringify(buildCollectionZipManifest(settings, items, names, "Planner", now), null, 2));
  download(await zip.generateAsync({ type: "blob", mimeType: "application/zip" }), collectionZipFileName(now));
  return { items: items.length, photos: Object.values(names).reduce((n, f) => n + f.length, 0) };
}

// ==================== IMPORT ====================

export interface CollectionZipFile {
  zip: JSZip;
  manifest: CollectionZipManifest;
  photoCount: number;
}

/** Open a collection zip and check it, or throw an error a person can read. */
export async function readCollectionZip(file: File): Promise<CollectionZipFile> {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(await file.arrayBuffer()); } catch { throw new Error("This file isn't a zip."); }
  const json = zip.file(COLLECTION_ZIP_MANIFEST);
  if (!json) throw new Error("This zip isn't a ParQwish collection export (it has no collection.json).");
  const manifest = parseCollectionZipManifest(await json.async("text"));
  const photoCount = manifest.items.reduce((n, i) => n + (i.photos?.length ?? 0), 0);
  return { zip, manifest, photoCount };
}

/** One photo from the zip in this app's three sizes, or null if the file is missing or won't load. */
async function photoSetFromZip(zip: JSZip, name: string): Promise<PhotoSet | null> {
  const entry = zip.file(name);
  if (!entry) { console.warn("[collection-transfer] the zip is missing", name); return null; }
  try {
    const mime = MIME[collectionPhotoExtension(name)] ?? "image/jpeg";
    return await compressDataURLMultiRes(`data:${mime};base64,${await entry.async("base64")}`);
  } catch (err) {
    console.error("[collection-transfer] a photo couldn't be loaded:", name, err);
    return null;
  }
}

/** Import an opened zip: duplicates skipped or updated. Returns the counts. */
export async function importCollectionZip(
  file: CollectionZipFile, mode: CollectionDuplicateMode,
): Promise<{ added: number; updated: number; skipped: number; photosMissing: number }> {
  const now = Date.now();
  const record = await db.collectionSettings.get(COLLECTION_SETTINGS_ID);
  const local = { settings: settingsFromRecord(record, now), items: await db.collectionItems.toArray() };
  const plan = planCollectionImport(local, file.manifest, mode, now);
  let photosMissing = 0;
  const items = [];
  for (const item of plan.save) {
    const names = plan.photos[item.id];
    if (!names) { items.push(item); continue; }
    const sets = (await Promise.all(names.map((n) => photoSetFromZip(file.zip, n)))).filter((s): s is PhotoSet => !!s);
    photosMissing += names.length - sets.length;
    // None loaded: an updated item keeps the photos it had
    const kept = local.items.find((l) => l.id === item.id)?.photoSets;
    items.push(sets.length ? { ...item, photoSets: sets } : kept ? { ...item, photoSets: kept } : item);
  }
  await updateCollectionSettings(() => plan.settings);
  if (items.length) await saveCollectionItems(items);
  return { added: plan.added, updated: plan.updated, skipped: plan.skipped, photosMissing };
}
