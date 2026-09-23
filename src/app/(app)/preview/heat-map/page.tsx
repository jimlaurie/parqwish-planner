"use client";

// ==================== WAIT TIME HEAT MAP PAGE ====================
// Resort-wide historical wait times, color-coded on a map. Unlike Trip Map
// (/publish/map), this has no trip or date dependency — it's the same data
// regardless of which trip you arrived from — so this page doesn't gate on
// or read any trip/day/trail state, just the published wait-time aggregate
// joined against attraction coordinates.
//
// Lives under /preview (moved from /publish Sep 2026) — Preview is where
// you're deciding what time to schedule each activity, so this data's
// hour-of-day/day-of-week dimensions are directly actionable there in a way
// they weren't on Publish's after-the-fact trip recap. Components still
// live under components/publish/ (WaitTimeHeatMap, waitTimeColors) since
// they're not Preview-specific and the rename wasn't worth the churn.
//
// Reached via the /preview/analytics gallery, not a direct PlayHeader link,
// now that Ride Reliability (/preview/reliability) exists alongside it.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getAttractionCoords, getWaitTimeStats, type WaitTimeStats } from "@/lib/park-data";
import type { WaitTimeMarker } from "@/components/publish/WaitTimeHeatMap";
import { WaitTimeLegend } from "@/components/publish/waitTimeColors";

const ACCENT = "var(--color-accent-preview)";

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

const PLAY_INTERVAL_MS = 900;

function formatHourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

export default function WaitTimeHeatMapPage() {
  const router = useRouter();
  const [stats, setStats] = useState<WaitTimeStats | null>(null);
  const [coordMaps, setCoordMaps] = useState<Awaited<ReturnType<typeof getAttractionCoords>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayType, setDayType] = useState<DayType>("weekday");
  // null = day-level aggregate (no hour selected); a number engages the
  // hourly slider. Kept separate from dayType since "by hour" is an
  // orthogonal on/off mode, not another value of the day selector.
  const [hourFilter, setHourFilter] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([getWaitTimeStats(), getAttractionCoords()])
      .then(([s, c]) => {
        setStats(s);
        setCoordMaps(c);
      })
      .finally(() => setLoading(false));
  }, []);

  // Hours with at least one ride's data for the currently selected day —
  // computed from the data rather than hardcoded, so it reflects whatever
  // hours actually cleared MIN_SAMPLE_SIZE for that specific day/day-type
  // rather than assuming fixed park hours.
  const availableHours = useMemo<number[]>(() => {
    if (!stats) return [];
    const hourSet = new Set<number>();
    for (const ride of Object.values(stats.rides)) {
      const hourMap = dayType === "weekday" || dayType === "weekend"
        ? ride.byHour?.[dayType]
        : ride.byHourByDayOfWeek?.[dayType];
      if (!hourMap) continue;
      for (const h of Object.keys(hourMap)) hourSet.add(Number(h));
    }
    return Array.from(hourSet).sort((a, b) => a - b);
  }, [stats, dayType]);

  // Changing the day selector while the slider is engaged could otherwise
  // leave it pointed at an hour with no data for the new day — snap back to
  // the first available hour (or drop out of hourly mode entirely if the
  // new day has no hourly data at all) instead of silently showing nothing.
  useEffect(() => {
    setIsPlaying(false);
    setHourFilter((prev) => {
      if (prev === null) return null;
      return availableHours.length > 0 ? availableHours[0] : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayType]);

  useEffect(() => {
    if (!isPlaying || availableHours.length === 0) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }
    playIntervalRef.current = setInterval(() => {
      setHourFilter((prev) => {
        const idx = prev === null ? -1 : availableHours.indexOf(prev);
        const nextIdx = (idx + 1) % availableHours.length;
        return availableHours[nextIdx];
      });
    }, PLAY_INTERVAL_MS);
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, availableHours]);

  const toggleHourly = () => {
    if (hourFilter !== null) {
      setIsPlaying(false);
      setHourFilter(null);
    } else {
      setHourFilter(availableHours[0] ?? null);
    }
  };

  const markers = useMemo<WaitTimeMarker[]>(() => {
    if (!stats || !coordMaps) return [];
    const result: WaitTimeMarker[] = [];
    for (const [id, ride] of Object.entries(stats.rides)) {
      let stat = null;
      if (hourFilter !== null) {
        const hourMap = dayType === "weekday" || dayType === "weekend"
          ? ride.byHour?.[dayType]
          : ride.byHourByDayOfWeek?.[dayType];
        stat = hourMap?.[String(hourFilter)] ?? null;
      } else {
        stat = dayType === "weekday" || dayType === "weekend"
          ? ride[dayType]
          : ride.byDayOfWeek?.[dayType] ?? null;
      }
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
  }, [stats, coordMaps, dayType, hourFilter]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden" style={{ backgroundColor: "var(--color-bg-deep)" }}>
      {/* Header */}
      <div className="flex flex-col gap-2 px-4 py-3 shrink-0"
           style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => router.push("/preview/analytics")}
            className="text-sm px-2 py-1 rounded cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}>
            ← Analytics
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🌡️</span>
            <h1 className="text-base font-bold" style={{ color: "var(--color-heading)" }}>
              Wait Time Heat Map
            </h1>
          </div>
        </div>

        <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
          Historical resort-wide averages, not a live forecast for your trip dates — useful for spotting generally slower times to plan around.
        </p>

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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleHourly}
            disabled={availableHours.length === 0}
            className="text-xs px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: hourFilter !== null ? `color-mix(in srgb, ${ACCENT} 18%, transparent)` : "var(--color-surface-sunken)",
              color: hourFilter !== null ? ACCENT : "var(--color-text-dim)",
              border: hourFilter !== null ? `1px solid color-mix(in srgb, ${ACCENT} 40%, transparent)` : "1px solid transparent",
            }}
          >
            🕐 By Hour
          </button>

          {hourFilter !== null && availableHours.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="text-xs w-7 h-7 rounded-full cursor-pointer flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--color-surface-sunken)", color: ACCENT }}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
              <input
                type="range"
                min={0}
                max={availableHours.length - 1}
                value={Math.max(0, availableHours.indexOf(hourFilter))}
                onChange={(e) => {
                  setIsPlaying(false);
                  setHourFilter(availableHours[Number(e.target.value)]);
                }}
                className="flex-1 min-w-[100px] cursor-pointer"
              />
              <span
                className="text-xs tabular-nums shrink-0 w-14 text-right"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {formatHourLabel(hourFilter)}
              </span>
            </>
          )}
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
