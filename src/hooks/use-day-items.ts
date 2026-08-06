"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type DayItemRecord } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import type { DayItemType } from "@shared/types/day-item";
import { auth, canCollaborate } from "@/lib/auth";
import { pushDayItem, deleteDayItemRemote } from "@/lib/wish-sync";

// Day items live entirely under sharedTrips/{tripId}/dayItems — no
// account-scoped catalog to worry about, so any signed-in identity
// (not just Apple) can push/delete them. See auth.ts canCollaborate().

function syncDayItem(item: DayItemRecord) {
  const user = auth.currentUser;
  if (user && canCollaborate(user)) {
    pushDayItem(item, user.uid).catch((e) =>
      console.warn("[use-day-items] push failed:", e)
    );
  }
}

function syncDeleteDayItem(id: string, tripId: string) {
  const user = auth.currentUser;
  if (user && canCollaborate(user)) {
    deleteDayItemRemote(id, user.uid, tripId).catch((e) =>
      console.warn("[use-day-items] delete sync failed:", e)
    );
  }
}

// Standalone batch insert — not tied to a single useDayItems(date) instance,
// so callers like the Catalog's bulk "Add to Day" (which lets the user pick
// an arbitrary trip day) can use it without mounting a hook per date.
// Reads one fresh snapshot of existing items and computes sortOrder for the
// whole batch in a single pass, then does one bulkAdd — sequential awaited
// addItem() calls would race on sortOrder because addItem reads it from
// render-time hook state.
export async function addDayItemsBatch(
  tripId: string,
  date: string,
  userId: string,
  entries: AddDayItemParams[]
): Promise<string[]> {
  if (entries.length === 0) return [];

  const existing = await db.dayItems
    .where("[tripId+date]")
    .equals([tripId, date])
    .toArray();

  const maxSortBySlot = new Map<string | undefined, number>();
  for (const item of existing) {
    const key = item.scheduledTime;
    maxSortBySlot.set(key, Math.max(maxSortBySlot.get(key) ?? -1, item.sortOrder));
  }

  const now = Date.now();
  const records: DayItemRecord[] = entries.map((params, i) => {
    const key = params.scheduledTime;
    const nextSort = (maxSortBySlot.get(key) ?? -1) + 1;
    maxSortBySlot.set(key, nextSort);
    return {
      id:              `day_${now}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      tripId,
      userId,
      date,
      scheduledTime:   params.scheduledTime,
      durationMinutes: params.durationMinutes,
      sortOrder:       nextSort,
      title:           params.title,
      itemType:        params.itemType,
      park:            params.park,
      land:            params.land,
      notes:           params.notes,
      priority:        params.priority,
      tags:            params.tags,
      photos:          params.photos,
      sourceId:        params.sourceId,
      parkDataId:      params.parkDataId,
      completed:       false,
      createdAt:       now,
      updatedAt:       now,
    };
  });

  await db.dayItems.bulkAdd(records);
  for (const record of records) syncDayItem(record);
  return records.map((r) => r.id);
}

// ==================== TYPES ====================

export type { DayItemRecord };

export interface DayItemStats {
  total: number;
  completed: number;
  byPark: Record<string, number>;
}

export type AddDayItemParams = {
  title: string;
  itemType: DayItemType;
  scheduledTime?: string;     // HH:MM 24-hour; omit for "Anytime"
  durationMinutes?: number;
  park?: string;
  land?: string;
  notes?: string;
  priority?: string;
  tags?: string[];
  photos?: string[];
  sourceId?: string;
  parkDataId?: string;
};

// ==================== HOOK ====================

export function useDayItems(date: string | null) {
  const { currentTripId, currentUserId, activeUserFilter } = useAppStore();

  // ---- Live query ----

  const rawItems = useLiveQuery(
    async () => {
      if (!currentTripId || !date) return [];
      return db.dayItems
        .where("[tripId+date]")
        .equals([currentTripId, date])
        .toArray();
    },
    [currentTripId, date]
  );

  // ---- Sort + user filter ----

  const items = useMemo<DayItemRecord[]>(() => {
    let list = rawItems ?? [];
    if (activeUserFilter) {
      const filterSet = new Set(activeUserFilter);
      list = list.filter((i) => filterSet.has(i.userId ?? "user_primary"));
    }
    return [...list].sort((a, b) => {
      const aHasTime = !!a.scheduledTime;
      const bHasTime = !!b.scheduledTime;
      if (!aHasTime && !bHasTime) return a.sortOrder - b.sortOrder;
      if (!aHasTime) return -1; // Anytime before timed
      if (!bHasTime) return 1;
      const timeCmp = a.scheduledTime!.localeCompare(b.scheduledTime!);
      return timeCmp !== 0 ? timeCmp : a.sortOrder - b.sortOrder;
    });
  }, [rawItems, activeUserFilter]);

  // ---- Derived views ----

  const anytimeItems = useMemo(
    () => items.filter((i) => !i.scheduledTime),
    [items]
  );

  const timedItems = useMemo(
    () => items.filter((i) => !!i.scheduledTime),
    [items]
  );

  // ---- Stats (compatible with the old ItineraryStats shape) ----

  const stats = useMemo<DayItemStats>(() => {
    const list = rawItems ?? [];
    const byPark: Record<string, number> = {};
    for (const item of list) {
      if (item.park) byPark[item.park] = (byPark[item.park] ?? 0) + 1;
    }
    return {
      total: list.length,
      completed: list.filter((i) => i.completed).length,
      byPark,
    };
  }, [rawItems]);

  // ==================== CRUD ====================

  const addItem = async (params: AddDayItemParams): Promise<string | null> => {
    if (!currentTripId || !date) return null;

    const id = `day_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    // sortOrder: one higher than the max in the same time slot (or Anytime)
    const slotItems = (rawItems ?? []).filter(
      (i) => i.scheduledTime === params.scheduledTime
    );
    const maxSort = slotItems.reduce((m, i) => Math.max(m, i.sortOrder), -1);

    const record: DayItemRecord = {
      id,
      tripId:          currentTripId,
      userId:          currentUserId,
      date,
      scheduledTime:   params.scheduledTime,
      durationMinutes: params.durationMinutes,
      sortOrder:       maxSort + 1,
      title:           params.title,
      itemType:        params.itemType,
      park:            params.park,
      land:            params.land,
      notes:           params.notes,
      priority:        params.priority,
      tags:            params.tags,
      photos:          params.photos,
      sourceId:        params.sourceId,
      parkDataId:      params.parkDataId,
      completed:       false,
      createdAt:       now,
      updatedAt:       now,
    };

    await db.dayItems.add(record);
    syncDayItem(record);
    return id;
  };

  // Batch version of addItem — used by bulk "Add to Day" from the Catalog,
  // which isn't bound to a single `date` the way this hook instance is.
  const addItems = (entries: AddDayItemParams[]): Promise<string[]> =>
    currentTripId && date
      ? addDayItemsBatch(currentTripId, date, currentUserId, entries)
      : Promise.resolve([]);

  const removeItem = async (id: string): Promise<void> => {
    const item = await db.dayItems.get(id);
    await db.dayItems.delete(id);
    if (item) syncDeleteDayItem(id, item.tripId);
  };

  const updateItem = async (
    id: string,
    updates: Partial<Pick<DayItemRecord,
      | "scheduledTime"
      | "durationMinutes"
      | "notes"
      | "title"
      | "completed"
      | "priority"
      | "tags"
      | "photos"
    >>
  ): Promise<void> => {
    await db.dayItems.update(id, { ...updates, updatedAt: Date.now() });
    const updated = await db.dayItems.get(id);
    if (updated) syncDayItem(updated);
  };

  const toggleCompleted = async (id: string): Promise<void> => {
    const item = await db.dayItems.get(id);
    if (!item) return;
    await db.dayItems.update(id, {
      completed:   !item.completed,
      completedAt: !item.completed ? new Date().toISOString() : undefined,
      updatedAt:   Date.now(),
    });
    const updated = await db.dayItems.get(id);
    if (updated) syncDayItem(updated);
  };

  // Move item to a new time slot (or Anytime if newTime is undefined)
  const moveItem = async (id: string, newScheduledTime: string | undefined): Promise<void> => {
    // Compute new sortOrder at the destination slot
    const slotItems = (rawItems ?? []).filter(
      (i) => i.id !== id && i.scheduledTime === newScheduledTime
    );
    const maxSort = slotItems.reduce((m, i) => Math.max(m, i.sortOrder), -1);
    await db.dayItems.update(id, {
      scheduledTime: newScheduledTime,
      sortOrder:     maxSort + 1,
      updatedAt:     Date.now(),
    });
    const updated = await db.dayItems.get(id);
    if (updated) syncDayItem(updated);
  };

  return {
    items,
    anytimeItems,
    timedItems,
    stats,
    addItem,
    addItems,
    removeItem,
    updateItem,
    toggleCompleted,
    moveItem,
    loading: rawItems === undefined,
  };
}
