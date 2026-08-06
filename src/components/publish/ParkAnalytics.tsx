"use client";

import { useMemo } from "react";
import { LAND_COLORS } from "@/lib/map-data";

const ACCENT = "var(--color-accent-publish)";

// ==================== TYPES ====================

interface ParkAnalyticsProps {
  parkBreakdown: Record<string, { count: number; completed: number }>;
  landBreakdown: Record<string, { count: number; completed: number }>;
}

interface BarEntry {
  name: string;
  count: number;
  completed: number;
  color: string;
}

// ==================== BAR ROW ====================

function BarRow({ entry, maxCount }: { entry: BarEntry; maxCount: number }) {
  const widthPercent = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
  const completionPercent =
    entry.count > 0 ? Math.round((entry.completed / entry.count) * 100) : 0;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span
        className="text-xs w-40 shrink-0 truncate text-right"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {entry.name}
      </span>
      <div className="flex-1 relative">
        <div
          className="h-5 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--color-surface-sunken)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
            style={{
              width: `${Math.max(widthPercent, 8)}%`,
              backgroundColor: entry.color,
              opacity: 0.7,
            }}
          >
            {widthPercent > 25 && (
              <span
                className="text-[10px] font-semibold"
                style={{ color: "var(--color-bg-deep)" }}
              >
                {entry.count}
              </span>
            )}
          </div>
        </div>
      </div>
      <span
        className="text-[10px] font-mono w-16 shrink-0"
        style={{ color: "var(--color-text-dim)" }}
      >
        {entry.count} · {completionPercent}%
      </span>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function ParkAnalytics({
  parkBreakdown,
  landBreakdown,
}: ParkAnalyticsProps) {
  // Sort parks by count
  const parkEntries = useMemo<BarEntry[]>(() => {
    return Object.entries(parkBreakdown)
      .map(([name, data]) => ({
        name,
        count: data.count,
        completed: data.completed,
        color: LAND_COLORS[name] ?? ACCENT,
      }))
      .sort((a, b) => b.count - a.count);
  }, [parkBreakdown]);

  // Sort lands by count, take top 8
  const landEntries = useMemo<BarEntry[]>(() => {
    return Object.entries(landBreakdown)
      .map(([name, data]) => ({
        name,
        count: data.count,
        completed: data.completed,
        color: LAND_COLORS[name] ?? ACCENT,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [landBreakdown]);

  const maxParkCount = parkEntries.reduce(
    (max, e) => Math.max(max, e.count),
    0
  );
  const maxLandCount = landEntries.reduce(
    (max, e) => Math.max(max, e.count),
    0
  );

  if (parkEntries.length === 0 && landEntries.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mb-8">
      <h2
        className="text-xs font-bold mb-4 uppercase tracking-wider"
        style={{ color: ACCENT }}
      >
        Park Analytics
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Park Breakdown */}
        {parkEntries.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <h3
              className="text-[10px] uppercase tracking-wider font-semibold mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              By Park
            </h3>
            <div>
              {parkEntries.map((entry) => (
                <BarRow
                  key={entry.name}
                  entry={entry}
                  maxCount={maxParkCount}
                />
              ))}
            </div>
          </div>
        )}

        {/* Land Breakdown */}
        {landEntries.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <h3
              className="text-[10px] uppercase tracking-wider font-semibold mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              Top Lands
            </h3>
            <div>
              {landEntries.map((entry) => (
                <BarRow
                  key={entry.name}
                  entry={entry}
                  maxCount={maxLandCount}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
