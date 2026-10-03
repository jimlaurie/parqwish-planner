// ==================== PACKING SUB-CATEGORY MIGRATION ====================
// One-time rename of existing packing items to the unified sub-category
// list shared with ParQwish Pal (Oct 2026): Apparel and "Clothing &
// Accessories" → Clothing, Home Decor → Home & Decor, Custom → Other, and
// so on (see normalizePackingCategory). New writes are translated by the
// hook in db.ts; this catches what was already stored. Renamed items are
// pushed so other devices and trip collaborators see the new names too.

import db, { type PackingItem } from "@/lib/db";
import { normalizePackingCategory } from "@/lib/constants";
import { auth, isSyncEnabled, canCollaborate } from "@/lib/auth";
import { pushPackingItem, pushPackingItemMirror } from "@/lib/wish-sync";

/** Items whose stored sub-category isn't its current shared name, renamed. */
export function renamedPackingItems(items: PackingItem[], now: number): PackingItem[] {
  return items
    .map((item) => ({ item, category: normalizePackingCategory(item.type, item.category) }))
    .filter(({ item, category }) => category !== item.category)
    .map(({ item, category }) => ({ ...item, category, updatedAt: now }));
}

async function pushRenamed(items: PackingItem[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const log = (err: unknown) => console.error("[CategoryMigration] push failed:", err);
  if (isSyncEnabled(user)) {
    for (const item of items) pushPackingItem(item, user.uid).catch(log);
  }
  if (!canCollaborate(user)) return;
  const byId = new Map(items.map((i) => [i.id, i]));
  const selections = await db.tripPackingSelections.where("itemId").anyOf([...byId.keys()]).toArray();
  for (const sel of selections) {
    const item = byId.get(sel.itemId);
    if (item) pushPackingItemMirror(sel.tripId, item, user.uid).catch(log);
  }
}

/** Rename every stored item to the shared list. Returns how many changed. */
export async function migratePackingCategories(): Promise<number> {
  const renamed = renamedPackingItems(await db.packingItems.toArray(), Date.now());
  if (renamed.length === 0) return 0;
  await db.packingItems.bulkPut(renamed);
  await pushRenamed(renamed);
  return renamed.length;
}
