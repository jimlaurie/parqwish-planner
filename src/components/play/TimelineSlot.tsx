"use client";

import { useDroppable } from "@dnd-kit/core";
import type { DayItemRecord } from "@/lib/db";
import type { User } from "@/lib/db";
import type { TripMember } from "@shared/types/trip";
import { resolveOwnerBadge } from "@/lib/owner-badge";
import DayItemCard from "./DayItemCard";

const ACCENT = "var(--color-accent-preview)";

// ==================== COMPONENT ====================

interface TimelineSlotProps {
  time: string;         // "HH:mm"
  displayTime: string;  // "7:00 AM"
  items: DayItemRecord[];
  onToggleCompleted: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onQuickAdd: (time: string) => void;
  highlightedLand: string | string[] | null;
  isNow?: boolean;
  userMap?: Map<string, User>;
  members?: Record<string, TripMember>;
  myUid?: string;
}

export default function TimelineSlot({
  time,
  displayTime,
  items,
  onToggleCompleted,
  onEdit,
  onRemove,
  onQuickAdd,
  highlightedLand,
  userMap,
  members,
  myUid,
  isNow,
}: TimelineSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot__${time}` });

  const hasItems = items.length > 0;
  const showBadges = (userMap && userMap.size > 1) || (members && Object.keys(members).length > 1);

  return (
    <div className="flex gap-2 group/slot" style={{ minHeight: "44px" }}>
      {/* Time label */}
      <div className="w-16 shrink-0 pt-1 text-right pr-2 relative">
        <span
          className="text-[10px] font-mono"
          style={{
            color: isNow ? ACCENT : "var(--color-text-dim)",
            fontWeight: isNow ? 600 : 400,
          }}
        >
          {displayTime}
        </span>
        {isNow && (
          <div
            className="absolute top-2 -right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: ACCENT }}
          />
        )}
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className="flex-1 rounded-lg transition-all duration-150 relative"
        style={{
          backgroundColor: isOver
            ? `color-mix(in srgb, ${ACCENT} 12%, transparent)`
            : "transparent",
          border: isOver
            ? `2px dashed ${ACCENT}`
            : hasItems
              ? "none"
              : "1px dashed var(--color-border-subtle)",
          padding: hasItems ? 0 : "2px",
          minHeight: "40px",
          cursor: !hasItems ? "pointer" : undefined,
        }}
        onClick={!hasItems ? () => onQuickAdd(time) : undefined}
      >
        {hasItems ? (
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
          <div
            className="flex items-center justify-center h-full w-full
                       group-hover/slot:opacity-100 opacity-0 transition-opacity duration-150"
            style={{ minHeight: "40px" }}
          >
            <span className="text-lg leading-none select-none" style={{ color: "var(--color-text-dim)" }}>
              +
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
