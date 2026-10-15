"use client";

// ==================== CATALOG STATUS FILTER ====================
// Ticked chips for each status in a park catalog tab (Open, Seasonal,
// Closed, with counts); untick one to hide those items for a shorter list.
// One remembered choice shared by every tab of both park catalog lists:
// Plan's "Add from the Park Catalog" (CatalogBrowser) and Preview's Add to
// Day › Park catalog (play/CatalogPicker). A show's status comes from the
// morning showtime sync, where "closed" means not on that day's schedule,
// so the Shows tab says so.

import { useMemo } from "react";
import type { ParkDataItem } from "@/lib/park-data";
import { useAppStore } from "@/lib/store";
import { useShowSchedules } from "@/hooks/use-show-schedules";

const STATUS_ORDER = ["operating", "seasonal", "closed"];
const STATUS_LABELS: Record<string, string> = { operating: "Open", seasonal: "Seasonal", closed: "Closed" };

/** An item's status for filtering; one with none listed counts as open. */
export function catalogStatus(item: ParkDataItem): string {
  return item.status || "operating";
}

/** The statuses the user has unticked, and a test for whether an item is still shown. */
export function useCatalogStatusFilter() {
  const hidden = useAppStore((s) => s.hiddenCatalogStatuses);
  const isShown = useMemo(() => {
    const set = new Set(hidden);
    return (item: ParkDataItem) => !set.has(catalogStatus(item));
  }, [hidden]);
  return { hidden, isShown };
}

interface CatalogStatusFilterProps {
  /** The tab's items, before the status filter (for the counts). */
  items: ParkDataItem[];
  accent: string;
  /** Called after a chip is toggled (e.g. to clear a selection that may now be hidden). */
  onChange?: () => void;
}

export default function CatalogStatusFilter({ items, accent, onChange }: CatalogStatusFilterProps) {
  const hidden = useAppStore((s) => s.hiddenCatalogStatuses);
  const setHidden = useAppStore((s) => s.setHiddenCatalogStatuses);
  const { syncedOn } = useShowSchedules();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) map.set(catalogStatus(item), (map.get(catalogStatus(item)) ?? 0) + 1);
    const rank = (s: string) => (STATUS_ORDER.includes(s) ? STATUS_ORDER.indexOf(s) : STATUS_ORDER.length);
    return [...map].sort(([a], [b]) => rank(a) - rank(b));
  }, [items]);

  // Nothing to choose between: every item has the same status
  if (counts.length < 2) return null;

  const toggle = (status: string) => {
    setHidden(hidden.includes(status) ? hidden.filter((s) => s !== status) : [...hidden, status]);
    onChange?.();
  };
  const showsTab = items.some((i) => i.type === "show");
  const asOf = showsTab && syncedOn
    ? new Date(`${syncedOn}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
        {counts.map(([status, n]) => {
          const on = !hidden.includes(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggle(status)}
              aria-pressed={on}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-100"
              style={{
                backgroundColor: on ? `color-mix(in srgb, ${accent} 15%, transparent)` : "transparent",
                color: on ? accent : "var(--color-text-dim)",
                border: on ? `1px solid color-mix(in srgb, ${accent} 45%, transparent)` : "1px dashed var(--color-border-subtle)",
              }}
            >
              {on ? "✓ " : ""}{STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1)} ({n})
            </button>
          );
        })}
      </div>
      {asOf && (
        <p className="text-[10px] mt-1" style={{ color: "var(--color-text-dim)" }}>
          Show status as of {asOf}: closed means not on that day&rsquo;s schedule.
        </p>
      )}
    </div>
  );
}
