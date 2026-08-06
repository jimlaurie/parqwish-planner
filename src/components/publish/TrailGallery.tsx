"use client";

// ==================== TRAIL GALLERY ====================
// Renders GPS trail data imported from the mobile app for the current trip.
// One card per recorded day, with distance/duration stats, time-range filter,
// and a mini map polyline. Pro feature on mobile — PWA just visualizes it.

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type TripTrail } from "@/lib/db";
import type { ItineraryItem } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { getAttractionCoords, type CoordMaps } from "@/lib/park-data";
import { auth, isSyncEnabled } from "@/lib/auth";
import { deleteTrailRemote } from "@/lib/wish-sync";
import type { TrailMarker } from "./TrailMiniMap";

const ACCENT = "var(--color-accent-publish)";

// ==================== TYPES ====================

export interface TrailTimeRange { from: string; to: string }
export type TrailTimeRanges = Record<string, TrailTimeRange>; // keyed by trail.date

interface TrailGalleryProps {
  onTimeRangesChange?: (ranges: TrailTimeRanges) => void;
}

// ==================== HELPERS ====================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function tsToTimeStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function format12h(hhmm: string): string {
  const [hh, mm] = hhmm.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${h12}:${mm.toString().padStart(2, "0")} ${period}`;
}

type TrailPoint = TripTrail["points"][number];

function filterPointsByRange(points: TrailPoint[], from: string, to: string): TrailPoint[] {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const fromMins = fh * 60 + fm;
  const toMins   = th * 60 + tm;
  return points.filter((p) => {
    const d    = new Date(p.timestamp);
    const mins = d.getHours() * 60 + d.getMinutes();
    return mins >= fromMins && mins <= toMins;
  });
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcDistanceMiles(points: TrailPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMiles(
      points[i - 1].latitude, points[i - 1].longitude,
      points[i].latitude,     points[i].longitude,
    );
  }
  return total;
}

function calcDurationMinutes(points: TrailPoint[]): number {
  if (points.length < 2) return 0;
  return Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 60_000);
}

function defaultRangeForTrail(trail: TripTrail): TrailTimeRange | null {
  if (!trail.points?.length) return null;
  const sorted = [...trail.points].sort((a, b) => a.timestamp - b.timestamp);
  return { from: tsToTimeStr(sorted[0].timestamp), to: tsToTimeStr(sorted[sorted.length - 1].timestamp) };
}

// ==================== LEAFLET WRAPPER (dynamic) ====================

const TrailMiniMap = dynamic(() => import("./TrailMiniMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-lg flex items-center justify-center"
         style={{ backgroundColor: "var(--color-surface-sunken)" }}>
      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loading map…</span>
    </div>
  ),
});

// ==================== COMPONENT ====================

export default function TrailGallery({ onTimeRangesChange }: TrailGalleryProps) {
  const { currentTripId } = useAppStore();
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [timeRanges,   setTimeRanges]   = useState<TrailTimeRanges>({});
  const [deletingTrail, setDeletingTrail] = useState<TripTrail | null>(null);
  const coordMapsRef = useRef<CoordMaps | null>(null);
  const [coordMaps,   setCoordMaps]   = useState<CoordMaps | null>(null);

  const handleDeleteTrail = useCallback(async () => {
    if (!deletingTrail) return;
    const trail = deletingTrail;
    setDeletingTrail(null);
    await db.trails.delete(trail.id);
    const user = auth.currentUser;
    if (user && isSyncEnabled(user)) {
      deleteTrailRemote(trail.tripId, `${trail.date}__${trail.userId}`, user.uid).catch(() => {});
    }
  }, [deletingTrail]);

  useEffect(() => {
    if (coordMapsRef.current) return;
    getAttractionCoords().then((maps) => {
      coordMapsRef.current = maps;
      setCoordMaps(maps);
    }).catch(() => {});
  }, []);

  const trails = useLiveQuery(
    () => currentTripId
      ? db.trails.where("tripId").equals(currentTripId).toArray()
      : Promise.resolve<TripTrail[]>([]),
    [currentTripId],
    [] as TripTrail[],
  );

  const sorted = useMemo(
    () => [...(trails || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [trails],
  );

  // Initialise time ranges once per trail (when trails first load or new ones appear)
  useEffect(() => {
    if (!sorted.length) return;
    setTimeRanges((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const trail of sorted) {
        if (next[trail.date]) continue;
        const def = defaultRangeForTrail(trail);
        if (!def) continue;
        next[trail.date] = def;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [sorted]);

  // Notify parent whenever time ranges change
  useEffect(() => {
    onTimeRangesChange?.(timeRanges);
  }, [timeRanges, onTimeRangesChange]);

  const updateRange = useCallback((date: string, field: "from" | "to", value: string) => {
    setTimeRanges((prev) => ({ ...prev, [date]: { ...prev[date], [field]: value } }));
  }, []);

  const resetRange = useCallback((trail: TripTrail) => {
    const def = defaultRangeForTrail(trail);
    if (!def) return;
    setTimeRanges((prev) => ({ ...prev, [trail.date]: def }));
  }, []);

  const completedItems = useLiveQuery(
    () => currentTripId
      ? db.itineraryItems.where("tripId").equals(currentTripId)
          .and((i: ItineraryItem) => i.completed)
          .toArray()
      : Promise.resolve<ItineraryItem[]>([]),
    [currentTripId],
    [] as ItineraryItem[],
  );

  const markersByDate = useMemo(() => {
    const result: Record<string, TrailMarker[]> = {};
    if (!coordMaps || !completedItems?.length) return result;
    for (const item of completedItems) {
      const coord =
        (item.parkDataId ? coordMaps.byId[item.parkDataId] : undefined) ??
        coordMaps.byName[item.title.toLowerCase()];
      if (!coord) continue;
      const marker: TrailMarker = {
        latitude:  coord.latitude,
        longitude: coord.longitude,
        title:     item.title,
        itemType:  item.itemType ?? item.sourceType ?? "wish",
        time:      item.startTime !== "09:00" ? item.startTime : undefined,
      };
      if (!result[item.date]) result[item.date] = [];
      result[item.date].push(marker);
    }
    return result;
  }, [coordMaps, completedItems]);

  // Filtered trail objects (sorted points + recalculated stats)
  const filteredByDate = useMemo(() => {
    const result: Record<string, { trail: TripTrail; filteredPoints: TrailPoint[]; isFiltered: boolean }> = {};
    for (const trail of sorted) {
      const rawSorted   = [...trail.points].sort((a, b) => a.timestamp - b.timestamp);
      const range       = timeRanges[trail.date];
      const filtered    = range ? filterPointsByRange(rawSorted, range.from, range.to) : rawSorted;
      const def         = defaultRangeForTrail(trail);
      const isFiltered  = !!range && def
        ? range.from !== def.from || range.to !== def.to
        : false;
      result[trail.date] = {
        isFiltered,
        filteredPoints: filtered,
        trail: {
          ...trail,
          points:          filtered,
          distanceMiles:   calcDistanceMiles(filtered),
          durationMinutes: calcDurationMinutes(filtered),
          pointCount:      filtered.length,
        },
      };
    }
    return result;
  }, [sorted, timeRanges]);

  const totals = useMemo(() => {
    let miles = 0, minutes = 0, points = 0;
    for (const { trail } of Object.values(filteredByDate)) {
      miles   += trail.distanceMiles   || 0;
      minutes += trail.durationMinutes || 0;
      points  += trail.pointCount      || 0;
    }
    return { miles, minutes, points, days: sorted.length };
  }, [filteredByDate, sorted.length]);

  if (!currentTripId) return null;

  if (sorted.length === 0) {
    return (
      <section className="w-full max-w-4xl mb-8">
        <SectionHeader />
        <div className="p-6 rounded-lg text-center"
             style={{ backgroundColor: "var(--color-surface-raised)", border: "1px solid var(--color-border-subtle)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No GPS trail data yet. Enable trail recording in the mobile app and import your trip data.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-4xl mb-8">
      <SectionHeader />

      {/* Summary stats (reflect filtered totals) */}
      <div className="grid grid-cols-4 gap-3 mb-4 p-4 rounded-lg"
           style={{ backgroundColor: "var(--color-surface-raised)", border: "1px solid var(--color-border-subtle)" }}>
        <Stat label="Days"   value={totals.days.toString()} />
        <Stat label="Miles"  value={totals.miles.toFixed(1)} />
        <Stat label="Time"   value={formatDuration(totals.minutes)} />
        <Stat label="Points" value={totals.points.toLocaleString()} />
      </div>

      {/* Per-day cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((rawTrail) => {
          const isOpen  = expanded === rawTrail.id;
          const fd      = filteredByDate[rawTrail.date];
          const range   = timeRanges[rawTrail.date];
          const def     = defaultRangeForTrail(rawTrail);

          return (
            <div key={rawTrail.id} className="rounded-lg overflow-hidden"
                 style={{ backgroundColor: "var(--color-surface-raised)", border: "1px solid var(--color-border-subtle)" }}>

              {/* Card header — always visible */}
              <button type="button" onClick={() => setExpanded(isOpen ? null : rawTrail.id)}
                      className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:brightness-110">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {formatDate(rawTrail.date)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {fd ? (
                      <>
                        {fd.trail.distanceMiles.toFixed(1)} mi ·{" "}
                        {formatDuration(fd.trail.durationMinutes)} ·{" "}
                        {fd.trail.pointCount} pts
                        {fd.isFiltered && (
                          <span style={{ color: ACCENT }}> · filtered</span>
                        )}
                      </>
                    ) : (
                      <>{rawTrail.distanceMiles.toFixed(1)} mi · {formatDuration(rawTrail.durationMinutes)}</>
                    )}
                  </div>
                </div>
                <span style={{ color: ACCENT }}>{isOpen ? "▴" : "▾"}</span>
              </button>

              {/* Expanded content */}
              {isOpen && fd && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>

                  {/* Time range filter */}
                  <div className="flex items-center gap-3 py-3 flex-wrap">
                    <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      Walking time:
                    </span>
                    <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      From
                      <input
                        type="time"
                        value={range?.from ?? def?.from ?? ""}
                        onChange={(e) => updateRange(rawTrail.date, "from", e.target.value)}
                        className="rounded px-2 py-0.5 text-xs border"
                        style={{
                          backgroundColor: "var(--color-bg-card)",
                          color:           "var(--color-text-primary)",
                          borderColor:     "var(--color-border-input)",
                        }}
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      To
                      <input
                        type="time"
                        value={range?.to ?? def?.to ?? ""}
                        onChange={(e) => updateRange(rawTrail.date, "to", e.target.value)}
                        className="rounded px-2 py-0.5 text-xs border"
                        style={{
                          backgroundColor: "var(--color-bg-card)",
                          color:           "var(--color-text-primary)",
                          borderColor:     "var(--color-border-input)",
                        }}
                      />
                    </label>
                    {fd.isFiltered && (
                      <button type="button" onClick={() => resetRange(rawTrail)}
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ color: ACCENT, border: `1px solid ${ACCENT}` }}>
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Filtered stats row */}
                  {fd.isFiltered && (
                    <div className="text-xs mb-3 px-1" style={{ color: "var(--color-text-muted)" }}>
                      {range && `${format12h(range.from)} – ${format12h(range.to)}`}
                      {" · "}
                      {fd.filteredPoints.length} of {rawTrail.pointCount} points
                    </div>
                  )}

                  <TrailMiniMap trail={fd.trail} markers={markersByDate[rawTrail.date] ?? []} />

                  <div className="flex justify-end pt-3 mt-3 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <button
                      type="button"
                      onClick={() => setDeletingTrail(rawTrail)}
                      className="text-xs px-3 py-1.5 rounded-full cursor-pointer transition-colors hover:brightness-110"
                      style={{
                        background: "color-mix(in srgb, var(--color-error) 15%, transparent)",
                        color: "var(--color-error)",
                      }}
                    >
                      🗑 Delete This Day&rsquo;s Trail
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deletingTrail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50"
            style={{ willChange: "opacity", zIndex: 2000 }}
            onClick={() => setDeletingTrail(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="rounded-xl p-6 max-w-sm mx-4 shadow-xl"
              style={{ backgroundColor: "var(--color-bg-card)", willChange: "transform" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                Delete {formatDate(deletingTrail.date)}&rsquo;s trail?
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--color-text-dim)" }}>
                This removes the recorded GPS trail for this day everywhere it&rsquo;s synced. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeletingTrail(null)}
                  className="px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-white/10 transition-colors"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTrail}
                  className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer bg-[var(--color-error)] text-white hover:opacity-80 transition-opacity"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-lg">📍</span>
      <h2 className="text-base font-bold" style={{ color: "var(--color-text-secondary)" }}>
        Where You Walked
      </h2>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold" style={{ color: ACCENT }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </div>
    </div>
  );
}
