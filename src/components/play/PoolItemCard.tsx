"use client";

import { useDraggable } from "@dnd-kit/core";
import type { PoolItem } from "@/hooks/use-play-pool";

const ACCENT = "var(--color-accent-preview)";

interface PoolItemCardProps {
  item: PoolItem;
  onScheduleReservation?: (item: PoolItem) => void;
  onQuickSchedule?: (item: PoolItem) => void;
}

export default function PoolItemCard({
  item,
  onScheduleReservation,
  onQuickSchedule,
}: PoolItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool__${item.sourceType}__${item.id}`,
    data: { poolItem: item },
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : "auto" as const,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing
                 transition-colors duration-100 group"
      {...attributes}
      {...listeners}
    >
      {/* Drag handle */}
      <span
        className="text-xs opacity-30 group-hover:opacity-60 transition-opacity select-none hidden lg:inline"
        style={{ color: "var(--color-text-muted)" }}
      >
        {"\u2630"}
      </span>

      {/* Icon */}
      <span className="text-sm shrink-0">{item.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium truncate"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {item.title}
        </p>
        {item.subtitle && (
          <p
            className="text-[10px] truncate"
            style={{ color: "var(--color-text-dim)" }}
          >
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Reservation quick-schedule */}
      {item.reservationTime && onScheduleReservation && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onScheduleReservation(item);
          }}
          className="text-[10px] px-2 py-0.5 rounded-full shrink-0 cursor-pointer
                     transition-colors duration-100 hover:brightness-110"
          style={{
            backgroundColor: `${ACCENT}22`,
            color: ACCENT,
          }}
          title={`Schedule at ${item.reservationTime}`}
        >
          {item.reservationTime}
        </button>
      )}

      {/* Mobile: Quick-add button (replaces drag-and-drop) */}
      {onQuickSchedule && !item.reservationTime && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onQuickSchedule(item);
          }}
          onPointerDown={(e) => {
            // Only stop propagation on touch devices to avoid blocking desktop drag
            if (window.matchMedia("(pointer: coarse)").matches) {
              e.stopPropagation();
            }
          }}
          className="lg:hidden text-[10px] px-2 py-0.5 rounded-full shrink-0 cursor-pointer
                     transition-colors duration-100 hover:brightness-110"
          style={{
            backgroundColor: `${ACCENT}22`,
            color: ACCENT,
          }}
          title="Add to timeline"
        >
          + Add
        </button>
      )}

      {/* Priority badge */}
      <span
        className="text-[10px] font-bold w-4 h-4 rounded flex items-center justify-center shrink-0"
        style={{
          backgroundColor: "var(--color-surface-raised)",
          color: "var(--color-text-dim)",
        }}
      >
        {item.priority}
      </span>
    </div>
  );
}
