"use client";

import type { PublishData } from "@/hooks/use-publish-data";

const ACCENT = "var(--color-accent-publish)";
const SUCCESS = "var(--color-success)";

interface PublishHeaderProps {
  data: PublishData;
}

export default function PublishHeader({ data }: PublishHeaderProps) {
  const { trip, totalItineraryItems, completedItineraryItems, days } = data;

  const overallPercent =
    totalItineraryItems > 0
      ? Math.round((completedItineraryItems / totalItineraryItems) * 100)
      : 0;

  // Format date range
  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  return (
    <div className="w-full max-w-4xl mb-6">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold flex-1" style={{ color: "var(--color-heading)" }}>
          {trip.name}
        </h1>
        <span className="text-2xl">{"\uD83D\uDE80"}</span>
      </div>

      <p
        className="text-xs mt-2 mb-3"
        style={{ color: "var(--color-text-muted)" }}
      >
        {formatDate(trip.startDate)} — {formatDate(trip.endDate)} · {days.length}{" "}
        {days.length === 1 ? "day" : "days"}
      </p>

      {/* Overall completion bar */}
      {totalItineraryItems > 0 && (
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--color-surface-raised)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallPercent}%`,
                backgroundColor:
                  overallPercent === 100 ? SUCCESS : ACCENT,
              }}
            />
          </div>
          <span
            className="text-xs font-semibold shrink-0"
            style={{
              color: overallPercent === 100 ? SUCCESS : ACCENT,
            }}
          >
            {overallPercent}% complete
          </span>
        </div>
      )}
    </div>
  );
}
