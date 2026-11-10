// ==================== COLLECTION STORE ====================
// The Planner's memorabilia collection in IndexedDB (dland-wishes
// docs/collections-design.md): collectionItems, one row per item (not
// trip-scoped; items carry their Trip User in userId), and one
// collectionSettings row. Settings change only through the shared rules
// (@shared/collections), applied inside a transaction to the row as stored,
// so two tabs can't overwrite each other's change. Cloud Sync comes later
// (step 6); until then a delete is a plain delete.

import db, { type CollectionItem, type CollectionSettings, type CollectionSettingsRecord } from "@/lib/db";
import { emptyCollectionSettings } from "@shared/collections";
import { COLLECTION_ITEM_PREFIX } from "@shared/constants/collections";

export const COLLECTION_SETTINGS_ID = "settings";

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
export function updateCollectionSettings(rule: (current: CollectionSettings) => CollectionSettings): Promise<CollectionSettings> {
  return db.transaction("rw", db.collectionSettings, async () => {
    const current = settingsFromRecord(await db.collectionSettings.get(COLLECTION_SETTINGS_ID), Date.now());
    const next = rule(current);
    if (next !== current) await db.collectionSettings.put({ ...next, id: COLLECTION_SETTINGS_ID });
    return next;
  });
}

export function saveCollectionItem(item: CollectionItem): Promise<string> {
  if (!item?.id) return Promise.reject(new Error("[collection-store] an item needs an id"));
  return db.collectionItems.put(item);
}

/** Several items in one write (a bulk add, moving a category's items). */
export async function saveCollectionItems(items: CollectionItem[]): Promise<void> {
  if (items.some((i) => !i?.id)) throw new Error("[collection-store] every item needs an id");
  await db.collectionItems.bulkPut(items);
}

export function deleteCollectionItem(id: string): Promise<void> {
  return db.collectionItems.delete(id);
}
