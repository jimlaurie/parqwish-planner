"use client";

// The Preview page's header. Row 1: the trip name, the day tabs and whose
// plan it is; row 2: the day's counts, its park hours and Analytics. The day
// tabs and hours are passed in (DatePickerBar, ParkHoursLine) so the
// timeline starts as high as possible; on a phone the tabs take their own line.

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Trip } from "@/lib/db";
import type { DayItemStats } from "@/hooks/use-day-items";
import ActiveUserChip from "@/components/ActiveUserChip";

interface PlayHeaderProps {
  trip: Trip;
  stats: DayItemStats;
  /** The trip's day tabs, on the title row. */
  dayTabs?: ReactNode;
  /** The selected day's park hours, on the counts row. */
  hours?: ReactNode;
}

const ACCENT = "var(--color-accent-preview)";

export default function PlayHeader({ trip, stats, dayTabs, hours }: PlayHeaderProps) {
  const router = useRouter();

  return (
    <div className="w-full max-w-7xl mb-4">
      <div className="flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2 mb-1">
        <h1 className="text-2xl font-bold min-w-0 truncate md:max-w-[22rem] shrink" style={{ color: "var(--color-heading)" }} title={trip.name}>
          {trip.name}
        </h1>
        {/* Phones: the tabs drop to their own line below the name */}
        {dayTabs && <div className="order-last w-full md:order-none md:w-auto md:flex-1 min-w-0">{dayTabs}</div>}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          <ActiveUserChip />
          <span className="text-2xl">{"\uD83D\uDD25"}</span>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mt-2"
        style={{ color: "var(--color-text-muted)" }}
      >
        <span>
          {"\uD83D\uDCC5"} {stats.total} scheduled
        </span>
        <span>
          {"\u2705"} {stats.completed} done
        </span>
        {stats.total > 0 && (
          <span>
            {"\u23F3"} {stats.total - stats.completed} remaining
          </span>
        )}
        {hours}

        {/* Opens the /preview/analytics gallery (Wait Time Heat Map, Ride
            Reliability, and a natural spot for more historical-data tools
            to join later \u2014 e.g. crowd calendars) since they're all "help me
            decide when" rather than "what did we do", which is what the
            rest of this page and Publish's own analytics section are about. */}
        <button
          type="button"
          onClick={() => router.push("/preview/analytics")}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer transition-colors duration-100 hover:brightness-110"
          style={{
            backgroundColor: "var(--color-surface-sunken)",
            color: ACCENT,
            border: `1px solid color-mix(in srgb, ${ACCENT} 40%, transparent)`,
          }}
        >
          {"\uD83D\uDCCA"} Analytics
        </button>
      </div>
    </div>
  );
}
