"use client";

// ==================== WAIT TIME HEAT MAP PAGE ====================
// Resort-wide historical wait times, color-coded on a map. Unlike Trip Map
// (/publish/map), this has no trip or date dependency — it's the same data
// regardless of which trip you arrived from — so this page doesn't gate on
// or read any trip/day/trail state, just the published wait-time aggregate
// joined against attraction coordinates.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getAttractionCoords, getWaitTimeStats, type WaitTimeStats } from "@/lib/park-data";
import type { WaitTimeMarker } from "@/components/publish/WaitTimeHeatMap";
import { WaitTimeLegend } from "@/components/publish/waitTimeColors";

const ACCENT = "var(--color-accent-publish)";

const WaitTimeHeatMap = dynamic(() => import("@/components/publish/WaitTimeHeatMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 w-full flex items-center justify-center"
         style={{ backgroundColor: "var(--color-surface-sunken)" }}>
      <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading map…</span>
    </div>
  ),
});

// "weekday"/"weekend" read from WaitTimeRideEntry's top-level fields; the
// individual days read from its byDayOfWeek map — same WaitTimeDayStat
// shape either way, so the marker-building logic below doesn't need to
// branch on which kind of filter is active beyond picking the source.
const DAY_FILTERS = [
  { value: "weekday", label: "Weekday" },
  { value: "weekend", label: "Weekend" },
  { value: "sunday", label: "Sun" },
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
] as const;

type DayType = (typeof DAY_FILTERS)[number]["value"];

export default function WaitTimeHeatMapPage() {
  const router = useRouter();
  const [stats, setStats] = useState<WaitTimeStats | null>(null);
  const [coordMaps, setCoordMaps] = useState<Awaited<ReturnType<typeof getAttractionCoords>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayType, setDayType] = useState<DayType>("weekday");

  useEffect(() => {
    Promise.all([getWaitTimeStats(), getAttractionCoords()])
      .then(([s, c]) => {
        setStats(s);
        setCoordMaps(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const markers = useMemo<WaitTimeMarker[]>(() => {
    if (!stats || !coordMaps) return [];
    const result: WaitTimeMarker[] = [];
    for (const [id, ride] of Object.entries(stats.rides)) {
      const stat = dayType === "weekday" || dayType === "weekend"
        ? ride[dayType]
        : ride.byDayOfWeek?.[dayType] ?? null;
      const coord = coordMaps.byId[id];
      if (!stat || !coord) continue;
      result.push({
        id,
        rideName: ride.rideName,
        latitude: coord.latitude,
        longitude: coord.longitude,
        medianWaitMinutes: stat.medianWaitMinutes,
        sampleSize: stat.sampleSize,
      });
    }
    return result;
  }, [stats, coordMaps, dayType]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden" style={{ backgroundColor: "var(--color-bg-deep)" }}>
      {/* Header */}
      <div className="flex flex-col gap-2 px-4 py-3 shrink-0"
           style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => router.push("/publish")}
            className="text-sm px-2 py-1 rounded cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}>
            ← Publish
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🌡️</span>
            <h1 className="text-base font-bold" style={{ color: "var(--color-heading)" }}>
              Wait Time Heat Map
            </h1>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {DAY_FILTERS.map(({ value, label }, i) => {
            const active = dayType === value;
            // Visual gap between the two aggregate buckets (Weekday/Weekend)
            // and the individual days that follow them.
            const startsDayGroup = i === 2;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setDayType(value)}
                className={`text-xs px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap transition-colors duration-100 ${startsDayGroup ? "ml-2" : ""}`}
                style={{
                  backgroundColor: active ? `color-mix(in srgb, ${ACCENT} 18%, transparent)` : "var(--color-surface-sunken)",
                  color: active ? ACCENT : "var(--color-text-dim)",
                  border: active ? `1px solid color-mix(in srgb, ${ACCENT} 40%, transparent)` : "1px solid transparent",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {stats && (
        <div className="px-4 py-2 text-[10px] shrink-0" style={{ color: "var(--color-text-dim)" }}>
          Based on {stats.windowDays} days of data ({stats.windowStart} to {stats.windowEnd}) · {markers.length} rides shown
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading…</span>
          </div>
        ) : !stats ? (
          <div className="h-full w-full flex items-center justify-center px-8 text-center">
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Wait time data isn&rsquo;t available yet — check back after tonight&rsquo;s update.
            </span>
          </div>
        ) : (
          <>
            <WaitTimeHeatMap markers={markers} />
            <WaitTimeLegend />
          </>
        )}
      </div>
    </div>
  );
}
