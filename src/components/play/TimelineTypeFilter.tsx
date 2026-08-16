"use client";

// ==================== TIMELINE TYPE FILTER ====================
// Chip row that narrows what the Timeline (and the map alongside it) show
// down to specific item types — e.g. "just dining and shows" — without
// touching what's actually scheduled. Purely a display filter.

import { useAppStore } from "@/lib/store";
import { DAY_ITEM_TYPE_ICONS, DAY_ITEM_TYPE_LABELS, type DayItemType } from "@shared/types/day-item";

const ACCENT = "var(--color-accent-preview)";

const ALL_TYPES = Object.keys(DAY_ITEM_TYPE_ICONS) as DayItemType[];

export default function TimelineTypeFilter() {
  const { timelineTypeFilter, toggleTimelineType, setTimelineTypeFilter } = useAppStore();
  const isFiltered = timelineTypeFilter !== null;

  return (
    <div className="flex items-center gap-1 flex-wrap px-1 pb-2">
      {ALL_TYPES.map((type) => {
        const active = timelineTypeFilter === null || timelineTypeFilter.includes(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => toggleTimelineType(type, ALL_TYPES)}
            title={DAY_ITEM_TYPE_LABELS[type]}
            className="text-[10px] px-2 py-1 rounded-full cursor-pointer transition-colors duration-100 whitespace-nowrap"
            style={{
              backgroundColor: active ? `color-mix(in srgb, ${ACCENT} 18%, transparent)` : "var(--color-surface-sunken)",
              color: active ? ACCENT : "var(--color-text-dim)",
              border: active ? `1px solid color-mix(in srgb, ${ACCENT} 40%, transparent)` : "1px solid transparent",
            }}
          >
            {DAY_ITEM_TYPE_ICONS[type]} {DAY_ITEM_TYPE_LABELS[type]}
          </button>
        );
      })}
      {isFiltered && (
        <button
          type="button"
          onClick={() => setTimelineTypeFilter(null)}
          className="text-[10px] px-2 py-1 rounded-full cursor-pointer"
          style={{ color: "var(--color-text-dim)" }}
        >
          Show all
        </button>
      )}
    </div>
  );
}
