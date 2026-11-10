// ==================== COLLECTION STORE ====================
// The Planner's memorabilia collection in IndexedDB (dland-wishes
// docs/collections-design.md): collectionItems, one row per item (not
// trip-scoped; items carry their Trip User in userId), and one
// collectionSettings row. Settings change only through the shared rules
// (@shared/collections), applied inside a transaction to the row as stored,
// so two tabs can't overwrite each other's change.
//
// Every write marks what it changed as pending (localStorage) and tells Cloud
// Sync (lib/collection-cloud.ts), which pushes it and clears the mark; a
// change made while signed out, offline or before sync was on stays pending
// and goes up when sync next starts.

import db, { type CollectionItem, type CollectionSettings, type CollectionSettingsRecord } from "@/lib/db";
import { emptyCollectionSettings } from "@shared/collections";
import { COLLECTION_ITEM_PREFIX } from "@shared/constants/collections";
import type { CollectionPendingItems } from "@shared/collection-sync";
import { stampCollectionSettings } from "@shared/collection-settings-merge";

export const COLLECTION_SETTINGS_ID = "settings";

// ==================== PENDING CHANGES ====================

const PENDING_KEY = "parqwish-collection-pending";

/** This browser's collection changes not yet in the cloud. */
export interface CollectionPending {
  items: CollectionPendingItems;
  settings: boolean;
}

export function readCollectionPending(): CollectionPending {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null");
    return { items: raw?.items ?? {}, settings: !!raw?.settings };
  } catch (err) {
    console.error("[collection-store] the pending list couldn't be read:", err);
    return { items: {}, settings: false };
  }
}

function writeCollectionPending(pending: CollectionPending): void {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(pending)); } catch (err) {
    console.error("[collection-store] the pending list couldn't be saved:", err);
  }
}

/** Change the pending list: pushes clear what they sent, writes add to it. */
export function updateCollectionPending(change: (p: CollectionPending) => CollectionPending): void {
  writeCollectionPending(change(readCollectionPending()));
}

export interface CollectionWrite {
  saved?: CollectionItem[];
  deleted?: string[];
  settings?: CollectionSettings;
}

let _onWrite: ((write: CollectionWrite) => void) | null = null;

/** Cloud Sync listens here while it runs (lib/collection-cloud.ts). */
export function onCollectionWrite(listener: ((write: CollectionWrite) => void) | null): void {
  _onWrite = listener;
}

function recordWrite(write: CollectionWrite): void {
  updateCollectionPending((p) => {
    const items = { ...p.items };
    for (const item of write.saved ?? []) items[item.id] = "save";
    for (const id of write.deleted ?? []) items[id] = "delete";
    return { items, settings: p.settings || !!write.settings };
  });
  _onWrite?.(write);
}

/** A new item's id: "col_" + time + random, the same shape Pal makes. */
export function newCollectionItemId(now: number, random: () => number = Math.random): string {
  return `${COLLECTION_ITEM_PREFIX}${now.toString(36)}${random().toString(36).slice(2, 8)}`;
}

/** The stored settings without their row id, or empty settings when there are none yet. */
export function settingsFromRecord(record: CollectionSettingsRecord | undefined, now: number): CollectionSettings {
  if (!record) return emptyCollectionSettings(now);
  const settings: Partial<CollectionSettingsRecord> = { ...record };
  delete settings.id;
  return { ...emptyCollectionSettings(now), ...settings, enabled: settings.enabled ?? [], userCategories: settings.userCategories ?? [] };
}

/**
 * Change the settings with one of @shared/collections' rules, e.g.
 * `updateCollectionSettings((s) => setCollectionCategoryEnabled(s, "pins", true, Date.now()))`.
 * A rule that throws leaves the row as it was.
 */
export async function updateCollectionSettings(rule: (current: CollectionSettings) => CollectionSettings): Promise<CollectionSettings> {
  let changed = false;
  const next = await db.transaction("rw", db.collectionSettings, async () => {
    const current = settingsFromRecord(await db.collectionSettings.get(COLLECTION_SETTINGS_ID), Date.now());
    const ruled = rule(current);
    changed = ruled !== current;
    if (!changed) return current;
    // Stamp the parts this change touched, so a sync merges per category (@shared/collection-settings-merge)
    const result = stampCollectionSettings(current, ruled, Date.now());
    await db.collectionSettings.put({ ...result, id: COLLECTION_SETTINGS_ID });
    return result;
  });
  if (changed) recordWrite({ settings: next });
  return next;
}

export async function saveCollectionItem(item: CollectionItem): Promise<string> {
  if (!item?.id) throw new Error("[collection-store] an item needs an id");
  const id = await db.collectionItems.put(item);
  recordWrite({ saved: [item] });
  return id;
}

/** Several items in one write (a bulk add, moving a category's items). */
export async function saveCollectionItems(items: CollectionItem[]): Promise<void> {
  if (items.some((i) => !i?.id)) throw new Error("[collection-store] every item needs an id");
  await db.collectionItems.bulkPut(items);
  if (items.length) recordWrite({ saved: items });
}

export async function deleteCollectionItem(id: string): Promise<void> {
  await db.collectionItems.delete(id);
  recordWrite({ deleted: [id] });
}
