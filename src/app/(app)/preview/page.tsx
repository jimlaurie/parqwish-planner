"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { useAppStore } from "@/lib/store";
import { useTrips } from "@/hooks/use-trips";
import { useDayItems } from "@/hooks/use-day-items";
import { usePlayPool, type PoolItem, POOL_TYPE_TO_DAY_ITEM_TYPE } from "@/hooks/use-play-pool";
import { useUsers } from "@/hooks/use-users";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { auth } from "@/lib/auth";
import type { DayItemRecord } from "@/lib/db";
import { DAY_ITEM_TYPE_ICONS } from "@shared/types/day-item";
import PlayHeader from "@/components/play/PlayHeader";
import DatePickerBar from "@/components/play/DatePickerBar";
import PlayDesktopLayout from "@/components/play/PlayDesktopLayout";
import PlayMobileLayout from "@/components/play/PlayMobileLayout";
import DayItemEditModal from "@/components/play/DayItemEditModal";
import AddDayItemModal from "@/components/play/AddDayItemModal";

type MobileTab = "pool" | "timeline";

export default function PreviewPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const {
    _hasHydrated,
    currentTripId,
    selectedPlayDate,
    setSelectedPlayDate,
    timelineTypeFilter,
  } = useAppStore();
  const { currentTrip } = useTrips();
  const { userMap } = useUsers();

  const {
    items,
    stats,
    addItem,
    removeItem,
    updateItem,
    toggleCompleted,
    moveItem,
    loading: dayItemsLoading,
  } = useDayItems(selectedPlayDate);

  const { poolItems, loading: poolLoading } = usePlayPool(selectedPlayDate);

  const [mobileTab, setMobileTab] = useState<MobileTab>("timeline");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addModalInitialTime, setAddModalInitialTime] = useState<string | undefined>(undefined);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeDragPoolItem, setActiveDragPoolItem] = useState<PoolItem | null>(null);
  const [activeDragDayItem, setActiveDragDayItem] = useState<DayItemRecord | null>(null);

  // Derive editing item reactively from useDayItems
  const editingItem = useMemo(
    () => items.find((i) => i.id === editingItemId) ?? null,
    [items, editingItemId]
  );

  // The category filter narrows what the Timeline and map display — the
  // underlying day plan (and drag/drop targets) are untouched, since
  // handleDragEnd resolves items via poolItems/parsed drag ids, not this
  // array.
  const visibleItems = useMemo(
    () => (timelineTypeFilter ? items.filter((i) => timelineTypeFilter.includes(i.itemType)) : items),
    [items, timelineTypeFilter]
  );

  // DnD sensors
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Redirect if no trip
  useEffect(() => {
    if (!_hasHydrated || currentTripId) return;
    const timer = setTimeout(() => {
      if (!useAppStore.getState().currentTripId) router.push("/");
    }, 300);
    return () => clearTimeout(timer);
  }, [_hasHydrated, currentTripId, router]);

  // Auto-select first date
  useEffect(() => {
    if (currentTrip && !selectedPlayDate) setSelectedPlayDate(currentTrip.startDate);
  }, [currentTrip, selectedPlayDate, setSelectedPlayDate]);

  // ==================== HANDLERS ====================

  const handleDragStart = useCallback((event: {
    active: { id: string | number; data: { current?: { poolItem?: PoolItem; timelineItem?: DayItemRecord } } }
  }) => {
    const poolItem = event.active.data.current?.poolItem;
    const dayItem  = event.active.data.current?.timelineItem;
    if (poolItem) { setActiveDragPoolItem(poolItem); setActiveDragDayItem(null); }
    else if (dayItem) { setActiveDragDayItem(dayItem); setActiveDragPoolItem(null); }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragPoolItem(null);
    setActiveDragDayItem(null);
    const { active, over } = event;
    if (!over) return;

    const overId   = String(over.id);
    const activeId = String(active.id);

    // Resolve target time: "slot__anytime" → undefined, "slot__HH:MM" → "HH:MM"
    if (!overId.startsWith("slot__")) return;
    const slotSuffix = overId.replace("slot__", "");
    const targetTime = slotSuffix === "anytime" ? undefined : slotSuffix;

    if (activeId.startsWith("pool__")) {
      // Pool item dropped onto timeline slot
      const parts = activeId.split("__");
      const sourceType = parts[1] as PoolItem["sourceType"];
      const sourceId   = parts[2];
      const poolItem = poolItems.find((p) => p.id === sourceId && p.sourceType === sourceType);
      if (!poolItem) return;

      await addItem({
        title:      poolItem.title,
        itemType:   POOL_TYPE_TO_DAY_ITEM_TYPE[poolItem.sourceType] ?? "wish",
        scheduledTime: targetTime,
        park:       poolItem.park,
        land:       poolItem.land,
        parkDataId: poolItem.parkDataId,
        priority:   poolItem.priority,
        sourceId:   poolItem.id,
      });
      return;
    }

    if (activeId.startsWith("timeline__")) {
      // Existing day item moved to a new slot
      const itemId = activeId.replace("timeline__", "");
      await moveItem(itemId, targetTime);
    }
  }, [poolItems, addItem, moveItem]);

  const handleScheduleReservation = useCallback(async (item: PoolItem) => {
    if (!item.reservationTime) return;
    let time24 = item.reservationTime;
    const match = item.reservationTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      let hour = parseInt(match[1]);
      const min = match[2];
      const period = match[3].toUpperCase();
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      time24 = `${hour.toString().padStart(2, "0")}:${min}`;
    }
    await addItem({
      title:      item.title,
      itemType:   "dining",
      scheduledTime: time24,
      park:       item.park,
      land:       item.land,
      parkDataId: item.parkDataId,
      priority:   item.priority,
      sourceId:   item.id,
    });
  }, [addItem]);

  const handleQuickSchedule = useCallback(async (item: PoolItem) => {
    const now = new Date();
    let hour = now.getHours();
    let min = now.getMinutes() < 30 ? 30 : 0;
    if (min === 0) hour++;
    if (hour >= 23) { hour = 8; min = 0; }
    const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;

    await addItem({
      title:      item.title,
      itemType:   POOL_TYPE_TO_DAY_ITEM_TYPE[item.sourceType] ?? "wish",
      scheduledTime: time,
      park:       item.park,
      land:       item.land,
      parkDataId: item.parkDataId,
      priority:   item.priority,
      sourceId:   item.id,
      durationMinutes: item.sourceType === "dining" ? 90 : 60,
    });
  }, [addItem]);

  // "Quick add" — from clicking an empty time slot or Anytime + button
  const handleQuickAdd = useCallback((time: string) => {
    setAddModalInitialTime(time || undefined);
    setAddModalVisible(true);
  }, []);

  // Loading states
  if (!currentTripId || !currentTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading trip...</p>
      </div>
    );
  }

  if (dayItemsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading day plan...</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="min-h-screen flex flex-col items-center px-4 py-6">
        {/* Header */}
        <PlayHeader trip={currentTrip} stats={stats} />

        {/* Date Picker */}
        <DatePickerBar
          startDate={currentTrip.startDate}
          endDate={currentTrip.endDate}
        />

        {/* Layout: Desktop vs Mobile */}
        {isDesktop ? (
          <PlayDesktopLayout
            items={visibleItems}
            poolItems={poolItems}
            poolLoading={poolLoading}
            selectedDate={selectedPlayDate}
            userMap={userMap}
            members={currentTrip.members}
            myUid={auth.currentUser?.uid}
            onToggleCompleted={toggleCompleted}
            onEdit={setEditingItemId}
            onRemove={removeItem}
            onQuickAdd={handleQuickAdd}
            onScheduleReservation={handleScheduleReservation}
            onQuickSchedule={handleQuickSchedule}
          />
        ) : (
          <PlayMobileLayout
            items={visibleItems}
            poolItems={poolItems}
            poolLoading={poolLoading}
            selectedDate={selectedPlayDate}
            userMap={userMap}
            members={currentTrip.members}
            myUid={auth.currentUser?.uid}
            mobileTab={mobileTab}
            onTabChange={setMobileTab}
            onToggleCompleted={toggleCompleted}
            onEdit={setEditingItemId}
            onRemove={removeItem}
            onQuickAdd={handleQuickAdd}
            onScheduleReservation={handleScheduleReservation}
            onQuickSchedule={handleQuickSchedule}
          />
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDragPoolItem && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg"
              style={{
                backgroundColor: "var(--color-accent-preview)",
                color: "var(--color-bg-deep)",
                opacity: 0.9,
              }}
            >
              <span className="text-sm">{activeDragPoolItem.icon}</span>
              <span className="text-xs font-medium">{activeDragPoolItem.title}</span>
            </div>
          )}
          {activeDragDayItem && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg"
              style={{
                backgroundColor: "var(--color-bg-card)",
                border: "2px solid var(--color-accent-preview)",
                opacity: 0.9,
              }}
            >
              <span className="text-sm">
                {DAY_ITEM_TYPE_ICONS[activeDragDayItem.itemType] ?? "📌"}
              </span>
              <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                {activeDragDayItem.title}
              </span>
              <span className="text-[10px]" style={{ color: "var(--color-text-dim)" }}>
                {"→ Move"}
              </span>
            </div>
          )}
        </DragOverlay>
      </main>

      {/* Edit Modal */}
      <DayItemEditModal
        visible={!!editingItemId}
        item={editingItem}
        onClose={() => setEditingItemId(null)}
        onSave={async (id, updates) => { await updateItem(id, updates as Parameters<typeof updateItem>[1]); }}
        onRemove={async (id) => { await removeItem(id); }}
        onToggleCompleted={async (id) => { await toggleCompleted(id); }}
      />

      {/* Add Modal — outside DndContext to avoid pointer conflicts */}
      <AddDayItemModal
        visible={addModalVisible}
        initialTime={addModalInitialTime}
        poolItems={poolItems}
        onAdd={async (params) => { await addItem(params); setAddModalVisible(false); }}
        onClose={() => setAddModalVisible(false)}
      />
    </DndContext>
  );
}
