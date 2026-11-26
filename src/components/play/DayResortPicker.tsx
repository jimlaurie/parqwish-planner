"use client";

// ==================== DAY RESORT PICKER ====================
// On Preview's counts row, for a trip that visits more than one resort (and
// only with the resorts beta, RESORTS_AVAILABLE): which resort the selected
// day is at. Saved on the trip as dayResorts (shared/constants/resorts.ts
// withDayResort), so it syncs with the trip. Available Items, Add to Day's
// Park catalog and the park hours follow it (dland-wishes
// docs/multi-park-architecture.md §7a).

import type { Trip } from "@/lib/db";
import { useTrips } from "@/hooks/use-trips";
import { catalogResorts } from "@/lib/resort-park-data";
import { dayResortFor, resortTabLabel, tripPicksDayResorts, tripResortIds, withDayResort } from "@/lib/trip-resorts";

const ACCENT = "var(--color-accent-preview)";

export default function DayResortPicker({ trip, date }: { trip: Trip; date: string | null }) {
  const { updateTrip } = useTrips();
  if (!date || !tripPicksDayResorts(trip)) return null;
  const current = dayResortFor(trip, date);
  const ids = tripResortIds(trip);
  const resorts = catalogResorts().filter((r) => ids.includes(r.id));

  const choose = async (resortId: string) => {
    if (resortId === current) return;
    try {
      await updateTrip(trip.id, { dayResorts: withDayResort(trip, date, resortId) });
    } catch (err) {
      console.error("[DayResortPicker] couldn't save the day's resort:", err);
    }
  };

  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label="This day's resort">
      <span aria-hidden="true">{"\u{1F3F0}"}</span>
      {resorts.map((r) => {
        const on = r.id === current;
        return (
          <button
            key={r.id}
            type="button"
            aria-pressed={on}
            title={r.name}
            onClick={() => choose(r.id)}
            className="px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-colors duration-150"
            style={{
              backgroundColor: on ? `color-mix(in srgb, ${ACCENT} 20%, transparent)` : "transparent",
              color: on ? ACCENT : "var(--color-text-muted)",
              border: `1px solid ${on ? ACCENT : "var(--color-border-subtle)"}`,
            }}
          >
            {resortTabLabel(r.id)}
          </button>
        );
      })}
    </span>
  );
}
