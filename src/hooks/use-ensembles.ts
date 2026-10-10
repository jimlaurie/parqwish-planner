"use client";

import { useLiveQuery } from "dexie-react-hooks";
import db, { type Ensemble, type PackingItem } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import type { TripPackingSelection } from "@shared/types/packing";
import { auth, canCollaborate } from "@/lib/auth";
import { pushPackingSelection, pushPackingItemMirror } from "@/lib/wish-sync";
import { hasOwner, addSelectionOwner } from "@shared/selection-owners";

// ==================== TYPES ====================

export interface EnsembleWithItems extends Ensemble {
  items: PackingItem[];
}

export interface EnsembleFormData {
  name: string;
  description?: string;
  itemIds: string[];
  coverPhoto?: string;
}

// ==================== MAIN HOOK ====================

export function useEnsembles() {
  // All ensembles with their resolved items
  const ensembles = useLiveQuery(async () => {
    const allEnsembles = await db.ensembles.orderBy("name").toArray();
    const enriched: EnsembleWithItems[] = [];

    for (const ensemble of allEnsembles) {
      const items = await db.packingItems
        .where("id")
        .anyOf(ensemble.itemIds)
        .toArray();
      // Preserve original order from itemIds
      const orderedItems = ensemble.itemIds
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is PackingItem => !!item);
      enriched.push({ ...ensemble, items: orderedItems });
    }

    return enriched;
  }, []);

  // All catalog packing items (for the item picker)
  const allPackingItems = useLiveQuery(
    async () => {
      const items = await db.packingItems.toArray();
      return items.sort((a, b) => a.name.localeCompare(b.name));
    },
    []
  );

  // ==================== CRUD ====================

  const createEnsemble = async (data: EnsembleFormData): Promise<string> => {
    const now = Date.now();
    const id = `ensemble_${now}_${Math.random().toString(36).slice(2, 8)}`;
    await db.ensembles.add({
      id,
      name: data.name,
      description: data.description,
      itemIds: data.itemIds,
      coverPhoto: data.coverPhoto,
      userId: useAppStore.getState().currentUserId,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  };

  const updateEnsemble = async (
    id: string,
    data: Partial<EnsembleFormData>
  ) => {
    await db.ensembles.update(id, {
      ...data,
      updatedAt: Date.now(),
    });
  };

  const deleteEnsemble = async (id: string) => {
    await db.ensembles.delete(id);
  };

  // ==================== ITEM MANAGEMENT ====================

  const addItemToEnsemble = async (ensembleId: string, itemId: string) => {
    const ensemble = await db.ensembles.get(ensembleId);
    if (!ensemble) return;
    if (ensemble.itemIds.includes(itemId)) return; // Already in ensemble
    await db.ensembles.update(ensembleId, {
      itemIds: [...ensemble.itemIds, itemId],
      updatedAt: Date.now(),
    });
  };

  const removeItemFromEnsemble = async (
    ensembleId: string,
    itemId: string
  ) => {
    const ensemble = await db.ensembles.get(ensembleId);
    if (!ensemble) return;
    await db.ensembles.update(ensembleId, {
      itemIds: ensemble.itemIds.filter((id) => id !== itemId),
      updatedAt: Date.now(),
    });
  };

  const reorderItems = async (ensembleId: string, newItemIds: string[]) => {
    await db.ensembles.update(ensembleId, {
      itemIds: newItemIds,
      updatedAt: Date.now(),
    });
  };

  // ==================== TRIP INTEGRATION ====================

  /**
   * Add all items from an ensemble to the current trip, for the ensemble's
   * owner. Items not on the trip get a new TripPackingSelection; items that
   * someone else is already packing get the owner added to that selection
   * (selections can be shared — shared/selection-owners.ts). Returns how many
   * items were new to this owner.
   */
  const addEnsembleToTrip = async (ensembleId: string, tripId: string) => {
    const ensemble = await db.ensembles.get(ensembleId);
    if (!ensemble) return;

    const existingSelections = await db.tripPackingSelections
      .where("tripId")
      .equals(tripId)
      .toArray();
    const existingByItem = new Map(existingSelections.map((s) => [s.itemId, s]));

    const owner = { userId: ensemble.userId ?? "user_primary" };
    const myUid = auth.currentUser?.uid;
    const now = Date.now();
    const newSelections: TripPackingSelection[] = [];
    const joined: TripPackingSelection[] = [];
    for (const itemId of ensemble.itemIds) {
      const existing = existingByItem.get(itemId);
      if (!existing) {
        newSelections.push({
          id: `${tripId}__${itemId}`,
          tripId,
          itemId,
          completed: false,
          addedAt: now,
          updatedAt: now,
          userId: owner.userId,
          owners: [owner],
        });
      } else if (!hasOwner(existing, owner, myUid)) {
        joined.push({ ...existing, ...addSelectionOwner(existing, owner, myUid), updatedAt: now });
      }
    }

    if (newSelections.length > 0) await db.tripPackingSelections.bulkAdd(newSelections);
    if (joined.length > 0) await db.tripPackingSelections.bulkPut(joined);

    // Reach the trip's other members, like single adds in use-packing-items.
    const user = auth.currentUser;
    if (user && canCollaborate(user)) {
      for (const sel of [...newSelections, ...joined]) {
        pushPackingSelection(sel, user.uid).catch((err) => console.error("[use-ensembles] selection push failed:", err));
      }
      const items = await db.packingItems.bulkGet(newSelections.map((s) => s.itemId));
      for (const item of items) {
        if (item) pushPackingItemMirror(tripId, item, user.uid).catch((err) => console.error("[use-ensembles] mirror push failed:", err));
      }
    }

    return newSelections.length + joined.length;
  };

  return {
    ensembles: ensembles ?? [],
    allPackingItems: allPackingItems ?? [],
    loading: ensembles === undefined,
    createEnsemble,
    updateEnsemble,
    deleteEnsemble,
    addItemToEnsemble,
    removeItemFromEnsemble,
    reorderItems,
    addEnsembleToTrip,
  };
}
