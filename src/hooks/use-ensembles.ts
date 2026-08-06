"use client";

import { useLiveQuery } from "dexie-react-hooks";
import db, { type Ensemble, type PackingItem } from "@/lib/db";
import { useAppStore } from "@/lib/store";

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
   * Add all items from an ensemble to the current trip.
   * Creates TripPackingSelection entries for each item not already in the trip.
   */
  const addEnsembleToTrip = async (ensembleId: string, tripId: string) => {
    const ensemble = await db.ensembles.get(ensembleId);
    if (!ensemble) return;

    const existingSelections = await db.tripPackingSelections
      .where("tripId")
      .equals(tripId)
      .toArray();
    const existingItemIds = new Set(existingSelections.map((s) => s.itemId));

    const ownerUserId = ensemble.userId ?? "user_primary";
    const newSelections = ensemble.itemIds
      .filter((itemId) => !existingItemIds.has(itemId))
      .map((itemId) => ({
        id: `${tripId}__${itemId}`,
        tripId,
        itemId,
        completed: false,
        addedAt: Date.now(),
        userId: ownerUserId,
      }));

    if (newSelections.length > 0) {
      await db.tripPackingSelections.bulkAdd(newSelections);
    }

    return newSelections.length;
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
