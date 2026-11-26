"use client";

// ==================== PARK HOURS LINE ====================
// The selected day's park hours under Preview's date bar: the day's resort's
// parks (Disneyland and California Adventure, or Knott's and Soak City)
// opening to closing, plus any ticketed event that night. Hours come from
// data/{dataPath}hours/<date>.json (park-data.ts getParkHours), posted about
// a month ahead; a later day says so, and a failed load says that instead.

import { useEffect, useState } from "react";
import { getParkHours, type DayParkHours, type ParkHoursForPark } from "@/lib/park-data";
import { parkToday } from "@/lib/dates";
import { DEFAULT_RESORT_ID, getResort } from "@shared/constants/resorts";

const DLR_PARKS: { key: string; label: string }[] = [
  { key: "disneyland", label: "Disneyland" },
  { key: "californiaadventure", label: "California Adventure" },
];

/** The parks the line names: Disneyland Resort's two as before, another resort's from the registry. */
function parksOf(resortId: string): { key: string; label: string }[] {
  if (resortId === DEFAULT_RESORT_ID) return DLR_PARKS;
  return (getResort(resortId)?.parks ?? []).map((p) => ({ key: p.key, label: p.name }));
}

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

function parkPart(label: string, p: ParkHoursForPark | null | string | undefined) {
  if (typeof p === "string") p = null;
  if (!p) return { label, hours: "Closed or not listed", events: [] };
  return {
    label,
    hours: p.openingTime ? range(p) : "Ticketed event only",
    events: p.specialHours.map((e) => `${e.description} ${range(e)}`),
  };
}

/** `inline`: inside the header's counts row rather than a row of its own. `resortId`: the day's resort. */
export default function ParkHoursLine({ date, inline, resortId = DEFAULT_RESORT_ID }: { date: string | null; inline?: boolean; resortId?: string }) {
  const box = inline ? "min-w-0" : "w-full max-w-7xl -mt-2 mb-3";
  const [state, setState] = useState<{ key: string; hours: DayParkHours | null; failed?: boolean } | null>(null);
  const key = `${resortId}:${date}`;

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    getParkHours(date, resortId)
      .then((hours) => { if (!cancelled) setState({ key: `${resortId}:${date}`, hours }); })
      .catch((err) => {
        console.warn("[ParkHoursLine] park hours didn't load:", err);
        if (!cancelled) setState({ key: `${resortId}:${date}`, hours: null, failed: true });
      });
    return () => { cancelled = true; };
  }, [date, resortId]);

  if (!date || state?.key !== key) return null;
  const { hours } = state;

  if (state.failed) {
    return (
      <p className={`${box} text-[11px]`} style={{ color: "var(--color-text-dim)" }}>
        {"\u{1F552}"} Park hours couldn&rsquo;t be loaded right now. Check your connection, or try again later.
      </p>
    );
  }

  if (!hours) {
    const past = date < parkToday();
    return (
      <p className={`${box} text-[11px]`} style={{ color: "var(--color-text-dim)" }}>
        {"\u{1F552}"} {past ? "Park hours aren't kept for past days." : `Park hours for this day aren't posted yet; ${resortId === DEFAULT_RESORT_ID ? "Disney usually posts" : "parks usually post"} them about a month ahead.`}
      </p>
    );
  }

  const parts = parksOf(resortId).map((p) => parkPart(p.label, hours[p.key]));
  return (
    <div className={`${box} flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]`}
         role="note" aria-label="Park hours" style={{ color: "var(--color-text-secondary)" }}>
      <span aria-hidden="true">{"\u{1F552}"}</span>
      {parts.map((p) => (
        // Each part stays on one line, but an event chip can wrap below its park on a phone
        <span key={p.label} className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="whitespace-nowrap"><span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{p.label}</span> {p.hours}</span>
          {p.events.map((e) => (
            <span key={e} className="px-1.5 py-0.5 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: "color-mix(in srgb, var(--color-accent-preview) 14%, transparent)" }}>
              {"\u{1F39F}️"} {e}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
