// ==================== SHARE SAVE ====================
// Saves a page shared to the Planner (the /share page: the installed app's
// share target, or a link from a bookmarklet or Shortcut) as the item the
// chosen destination names, made as that page's own "+ Add" makes it, and
// sends it to Cloud Sync where that's on. The choices and the item's name and
// notes are shared with Pal (@shared/share-targets); Dining is the Planner's own.

import { auth, isSyncEnabled } from "@/lib/auth";
import { pushWish } from "@/lib/wish-sync";
import { syncCatalogPackingItem } from "@/hooks/use-packing-items";
import { COLLECTION_SETTINGS_ID, newCollectionItemId, saveCollectionItem, settingsFromRecord } from "@/lib/collection-store";
import { DEFAULT_PACKING_CATEGORY, PACKING_TABS } from "@/lib/constants";
import db, { type PackingItem, type PackingType } from "@/lib/db";
import type { Wish } from "@shared/types/wish";
import { collectionFormFields, enabledCollectionCategories } from "@shared/collections";
import { collectionDraftFromItem, collectionItemFromDraft } from "@shared/collection-editor";
import { UNCATEGORISED_COLLECTION } from "@shared/constants/collections";
import { shareChoices, shareHost, sharedNotes, suggestedShareDestination, type ShareChoice, type ShareDestination } from "@shared/share-targets";

export type PlannerShareDestination = ShareDestination | "dining";

export interface SharedPage {
  title: string;
  text: string;
  url: string;
}

const DINING: ShareChoice<PlannerShareDestination> = { id: "dining", icon: "🍽️", label: "Dining" };

/** Pal's choices, with Dining after Shopping (the Catalog's own tab order). */
export function plannerShareChoices(collectionsAvailable: boolean): ShareChoice<PlannerShareDestination>[] {
  const choices: ShareChoice<PlannerShareDestination>[] = [...shareChoices(collectionsAvailable)];
  choices.splice(choices.findIndex((c) => c.id === "shopping") + 1, 0, DINING);
  return choices;
}

/** Reservation sites suggest Dining; the rest as Pal suggests. */
export function plannerSuggestedDestination(url: string, choices: ShareChoice<PlannerShareDestination>[]): PlannerShareDestination {
  const host = shareHost(url);
  if (/(^|\.)(opentable|resy|tock)\.com$/.test(host) || (/(^|\.)disney\.go\.com$/.test(host) && /\/dining\//i.test(url))) return "dining";
  return suggestedShareDestination(url, choices);
}

function syncUid(): string | null {
  const user = auth.currentUser;
  return user && isSyncEnabled(user) ? user.uid : null;
}

async function saveWish(page: SharedPage, name: string, userId: string): Promise<string> {
  const now = Date.now();
  const wish: Wish = {
    id: `wish_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: name, notes: sharedNotes(page, true, name) || undefined, url: page.url || undefined,
    tags: [], priority: "C", createdAt: now, updatedAt: now, userId,
  };
  await db.wishes.add(wish);
  const uid = syncUid();
  if (uid) pushWish(wish, uid).catch(() => db.wishes.update(wish.id, { pendingSync: 1 } as Partial<Wish>));
  return wish.id;
}

async function savePackingItem(type: PackingType, page: SharedPage, name: string, userId: string): Promise<string> {
  const now = Date.now();
  const prefix = PACKING_TABS.find((t) => t.id === type)?.idPrefix ?? "item_";
  // Only shopping items keep a link of their own (PackingFormModal); the rest carry it in their notes
  const linkField = type === "shopping";
  const item: PackingItem = {
    id: `${prefix}${now}_${Math.random().toString(36).slice(2, 8)}`,
    type, name, notes: sharedNotes(page, linkField, name) || undefined, category: DEFAULT_PACKING_CATEGORY, priority: "C",
    ...(linkField && page.url ? { url: page.url } : {}),
    createdAt: now, updatedAt: now, userId,
  };
  await db.packingItems.add(item);
  // Sent now, not at the next sync start, so Pal sees it straight away
  await syncCatalogPackingItem(item);
  return item.id;
}

/** A Want in the first category switched on (Uncategorised before the first visit picks some). */
async function saveCollectionShare(page: SharedPage, name: string, userId: string): Promise<string> {
  const now = Date.now();
  const settings = settingsFromRecord(await db.collectionSettings.get(COLLECTION_SETTINGS_ID), now);
  const category = enabledCollectionCategories(settings)[0]?.id ?? UNCATEGORISED_COLLECTION.id;
  const draft = {
    ...collectionDraftFromItem(undefined, category, "want", userId),
    name, notes: sharedNotes(page, true, name), externalUrl: page.url,
  };
  const item = collectionItemFromDraft(draft, collectionFormFields(settings, category), undefined, undefined, newCollectionItemId(now), userId, now);
  return saveCollectionItem(item);
}

/** Save the shared page as `dest`; returns the new item's id. */
export async function saveSharedPage(dest: PlannerShareDestination, page: SharedPage, name: string, userId: string): Promise<string> {
  if (!name.trim()) throw new Error("[share-save] the item needs a name");
  if (dest === "wish") return saveWish(page, name, userId);
  if (dest === "collection") return saveCollectionShare(page, name, userId);
  return savePackingItem(dest, page, name, userId);
}
