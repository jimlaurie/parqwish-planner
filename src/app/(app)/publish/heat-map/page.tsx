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

type DayType = "weekday" | "weekend";

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
      const stat = ride[dayType];
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
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 flex-wrap"
           style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
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

        <div className="flex gap-1 ml-auto">
          {(["weekday", "weekend"] as const).map((t) => {
            const active = dayType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setDayType(t)}
                className="text-xs px-3 py-1.5 rounded-full cursor-pointer capitalize transition-colors duration-100"
                style={{
                  backgroundColor: active ? `color-mix(in srgb, ${ACCENT} 18%, transparent)` : "var(--color-surface-sunken)",
                  color: active ? ACCENT : "var(--color-text-dim)",
                  border: active ? `1px solid color-mix(in srgb, ${ACCENT} 40%, transparent)` : "1px solid transparent",
                }}
              >
                {t}
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
      <div className="flex-1 min-h-0">
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
          <WaitTimeHeatMap markers={markers} />
        )}
      </div>
    </div>
  );
}
