"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Wish, type TripWishSelection, type WishStatus } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { PRIORITY_SORT_ORDER, WISH_TAGS } from "@/lib/constants";
import type { WishFormData } from "@/components/WishFormModal";
import { auth, isSyncEnabled, canCollaborate } from "@/lib/auth";
import { pushWish, deleteWishRemote, pushSelection, deleteSelectionRemote, pushWishMirror, deleteWishMirrorRemote } from "@/lib/wish-sync";

// ==================== TYPES ====================

export interface WishWithStatus extends Wish {
  selectionId: string;
  completed: boolean;
  status: WishStatus;
  userId?: string;
  authorUid?: string;
}

// ==================== MAIN HOOK ====================

export function useTripWishes() {
  const { currentTripId, currentUserId, activeUserFilter, wishFilters } = useAppStore();

  // Reactive query: junction → join → catalog
  const allWishes = useLiveQuery(
    async () => {
      if (!currentTripId) return [];

      const selections = await db.tripWishSelections
        .where("tripId")
        .equals(currentTripId)
        .toArray();

      if (selections.length === 0) return [];

      const wishIds = selections.map((s) => s.wishId);
      const wishes = await db.wishes.bulkGet(wishIds);

      const result: WishWithStatus[] = [];
      for (let i = 0; i < selections.length; i++) {
        const wish = wishes[i];
        const sel = selections[i];
        if (wish) {
          result.push({
            ...wish,
            selectionId: sel.id,
            completed: sel.completed,
            status: sel.status,
            userId: sel.userId,
            authorUid: sel.authorUid,
          });
        }
      }
      return result;
    },
    [currentTripId]
  );

  // Client-side filtering and sorting
  const filteredWishes = useMemo(() => {
    if (!allWishes) return [];

    let result = [...allWishes];

    // Filter: user
    if (activeUserFilter) {
      const filterSet = new Set(activeUserFilter);
      result = result.filter((w) => filterSet.has(w.userId ?? "user_primary"));
    }

    // Filter: completed
    if (!wishFilters.showCompleted) {
      result = result.filter((w) => !w.completed);
    }

    // Filter: tags
    if (wishFilters.selectedTags.length > 0) {
      result = result.filter((w) =>
        w.tags.some((t) => wishFilters.selectedTags.includes(t))
      );
    }

    // Filter: search
    if (wishFilters.searchQuery.trim()) {
      const q = wishFilters.searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          (w.notes?.toLowerCase().includes(q) ?? false) ||
          (w.description?.toLowerCase().includes(q) ?? false)
      );
    }

    // Sort
    switch (wishFilters.sortBy) {
      case "priority":
        result.sort(
          (a, b) =>
            (PRIORITY_SORT_ORDER[a.priority] ?? 4) -
            (PRIORITY_SORT_ORDER[b.priority] ?? 4)
        );
        break;
      case "newest":
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [allWishes, activeUserFilter, wishFilters]);

  // Stats
  const stats = useMemo(() => {
    const wishes = allWishes ?? [];
    const total = wishes.length;
    const completed = wishes.filter((w) => w.completed).length;
    const pending = total - completed;

    const byTag: Record<string, number> = {};
    for (const tag of WISH_TAGS) {
      byTag[tag.id] = wishes.filter((w) => w.tags.includes(tag.id)).length;
    }

    return { total, completed, pending, byTag };
  }, [allWishes]);

  // ==================== CRUD ====================

  const addWish = async (data: WishFormData) => {
    if (!currentTripId) return null;
    const id = `wish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    await db.transaction("rw", [db.wishes, db.tripWishSelections], async () => {
      const wish: Wish = {
        id,
        title: data.title,
        notes: data.notes,
        url: data.url,
        tags: data.tags,
        priority: data.priority,
        photos: data.photos,
        parkDataId: data.parkDataId,
        parkDataName: data.parkDataName,
        park: data.park,
        land: data.land,
        maxWaitTime: data.maxWaitTime,
        sourceType: "app",
        createdAt: now,
        updatedAt: now,
        userId: currentUserId,
      };
      await db.wishes.add(wish);

      const selection: TripWishSelection = {
        id: `${currentTripId}__${id}`,
        tripId: currentTripId,
        wishId: id,
        completed: false,
        status: "idea",
        addedAt: now,
        updatedAt: now,
        userId: currentUserId,
      };
      await db.tripWishSelections.add(selection);

      // Two independent syncs: the account catalog (Apple-gated — this is
      // this account's own cross-device wish list) and the trip content
      // (any signed-in identity — pushSelection is just the reference, the
      // mirror carries the actual title/notes/etc so other members can
      // decrypt it without access to this account's own catalog).
      const user = auth.currentUser;
      if (user && isSyncEnabled(user)) {
        pushWish(wish, user.uid).catch(() => {
          db.wishes.update(id, { pendingSync: 1 } as Partial<Wish>);
        });
      } else {
        db.wishes.update(id, { pendingSync: 1 } as Partial<Wish>);
      }
      if (user && canCollaborate(user)) {
        pushSelection(selection, user.uid).catch(() => {});
        pushWishMirror(currentTripId, wish, user.uid).catch(() => {});
      }
    });

    return id;
  };

  const updateWish = async (id: string, updates: Partial<WishFormData>) => {
    await db.wishes.update(id, { ...updates, updatedAt: Date.now() });

    const user = auth.currentUser;
    if (user && isSyncEnabled(user)) {
      const updated = await db.wishes.get(id);
      if (updated) pushWish(updated, user.uid).catch(() => {
        db.wishes.update(id, { pendingSync: 1 } as Partial<Wish>);
      });
    } else {
      db.wishes.update(id, { pendingSync: 1 } as Partial<Wish>);
    }

    // Re-push the trip mirror too, if this wish is currently selected into
    // the active trip — otherwise an edit made after the initial add would
    // never reach other members.
    if (user && canCollaborate(user) && currentTripId) {
      const sel = await db.tripWishSelections.get(`${currentTripId}__${id}`);
      if (sel) {
        const updated = await db.wishes.get(id);
        if (updated) pushWishMirror(currentTripId, updated, user.uid).catch(() => {});
      }
    }
  };

  const toggleCompleted = async (id: string) => {
    if (!currentTripId) return;
    const selId = `${currentTripId}__${id}`;
    const sel = await db.tripWishSelections.get(selId);
    if (!sel) return;
    const updates = { completed: !sel.completed, status: sel.completed ? "idea" : "completed", updatedAt: Date.now() } as Partial<TripWishSelection>;
    await db.tripWishSelections.update(selId, updates);
    const user = auth.currentUser;
    if (user && canCollaborate(user)) {
      const updated = await db.tripWishSelections.get(selId);
      if (updated) pushSelection(updated, user.uid).catch(() => {});
    }
  };

  const unselectWish = async (id: string) => {
    if (!currentTripId) return;
    const selId = `${currentTripId}__${id}`;
    await db.tripWishSelections.delete(selId);
    const user = auth.currentUser;
    if (user && canCollaborate(user)) {
      deleteSelectionRemote(selId, user.uid, currentTripId).catch(() => {});
      deleteWishMirrorRemote(currentTripId, id, user.uid).catch(() => {});
    }
  };

  const deleteWishForever = async (id: string) => {
    const affectedTripIds = (
      await db.tripWishSelections.where("wishId").equals(id).toArray()
    ).map((s) => s.tripId);

    await db.transaction("rw", [db.wishes, db.tripWishSelections], async () => {
      await db.tripWishSelections.where("wishId").equals(id).delete();
      await db.wishes.delete(id);
    });

    const user = auth.currentUser;
    if (user && isSyncEnabled(user)) {
      deleteWishRemote(id, user.uid).catch(() => {});
    }
    if (user && canCollaborate(user)) {
      affectedTripIds.forEach((tripId) => {
        deleteWishMirrorRemote(tripId, id, user.uid).catch(() => {});
      });
    }
  };

  const selectExistingWish = async (wishId: string) => {
    if (!currentTripId) return;
    const selId = `${currentTripId}__${wishId}`;
    const existing = await db.tripWishSelections.get(selId);
    if (existing) return; // already selected

    const now = Date.now();
    const selection: TripWishSelection = {
      id: selId,
      tripId: currentTripId,
      wishId,
      completed: false,
      status: "idea",
      addedAt: now,
      updatedAt: now,
      userId: currentUserId,
    };
    await db.tripWishSelections.add(selection);

    const user = auth.currentUser;
    if (user && canCollaborate(user)) {
      pushSelection(selection, user.uid).catch(() => {});
      const wish = await db.wishes.get(wishId);
      if (wish) pushWishMirror(currentTripId, wish, user.uid).catch(() => {});
    }
  };

  const getWishById = async (id: string) => {
    return db.wishes.get(id);
  };

  /**
   * Add a park-catalog item to the trip, reusing an existing wish for the
   * same parkDataId instead of creating a duplicate. The existence check and
   * the write happen inside one transaction — IndexedDB serializes
   * transactions touching the same stores, so a rapid double-click (the
   * previous check-then-write shape let both clicks pass the check before
   * either write committed) can no longer create two wishes for one park
   * entity. See docs/sync-architecture.md gap #1.
   */
  const addOrSelectWish = async (data: WishFormData): Promise<string | null> => {
    if (!currentTripId || !data.parkDataId) return null;
    const parkDataId = data.parkDataId;
    const tripId = currentTripId;
    const now = Date.now();

    const result = await db.transaction(
      "rw",
      [db.wishes, db.tripWishSelections],
      async (): Promise<{ resultId: string; createdWish: Wish | null; selection: TripWishSelection | null }> => {
        const existing = await db.wishes.filter((w) => w.parkDataId === parkDataId).first();

        if (existing) {
          const selId = `${tripId}__${existing.id}`;
          const existingSel = await db.tripWishSelections.get(selId);
          if (existingSel) return { resultId: existing.id, createdWish: null, selection: null };

          const selection: TripWishSelection = {
            id: selId,
            tripId,
            wishId: existing.id,
            completed: false,
            status: "idea",
            addedAt: now,
            updatedAt: now,
            userId: currentUserId,
          };
          await db.tripWishSelections.add(selection);
          return { resultId: existing.id, createdWish: null, selection };
        }

        const id = `wish_${now}_${Math.random().toString(36).slice(2, 6)}`;
        const createdWish: Wish = {
          id,
          title: data.title,
          notes: data.notes,
          url: data.url,
          tags: data.tags,
          priority: data.priority,
          photos: data.photos,
          parkDataId: data.parkDataId,
          parkDataName: data.parkDataName,
          park: data.park,
          land: data.land,
          maxWaitTime: data.maxWaitTime,
          sourceType: "app",
          createdAt: now,
          updatedAt: now,
          userId: currentUserId,
        };
        await db.wishes.add(createdWish);

        const selection: TripWishSelection = {
          id: `${tripId}__${id}`,
          tripId,
          wishId: id,
          completed: false,
          status: "idea",
          addedAt: now,
          updatedAt: now,
          userId: currentUserId,
        };
        await db.tripWishSelections.add(selection);

        return { resultId: id, createdWish, selection };
      }
    );

    const { resultId, createdWish, selection } = result;
    if (!selection) return resultId; // was already selected — nothing more to sync

    const user = auth.currentUser;
    if (createdWish) {
      const wish = createdWish;
      if (user && isSyncEnabled(user)) {
        pushWish(wish, user.uid).catch(() => {
          db.wishes.update(wish.id, { pendingSync: 1 } as Partial<Wish>);
        });
      } else {
        db.wishes.update(wish.id, { pendingSync: 1 } as Partial<Wish>);
      }
    }
    if (user && canCollaborate(user)) {
      pushSelection(selection, user.uid).catch(() => {});
      const mirrorWish = createdWish ?? (await db.wishes.get(selection.wishId));
      if (mirrorWish) pushWishMirror(tripId, mirrorWish, user.uid).catch(() => {});
    }

    return resultId;
  };

  return {
    wishes: filteredWishes,
    allWishes: allWishes ?? [],
    stats,
    addWish,
    updateWish,
    toggleCompleted,
    unselectWish,
    deleteWishForever,
    selectExistingWish,
    addOrSelectWish,
    getWishById,
    loading: allWishes === undefined,
  };
}

// ==================== CATALOG HOOK ====================

export function useCatalogWishes() {
  const { currentTripId } = useAppStore();

  const items = useLiveQuery(
    async () => {
      const allWishes = await db.wishes.toArray();
      if (!currentTripId) return allWishes;

      // Exclude wishes already selected for this trip
      const selections = await db.tripWishSelections
        .where("tripId")
        .equals(currentTripId)
        .toArray();
      const selectedIds = new Set(selections.map((s) => s.wishId));
      return allWishes.filter((w) => !selectedIds.has(w.id));
    },
    [currentTripId]
  );

  return { items: items ?? [], loading: items === undefined };
}
