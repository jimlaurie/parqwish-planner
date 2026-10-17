// ==================== REASSIGN A REMOVED TRIP USER ====================
// When a Trip User is removed — on this device (use-users deleteUser) or on
// another one and synced down (wish-sync applyRemoteTripUser) — everything
// that was theirs goes to the primary user instead of being orphaned:
// trip selections and day items, and the saved wishes, packing items and
// ensembles they created (the Catalog page filters and badges by those).

import db from "./db";
import { reassignSelectionOwner } from "@shared/selection-owners";
import type { SelectionOwner } from "@shared/types/wish";

const PRIMARY_USER_ID = "user_primary";

/** The saved items whose creator changed, so the caller can push them. */
export interface ReassignedItems {
  wishIds: string[];
  packingItemIds: string[];
}

type OwnedSelection = { userId?: string; authorUid?: string; owners?: SelectionOwner[] };

/**
 * Hands everything owned by `removedUserId` to the primary user, in one
 * transaction. Selections can be shared (shared/selection-owners.ts), so the
 * removed person may be any owner: they're swapped for the primary user,
 * without a duplicate if the primary user already had it. Saved items get a
 * new `updatedAt`, so the change wins in Cloud Sync's last-write-wins.
 */
export async function reassignRemovedUser(removedUserId: string, myUid?: string): Promise<ReassignedItems> {
  if (!removedUserId || removedUserId === PRIMARY_USER_ID) return { wishIds: [], packingItemIds: [] };

  const reassignSelection = (sel: OwnedSelection) => {
    const next = reassignSelectionOwner(sel, removedUserId, myUid);
    if (!next) return;
    sel.owners = next.owners;
    sel.userId = next.userId;
  };
  const toPrimary = { userId: PRIMARY_USER_ID, updatedAt: Date.now() };
  const created = (row: { userId?: string }) => row.userId === removedUserId;

  return db.transaction("rw", [db.tripWishSelections, db.tripPackingSelections, db.dayItems, db.wishes, db.packingItems, db.ensembles], async () => {
    await db.tripWishSelections.toCollection().modify(reassignSelection);
    await db.tripPackingSelections.toCollection().modify(reassignSelection);
    await db.dayItems.where("userId").equals(removedUserId).modify({ userId: PRIMARY_USER_ID });

    const wishIds = (await db.wishes.filter(created).primaryKeys()) as string[];
    const packingItemIds = (await db.packingItems.filter(created).primaryKeys()) as string[];
    await db.wishes.filter(created).modify(toPrimary);
    await db.packingItems.filter(created).modify(toPrimary);
    await db.ensembles.where("userId").equals(removedUserId).modify(toPrimary);
    return { wishIds, packingItemIds };
  });
}
