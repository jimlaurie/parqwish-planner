"use client";

import { useRouter } from "next/navigation";
import type { Trip } from "@/lib/db";
import type { DayItemStats } from "@/hooks/use-day-items";
import ActiveUserChip from "@/components/ActiveUserChip";

interface PlayHeaderProps {
  trip: Trip;
  stats: DayItemStats;
}

const ACCENT = "var(--color-accent-preview)";

export default function PlayHeader({ trip, stats }: PlayHeaderProps) {
  const router = useRouter();

  return (
    <div className="w-full max-w-7xl mb-4">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold flex-1" style={{ color: "var(--color-heading)" }}>
          {trip.name}
        </h1>
        <ActiveUserChip />
        <span className="text-2xl">{"\uD83D\uDD25"}</span>
      </div>

      <div
        className="flex items-center gap-4 text-xs mt-2"
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
