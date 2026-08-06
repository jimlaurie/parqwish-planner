"use client";

import type { Trip } from "@/lib/db";
import type { DayItemStats } from "@/hooks/use-day-items";
import ActiveUserChip from "@/components/ActiveUserChip";

interface PlayHeaderProps {
  trip: Trip;
  stats: DayItemStats;
}

export default function PlayHeader({ trip, stats }: PlayHeaderProps) {
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
      </div>
    </div>
  );
}
