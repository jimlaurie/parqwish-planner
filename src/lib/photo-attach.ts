// ==================== PHOTO ATTACH ====================
// Putting a photo onto one of your items: a wish, a packing item (outfits,
// equipment, sundries, shopping) or a collection item (27 Nov 2026).
//   - Catalog › Photos' "Add to items…" on an unlinked photo moves it onto
//     the items picked (decided 27 Nov 2026: moved, not copied, so it isn't
//     in All photos twice);
//   - an editor's "From Photo Gallery" adds a gallery photo to the item
//     being edited (that goes through the editor's own save instead).
// Saved the way each kind is saved elsewhere, so Cloud Sync carries it
// (thumbnails only).

import db, { type CollectionItem, type PackingItem, type Wish } from "@/lib/db";
import type { PhotoResolutions } from "@/lib/image-utils";
import { auth } from "@/lib/auth";
import { pushWish, pushPackingItem } from "@/lib/wish-sync";
import { saveCollectionItem } from "@/lib/collection-store";
import { removeTripPhoto } from "@/hooks/use-trip-photos";

/** Most photos an item keeps (the editors' PhotoPicker limit). */
export const MAX_ITEM_PHOTOS = 5;

export type AttachKind = "wish" | "packing" | "collection";

export interface AttachTarget {
  kind: AttachKind;
  id: string;
  /** The item's name, for messages. */
  name: string;
}

export type AttachOutcome = "added" | "already" | "full" | "missing";

/** `sets` with `added` appended, unless it's there already (same display copy) or the item is full. */
export function withPhoto(sets: PhotoResolutions[], added: PhotoResolutions): { sets: PhotoResolutions[]; outcome: AttachOutcome } {
  if (sets.some((s) => s.display === added.display || s.full === added.full)) return { sets, outcome: "already" };
  if (sets.length >= MAX_ITEM_PHOTOS) return { sets, outcome: "full" };
  return { sets: [...sets, added], outcome: "added" };
}

/** An item's photos as photoSets (older items keep flat photos[], one image for every size). */
function setsOf(item: { photoSets?: PhotoResolutions[]; photos?: string[] }): PhotoResolutions[] {
  if (item.photoSets?.length) return item.photoSets;
  return (item.photos ?? []).map((p) => ({ thumbnail: p, display: p, full: p }));
}

async function attachToWish(id: string, photo: PhotoResolutions): Promise<AttachOutcome> {
  const wish = await db.wishes.get(id);
  if (!wish) return "missing";
  const { sets, outcome } = withPhoto(setsOf(wish), photo);
  if (outcome !== "added") return outcome;
  const updated: Wish = { ...wish, photoSets: sets, photos: wish.photoSets?.length ? wish.photos : [], updatedAt: Date.now() };
  await db.wishes.put(updated);
  if (auth.currentUser) pushWish(updated, auth.currentUser.uid).catch((e) => console.error("[photo-attach] wish push failed:", e));
  return outcome;
}

async function attachToPacking(id: string, photo: PhotoResolutions): Promise<AttachOutcome> {
  const item = await db.packingItems.get(id);
  if (!item) return "missing";
  const { sets, outcome } = withPhoto(setsOf(item), photo);
  if (outcome !== "added") return outcome;
  const updated: PackingItem = { ...item, photoSets: sets, photos: item.photoSets?.length ? item.photos : [], updatedAt: Date.now() };
  await db.packingItems.put(updated);
  if (auth.currentUser) pushPackingItem(updated, auth.currentUser.uid).catch((e) => console.error("[photo-attach] packing push failed:", e));
  return outcome;
}

async function attachToCollection(id: string, photo: PhotoResolutions): Promise<AttachOutcome> {
  const item = await db.collectionItems.get(id);
  if (!item) return "missing";
  const { sets, outcome } = withPhoto(item.photoSets ?? [], photo);
  if (outcome !== "added") return outcome;
  const updated: CollectionItem = { ...item, photoSets: sets, updatedAt: Date.now() };
  await saveCollectionItem(updated);
  return outcome;
}

/** Puts the photo on one item. */
export function attachPhoto(target: AttachTarget, photo: PhotoResolutions): Promise<AttachOutcome> {
  if (target.kind === "wish") return attachToWish(target.id, photo);
  if (target.kind === "packing") return attachToPacking(target.id, photo);
  return attachToCollection(target.id, photo);
}

export interface MoveResult {
  /** Items it was added to (or already had it). */
  placed: AttachTarget[];
  /** Items that already had MAX_ITEM_PHOTOS photos. */
  full: AttachTarget[];
  /** Whether the unlinked copy was removed (only once it's on at least one item). */
  moved: boolean;
}

/**
 * Moves an unlinked trip photo onto the items: added to each, then the
 * unlinked copy removed, but only if at least one item now has it, so a
 * photo is never lost.
 */
export async function moveTripPhotoToItems(tripPhotoId: string, photo: PhotoResolutions, targets: AttachTarget[]): Promise<MoveResult> {
  const placed: AttachTarget[] = [];
  const full: AttachTarget[] = [];
  for (const target of targets) {
    const outcome = await attachPhoto(target, photo);
    if (outcome === "added" || outcome === "already") placed.push(target);
    else if (outcome === "full") full.push(target);
  }
  if (placed.length > 0) await removeTripPhoto(tripPhotoId);
  return { placed, full, moved: placed.length > 0 };
}
