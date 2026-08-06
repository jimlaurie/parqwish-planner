"use client";

import { useEffect, useMemo, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useAppStore } from "@/lib/store";
import type { DayItemRecord, User } from "@/lib/db";
import type { TripMember } from "@shared/types/trip";
import { resolveOwnerBadge } from "@/lib/owner-badge";
import TimelineSlot from "./TimelineSlot";
import DayItemCard from "./DayItemCard";

const ACCENT = "var(--color-accent-preview)";

// ==================== TIME SLOTS ====================

interface TimeSlot {
  time: string;         // "07:00"
  displayTime: string;  // "7:00 AM"
}

function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = 7; hour <= 23; hour++) {
    for (const min of [0, 30]) {
      const hh = hour.toString().padStart(2, "0");
      const mm = min.toString().padStart(2, "0");
      const displayHour = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? "PM" : "AM";
      slots.push({ time: `${hh}:${mm}`, displayTime: `${displayHour}:${mm} ${period}` });
    }
  }
  slots.push({ time: "00:00", displayTime: "12:00 AM" });
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

// ==================== ANYTIME SECTION ====================

function AnytimeSection({
  items,
  onToggleCompleted,
  onEdit,
  onRemove,
  onQuickAdd,
  userMap,
  members,
  myUid,
}: {
  items: DayItemRecord[];
  onToggleCompleted: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onQuickAdd: (time: string) => void;
  userMap?: Map<string, User>;
  members?: Record<string, TripMember>;
  myUid?: string;
}) {
  const showBadges = (userMap && userMap.size > 1) || (members && Object.keys(members).length > 1);
  const { highlightedLand } = useAppStore();
  const { isOver, setNodeRef } = useDroppable({ id: "slot__anytime" });

  return (
    <div
      className="mb-4 rounded-xl"
      style={{
        border: isOver
          ? `2px dashed ${ACCENT}`
          : "1px solid var(--color-border-subtle)",
        backgroundColor: isOver
          ? `color-mix(in srgb, ${ACCENT} 8%, transparent)`
          : "var(--color-surface-sunken)",
        padding: "8px",
      }}
      ref={setNodeRef}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-dim)" }}
        >
          Anytime
        </span>
        <button
          onClick={() => onQuickAdd("")}
          className="text-[10px] px-2 py-0.5 rounded-full transition-colors duration-100"
          style={{
            color: ACCENT,
            backgroundColor: `color-mix(in srgb, ${ACCENT} 12%, transparent)`,
          }}
        >
          + Add
        </button>
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map((item) => {
            const isHighlighted =
              highlightedLand != null &&
              item.land != null &&
              (Array.isArray(highlightedLand)
                ? highlightedLand.includes(item.land)
                : highlightedLand === item.land);
            const owner = showBadges
              ? resolveOwnerBadge(item, { userMap: userMap ?? new Map(), members, myUid })
              : undefined;
            return (
              <DayItemCard
                key={item.id}
                item={item}
                onToggleCompleted={onToggleCompleted}
                onEdit={onEdit}
                onRemove={onRemove}
                isHighlightedByMap={isHighlighted}
                userName={owner?.name}
                userColor={owner?.color}
              />
            );
          })}
        </div>
      ) : (
        <p
          className="text-[10px] text-center py-2"
          style={{ color: "var(--color-text-dim)" }}
        >
          Drop items here or tap + Add
        </p>
      )}
    </div>
  );
}

// ==================== TIMELINE ====================

interface TimelineProps {
  items: DayItemRecord[];         // all items for the day (anytime + timed)
  onToggleCompleted: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onQuickAdd: (time: string) => void;   // "" = open modal without pre-filled time
  selectedDate: string | null;
  userMap?: Map<string, User>;
  members?: Record<string, TripMember>;
  myUid?: string;
}

export default function Timeline({
  items,
  onToggleCompleted,
  onEdit,
  onRemove,
  onQuickAdd,
  selectedDate,
  userMap,
  members,
  myUid,
}: TimelineProps) {
  const { highlightedLand } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Split into anytime and timed
  const anytimeItems = useMemo(() => items.filter((i) => !i.scheduledTime), [items]);
  const timedItems   = useMemo(() => items.filter((i) => !!i.scheduledTime),  [items]);

  // Group timed items into 30-min slots
  const itemsBySlot = useMemo(() => {
    const map: Record<string, DayItemRecord[]> = {};
    for (const item of timedItems) {
      const [hh, mm] = item.scheduledTime!.split(":").map(Number);
      const slotMin = mm >= 30 ? 30 : 0;
      const slotKey = `${hh.toString().padStart(2, "0")}:${slotMin.toString().padStart(2, "0")}`;
      if (!map[slotKey]) map[slotKey] = [];
      map[slotKey].push(item);
    }
    return map;
  }, [timedItems]);

  // Current-time slot
  const nowSlot = useMemo(() => {
    if (!selectedDate) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (selectedDate !== today) return null;
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes() >= 30 ? "30" : "00";
    return `${hh}:${mm}`;
  }, [selectedDate]);

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const target = nowSlot ?? (timedItems.length > 0 ? timedItems[0].scheduledTime ?? null : null);
    if (!target || !target.includes(":")) return;
    const [hh] = target.split(":").map(Number);
    const slotIndex = (hh - 7) * 2;
    if (slotIndex > 0) {
      scrollRef.current.scrollTop = Math.max(0, slotIndex * 48 - 60);
    }
  }, [nowSlot, timedItems, selectedDate]);

  if (!selectedDate) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-center" style={{ color: "var(--color-text-dim)" }}>
          {"📅"} Pick a day to start planning
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 h-full">
      <div className="space-y-1 pb-8">
        {/* Anytime section */}
        <AnytimeSection
          items={anytimeItems}
          onToggleCompleted={onToggleCompleted}
          onEdit={onEdit}
          onRemove={onRemove}
          onQuickAdd={onQuickAdd}
          userMap={userMap}
          members={members}
          myUid={myUid}
        />

        {/* Time slots */}
        {TIME_SLOTS.map((slot) => (
          <TimelineSlot
            key={slot.time}
            time={slot.time}
            displayTime={slot.displayTime}
            items={itemsBySlot[slot.time] ?? []}
            onToggleCompleted={onToggleCompleted}
            onEdit={onEdit}
            onRemove={onRemove}
            onQuickAdd={onQuickAdd}
            highlightedLand={highlightedLand}
            isNow={nowSlot === slot.time}
            userMap={userMap}
            members={members}
            myUid={myUid}
          />
        ))}
      </div>
    </div>
  );
}
