"use client";

// ==================== PARK HOURS LINE ====================
// The selected day's park hours under Preview's date bar: Disneyland and
// California Adventure opening to closing, plus any ticketed event that
// night. Hours come from data/hours/<date>.json (park-data.ts
// getParkHours), posted about a month ahead; a later day says so, and a
// failed load says that instead.

import { useEffect, useState } from "react";
import { getParkHours, type DayParkHours, type ParkHoursForPark } from "@/lib/park-data";

const PARKS: { key: "disneyland" | "californiaadventure"; label: string }[] = [
  { key: "disneyland", label: "Disneyland" },
  { key: "californiaadventure", label: "California Adventure" },
];

/** "8 AM", "10:30 PM" in park time. */
function parkTime(iso: string | null): string {
  if (!iso) return "?";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "?";
  const s = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
  return s.replace(":00 ", " ");
}

function range(p: { openingTime: string | null; closingTime: string | null }): string {
  return `${parkTime(p.openingTime)} – ${parkTime(p.closingTime)}`;
}

function parkPart(label: string, p: ParkHoursForPark | null) {
  if (!p) return { label, hours: "Closed or not listed", events: [] };
  return {
    label,
    hours: p.openingTime ? range(p) : "Ticketed event only",
    events: p.specialHours.map((e) => `${e.description} ${range(e)}`),
  };
}

function todayInPark(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

export default function ParkHoursLine({ date }: { date: string | null }) {
  const [state, setState] = useState<{ date: string; hours: DayParkHours | null; failed?: boolean } | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    getParkHours(date)
      .then((hours) => { if (!cancelled) setState({ date, hours }); })
      .catch((err) => {
        console.warn("[ParkHoursLine] park hours didn't load:", err);
        if (!cancelled) setState({ date, hours: null, failed: true });
      });
    return () => { cancelled = true; };
  }, [date]);

  if (!date || state?.date !== date) return null;
  const { hours } = state;

  if (state.failed) {
    return (
      <p className="w-full max-w-7xl -mt-2 mb-3 text-[11px]" style={{ color: "var(--color-text-dim)" }}>
        {"\u{1F552}"} Park hours couldn&rsquo;t be loaded right now. Check your connection, or try again later.
      </p>
    );
  }

  if (!hours) {
    const past = date < todayInPark();
    return (
      <p className="w-full max-w-7xl -mt-2 mb-3 text-[11px]" style={{ color: "var(--color-text-dim)" }}>
        {"\u{1F552}"} {past ? "Park hours aren't kept for past days." : "Park hours for this day aren't posted yet; Disney usually posts them about a month ahead."}
      </p>
    );
  }

  const parts = PARKS.map((p) => parkPart(p.label, hours[p.key]));
  return (
    <div className="w-full max-w-7xl -mt-2 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
         role="note" aria-label="Park hours" style={{ color: "var(--color-text-secondary)" }}>
      <span aria-hidden="true">{"\u{1F552}"}</span>
      {parts.map((p) => (
        <span key={p.label} className="whitespace-nowrap">
          <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{p.label}</span> {p.hours}
          {p.events.map((e) => (
            <span key={e} className="ml-1.5 px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "color-mix(in srgb, var(--color-accent-preview) 14%, transparent)" }}>
              {"\u{1F39F}️"} {e}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
