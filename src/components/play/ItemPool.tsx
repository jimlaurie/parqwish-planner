"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { PoolItem } from "@/hooks/use-play-pool";
import PoolItemCard from "./PoolItemCard";

const ACCENT = "var(--color-accent-preview)";

interface ItemPoolProps {
  poolItems: PoolItem[];
  loading: boolean;
  onScheduleReservation: (item: PoolItem) => void;
  onQuickSchedule?: (item: PoolItem) => void;
}

interface GroupConfig {
  key: string;
  label: string;
  icon: string;
}

const GROUPS: GroupConfig[] = [
  { key: "ride", label: "Rides", icon: "\uD83C\uDFA2" },
  { key: "wish", label: "Wishes", icon: "\u2B50" },
  { key: "place", label: "Places", icon: "\uD83D\uDCCD" },
  { key: "dining", label: "Dining", icon: "\uD83C\uDF7D\uFE0F" },
  { key: "shopping", label: "Shopping", icon: "\uD83D\uDECD\uFE0F" },
  { key: "outfit", label: "Outfits", icon: "\uD83D\uDC57" },
  { key: "equipment", label: "Equipment", icon: "\uD83C\uDF92" },
  { key: "sundry", label: "Sundries", icon: "\uD83E\uDDF4" },
];

export default function ItemPool({ poolItems, loading, onScheduleReservation, onQuickSchedule }: ItemPoolProps) {
  const { playItemPoolFilter, setPlayItemPoolFilter } = useAppStore();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => {
    if (!playItemPoolFilter.trim()) return poolItems;
    const q = playItemPoolFilter.toLowerCase();
    return poolItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle?.toLowerCase().includes(q) ?? false)
    );
  }, [poolItems, playItemPoolFilter]);

  const grouped = useMemo(() => {
    const result: Record<string, PoolItem[]> = {};
    for (const group of GROUPS) {
      result[group.key] = filteredItems.filter((i) => i.sourceType === group.key);
    }
    return result;
  }, [filteredItems]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search items..."
          value={playItemPoolFilter}
          onChange={(e) => setPlayItemPoolFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-xs outline-none
                     transition-colors duration-150"
          style={{
            backgroundColor: "var(--color-bg-card)",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border-subtle)",
          }}
        />
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading && (
          <p
            className="text-xs text-center py-4"
            style={{ color: "var(--color-text-dim)" }}
          >
            Loading...
          </p>
        )}

        {!loading && filteredItems.length === 0 && (
          <p
            className="text-xs text-center py-4"
            style={{ color: "var(--color-text-dim)" }}
          >
            {playItemPoolFilter
              ? "No matching items"
              : "All items are on the timeline!"}
          </p>
        )}

        {GROUPS.map((group) => {
          const items = grouped[group.key] ?? [];
          if (items.length === 0) return null;
          const isCollapsed = collapsedGroups.has(group.key);

          return (
            <div key={group.key}>
              <button
                onClick={() => toggleGroup(group.key)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg
                           cursor-pointer transition-colors duration-100"
                style={{ color: "var(--color-text-muted)" }}
              >
                <span className="text-xs">{group.icon}</span>
                <span className="text-xs font-semibold flex-1 text-left">
                  {group.label}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${ACCENT}22`, color: ACCENT }}
                >
                  {items.length}
                </span>
                <span className="text-[10px]">{isCollapsed ? "\u25B6" : "\u25BC"}</span>
              </button>

              {!isCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {items.map((item) => (
                    <PoolItemCard
                      key={item.id}
                      item={item}
                      onScheduleReservation={
                        item.reservationTime ? onScheduleReservation : undefined
                      }
                      onQuickSchedule={onQuickSchedule}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pool count */}
      {!loading && filteredItems.length > 0 && (
        <p
          className="text-[10px] text-center pt-2 mt-2"
          style={{
            color: "var(--color-text-dim)",
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} available
        </p>
      )}
    </div>
  );
}
