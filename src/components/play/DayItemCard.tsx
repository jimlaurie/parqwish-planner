"use client";

import { useRef, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useAppStore } from "@/lib/store";
import { LAND_COLORS } from "@/lib/map-data";
import UserBadge from "@/components/UserBadge";
import type { DayItemRecord } from "@/lib/db";
import { DAY_ITEM_TYPE_ICONS } from "@shared/types/day-item";
import type { User } from "@/lib/db";

const ACCENT = "var(--color-accent-preview)";

// ==================== COMPONENT ====================

interface DayItemCardProps {
  item: DayItemRecord;
  onToggleCompleted: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  isHighlightedByMap?: boolean;
  userName?: string;
  userColor?: string;
}

export default function DayItemCard({
  item,
  onToggleCompleted,
  onEdit,
  onRemove,
  isHighlightedByMap,
  userName,
  userColor,
}: DayItemCardProps) {
  const { highlightedLand, setHighlightedLand, setHoveredTimelineItemId } = useAppStore();
  const mapPinActiveRef = useRef(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `timeline__${item.id}`,
    data: { timelineItem: item },
  });

  const landColor = item.land ? (LAND_COLORS[item.land] ?? ACCENT) : ACCENT;
  const icon = DAY_ITEM_TYPE_ICONS[item.itemType] ?? "📌";

  const isLandActive = item.land
    ? highlightedLand === item.land ||
      (Array.isArray(highlightedLand) && highlightedLand.includes(item.land))
    : false;

  // ---- hover (desktop) ----

  const handleMouseEnter = useCallback(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    if (item.land) setHighlightedLand(item.land);
    setHoveredTimelineItemId(item.id);
  }, [item.land, item.id, setHighlightedLand, setHoveredTimelineItemId]);

  const handleMouseLeave = useCallback(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    setHighlightedLand(null);
    setHoveredTimelineItemId(null);
  }, [setHighlightedLand, setHoveredTimelineItemId]);

  // ---- click ----

  const handleClick = useCallback(() => {
    if (isDragging) return;
    if (mapPinActiveRef.current) { mapPinActiveRef.current = false; return; }
    onEdit(item.id);
  }, [isDragging, item.id, onEdit]);

  // ---- map pin (mobile) ----

  const handleMapPin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      mapPinActiveRef.current = true;
      if (!item.land) return;
      if (isLandActive) {
        setHighlightedLand(null);
        setHoveredTimelineItemId(null);
      } else {
        setHighlightedLand(item.land);
        setHoveredTimelineItemId(item.id);
      }
    },
    [item.land, item.id, isLandActive, setHighlightedLand, setHoveredTimelineItemId]
  );

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="flex items-stretch rounded-lg overflow-hidden cursor-grab
                 transition-all duration-150 group touch-none"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: isHighlightedByMap
          ? `2px solid ${ACCENT}`
          : "1px solid var(--color-border-subtle)",
        boxShadow: isHighlightedByMap
          ? `0 0 12px color-mix(in srgb, ${ACCENT} 27%, transparent)`
          : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Left color bar */}
      <div className="w-1 shrink-0" style={{ backgroundColor: landColor }} />

      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCompleted(item.id); }}
        className="flex items-center justify-center w-8 shrink-0 cursor-pointer
                   transition-opacity hover:opacity-80"
      >
        <span className="text-sm">{item.completed ? "✅" : "⬜"}</span>
      </button>

      {/* Content */}
      <div className="flex-1 py-2 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{icon}</span>
          <p
            className="text-xs font-medium truncate"
            style={{
              color: item.completed ? "var(--color-text-dim)" : "var(--color-text-secondary)",
              textDecoration: item.completed ? "line-through" : undefined,
            }}
          >
            {item.title}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.land && (
            <span className="text-[10px]" style={{ color: landColor }}>
              {item.land}
            </span>
          )}
          {item.durationMinutes != null && (
            <span className="text-[10px]" style={{ color: "var(--color-text-dim)" }}>
              {item.durationMinutes}min
            </span>
          )}
          {userName && userColor && (
            <UserBadge color={userColor} name={userName} size="sm" />
          )}
        </div>
      </div>

      {/* Map pin (mobile only) */}
      {item.land && (
        <button
          onClick={handleMapPin}
          className="flex items-center justify-center w-8 shrink-0 cursor-pointer
                     lg:hidden transition-all"
          aria-label={`${isLandActive ? "Hide" : "Show"} ${item.land} on map`}
          title={`Show ${item.land} on map`}
          style={{
            color: isLandActive ? ACCENT : "var(--color-text-dim)",
            backgroundColor: isLandActive
              ? `color-mix(in srgb, ${ACCENT} 15%, transparent)`
              : "transparent",
          }}
        >
          <span className="text-sm">{isLandActive ? "📍" : "🗺️"}</span>
        </button>
      )}

      {/* Remove (hover, desktop) */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="flex items-center justify-center w-7 shrink-0 cursor-pointer
                   opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        aria-label={`Remove ${item.title} from itinerary`}
        title="Remove"
      >
        <span className="text-xs" style={{ color: "var(--color-error)" }}>{"✕"}</span>
      </button>
    </div>
  );
}

// Re-export User type for consumers that need it alongside DayItemCard
export type { User };
