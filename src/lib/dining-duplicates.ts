// ==================== DINING DUPLICATE CLEANUP ====================
// One-time repair for a file-import bug fixed in 6.0.50: importing a file
// that contained a restaurant the trip already had as a dining *wish*
// created a second copy as a dining packing item (Prepare › Dining). This
// finds those copies and folds them back into the wish: photos move onto
// the wish, itinerary entries are repointed, and the copy is removed from
// the trip (and from the catalog when no other trip uses it).
//
// Deliberately conservative — a copy is left alone if it holds anything
// the wish can't carry (reservation confirmation, party size, dietary
// notes, its own notes) or if it's been scheduled on Preview's timeline.

import db from "@/lib/db";
import type { Wish, PackingItem, TripPackingSelection, TripWishSelection } from "@/lib/db";
import { auth, isSyncEnabled, canCollaborate } from "@/lib/auth";
import {
  pushWish,
  deletePackingItemRemote,
  deletePackingSelectionRemote,
  deletePackingItemMirrorRemote,
} from "@/lib/wish-sync";

export interface DiningDuplicate {
  tripId: string;
  itemId: string;
  wishId: string;
}

interface DuplicateInput {
  wishes: Wish[];
  wishSelections: TripWishSelection[];
  packingItems: PackingItem[];
  packingSelections: TripPackingSelection[];
}

// ==================== DETECTION (pure) ====================

/** Does this dining wish describe the same restaurant as the packing item? */
export function isSameRestaurant(item: PackingItem, wish: Wish): boolean {
  for (const linked of item.linkedParkDataIds ?? []) {
    if (linked === wish.id) return true;
    const pd = wish.parkDataId;
    if (pd && (pd === linked || pd.endsWith(`__${linked}`) || linked.endsWith(`__${pd}`))) return true;
  }
  const name = item.name.trim().toLowerCase();
  if (!name) return false;
  return [wish.title, wish.parkDataName].some((n) => n?.trim().toLowerCase() === name);
}

/** True when the copy holds details the wish has no field for. */
function hasOwnDetails(item: PackingItem): boolean {
  return Boolean(
    item.reservationConfirmation?.trim() || item.partySize || item.dietaryNotes?.trim() || item.notes?.trim()
  );
}

export function findDiningDuplicates(input: DuplicateInput, scheduledItemIds: Set<string>): DiningDuplicate[] {
  const preconditionOk = Array.isArray(input.wishes) && Array.isArray(input.packingItems);
  if (!preconditionOk) return [];

  const wishById = new Map(input.wishes.map((w) => [w.id, w]));
  const itemById = new Map(input.packingItems.map((p) => [p.id, p]));
  const diningWishesByTrip = new Map<string, Wish[]>();
  for (const sel of input.wishSelections) {
    const wish = wishById.get(sel.wishId);
    if (!wish?.tags?.includes("eats")) continue;
    diningWishesByTrip.set(sel.tripId, [...(diningWishesByTrip.get(sel.tripId) ?? []), wish]);
  }

  const found: DiningDuplicate[] = [];
  for (const sel of input.packingSelections) {
    const item = itemById.get(sel.itemId);
    if (!item || item.type !== "dining" || hasOwnDetails(item) || scheduledItemIds.has(item.id)) continue;
    const wish = diningWishesByTrip.get(sel.tripId)?.find((w) => isSameRestaurant(item, w));
    if (wish) found.push({ tripId: sel.tripId, itemId: item.id, wishId: wish.id });
  }
  return found;
}

// ==================== REPAIR (I/O) ====================

/** Move the copy's photos onto the wish, skipping any it already has. */
async function mergePhotos(item: PackingItem, wishId: string): Promise<Wish | undefined> {
  const wish = await db.wishes.get(wishId);
  if (!wish) return undefined;
  const flat = (item.photos ?? []).filter((p) => !(wish.photos ?? []).includes(p));
  const sets = (item.photoSets ?? []).filter((s) => !(wish.photoSets ?? []).some((w) => w.full === s.full));
  if (flat.length === 0 && sets.length === 0) return undefined;
  const changes = {
    photos: [...(wish.photos ?? []), ...flat],
    photoSets: [...(wish.photoSets ?? []), ...sets],
    updatedAt: Date.now(),
  };
  await db.wishes.update(wishId, changes);
  return { ...wish, ...changes };
}

/** Repoint the copy's itinerary entries at the wish, dropping any the wish already has. */
async function repointItinerary(dup: DiningDuplicate): Promise<void> {
  const entries = await db.itineraryItems.where("tripId").equals(dup.tripId)
    .filter((i) => i.sourceId === dup.itemId).toArray();
  for (const entry of entries) {
    const wishEntry = await db.itineraryItems.where("[tripId+date]").equals([dup.tripId, entry.date])
      .filter((i) => i.sourceType === "wish" && i.sourceId === dup.wishId).first();
    if (wishEntry) await db.itineraryItems.delete(entry.id);
    else await db.itineraryItems.update(entry.id, { sourceType: "wish", sourceId: dup.wishId, updatedAt: Date.now() });
  }
}

/** Fold one copy into its wish. Returns true when photos moved onto the wish. */
async function repairOne(dup: DiningDuplicate): Promise<boolean> {
  const item = await db.packingItems.get(dup.itemId);
  if (!item) return false;
  const merged = await mergePhotos(item, dup.wishId);
  await repointItinerary(dup);
  await db.tripPackingSelections.delete(`${dup.tripId}__${dup.itemId}`);
  return merged !== undefined;
}

/** Push the deletions and photo moves so other devices (and the next pull) agree. */
function pushChanges(dups: DiningDuplicate[], deletedItemIds: string[], mergedWishes: Wish[]): void {
  const user = auth.currentUser;
  if (!user) return;
  const log = (what: string) => (err: unknown) => console.error(`[DiningCleanup] ${what} failed:`, err);
  if (canCollaborate(user)) {
    for (const d of dups) {
      deletePackingSelectionRemote(`${d.tripId}__${d.itemId}`, user.uid, d.tripId).catch(log("selection delete"));
      deletePackingItemMirrorRemote(d.tripId, d.itemId, user.uid).catch(log("mirror delete"));
    }
  }
  if (isSyncEnabled(user)) {
    for (const id of deletedItemIds) deletePackingItemRemote(id, user.uid).catch(log("item delete"));
    for (const wish of mergedWishes) pushWish(wish, user.uid).catch(log("wish push"));
  }
}

/** Find and fold every duplicate on this device. Returns how many were removed. */
export async function cleanUpDiningDuplicates(): Promise<number> {
  const [wishes, wishSelections, packingItems, packingSelections, dayItems] = await Promise.all([
    db.wishes.toArray(),
    db.tripWishSelections.toArray(),
    db.packingItems.where("type").equals("dining").toArray(),
    db.tripPackingSelections.toArray(),
    db.dayItems.toArray(),
  ]);
  const scheduled = new Set(dayItems.map((d) => d.sourceId).filter((id): id is string => Boolean(id)));
  const dups = findDiningDuplicates({ wishes, wishSelections, packingItems, packingSelections }, scheduled);
  if (dups.length === 0) return 0;

  const mergedWishIds = new Set<string>();
  for (const dup of dups) {
    if (await repairOne(dup)) mergedWishIds.add(dup.wishId);
  }
  const mergedWishes = (await db.wishes.bulkGet([...mergedWishIds])).filter((w): w is Wish => Boolean(w));

  const deletedItemIds: string[] = [];
  for (const itemId of new Set(dups.map((d) => d.itemId))) {
    if (await db.tripPackingSelections.where("itemId").equals(itemId).count() > 0) continue;
    await db.packingItems.delete(itemId);
    deletedItemIds.push(itemId);
  }

  pushChanges(dups, deletedItemIds, mergedWishes);
  return dups.length;
}
