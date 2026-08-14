"use client";

// ==================== TRIP MAP PAGE ====================
// Standalone day-by-day map: GPS trail + every logged item plotted at its
// real-world location, with a visual flag on anything whose logged time
// doesn't line up with where the trail actually was — a way to catch a
// missed "completed" tap or a fudged time, not just replay the day.

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type TripTrail } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { useTrips } from "@/hooks/use-trips";
import { useDayItems } from "@/hooks/use-day-items";
import { getAttractionCoords, type CoordMaps } from "@/lib/park-data";
import { flagItem } from "@/lib/trip-map-flags";
import { DAY_ITEM_TYPE_ICONS } from "@shared/types/day-item";
import DayItemEditModal from "@/components/play/DayItemEditModal";
import type { TripMapMarker } from "@/components/publish/TripMapView";

const ACCENT = "var(--color-accent-publish)";
const FLAG_COLOR = "var(--color-error)";

const TripMapView = dynamic(() => import("@/components/publish/TripMapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center"
         style={{ backgroundColor: "var(--color-surface-sunken)" }}>
      <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading map…</span>
    </div>
  ),
});

// ==================== HELPERS ====================

function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatTabDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function format12h(hhmm?: string): string | undefined {
  if (!hhmm) return undefined;
  const [hh, mm] = hhmm.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return undefined;
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${h12}:${mm.toString().padStart(2, "0")} ${period}`;
}

// ==================== PAGE ====================

export default function TripMapPage() {
  const router = useRouter();
  const { _hasHydrated, currentTripId } = useAppStore();
  const { currentTrip } = useTrips();
  const coordMapsRef = useRef<CoordMaps | null>(null);
  const [coordMaps, setCoordMaps] = useState<CoordMaps | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!_hasHydrated || currentTripId) return;
    const timer = setTimeout(() => {
      if (!useAppStore.getState().currentTripId) router.push("/");
    }, 300);
    return () => clearTimeout(timer);
  }, [_hasHydrated, currentTripId, router]);

  useEffect(() => {
    if (coordMapsRef.current) return;
    getAttractionCoords().then((maps) => {
      coordMapsRef.current = maps;
      setCoordMaps(maps);
    }).catch(() => {});
  }, []);

  const dates = useMemo(
    () => (currentTrip ? getDatesBetween(currentTrip.startDate, currentTrip.endDate) : []),
    [currentTrip]
  );

  useEffect(() => {
    if (selectedDate || dates.length === 0) return;
    setSelectedDate(dates[0]);
  }, [dates, selectedDate]);

  const { items, updateItem, removeItem, toggleCompleted } = useDayItems(selectedDate);

  // A trail can have one row per recording user for the same day — merge
  // all of them, same simplification TrailGallery already makes (no active
  // per-user filtering of trail data).
  const dayTrails = useLiveQuery(
    () => currentTripId && selectedDate
      ? db.trails.where("[tripId+date]").equals([currentTripId, selectedDate]).toArray()
      : Promise.resolve<TripTrail[]>([]),
    [currentTripId, selectedDate],
    [] as TripTrail[],
  );

  const mergedTrail = useMemo<TripTrail | null>(() => {
    if (!dayTrails || dayTrails.length === 0 || !selectedDate) return null;
    const points = dayTrails.flatMap((t) => t.points).sort((a, b) => a.timestamp - b.timestamp);
    return { ...dayTrails[0], points, pointCount: points.length };
  }, [dayTrails, selectedDate]);

  const markers = useMemo<TripMapMarker[]>(() => {
    if (!coordMaps || !selectedDate) return [];
    const result: TripMapMarker[] = [];
    for (const item of items) {
      const coord =
        (item.parkDataId ? coordMaps.byId[item.parkDataId] : undefined) ??
        coordMaps.byName[item.title.toLowerCase()];
      if (!coord) continue;
      const flag = item.completed
        ? flagItem(selectedDate, item.scheduledTime, coord, mergedTrail?.points ?? [])
        : { flagged: false };
      result.push({
        id: item.id,
        latitude: coord.latitude,
        longitude: coord.longitude,
        title: item.title,
        itemType: item.itemType,
        time: format12h(item.scheduledTime),
        hasPhoto: !!item.photos?.length,
        flag,
      });
    }
    return result;
  }, [items, coordMaps, mergedTrail, selectedDate]);

  const flaggedMarkers = useMemo(() => markers.filter((m) => m.flag.flagged), [markers]);

  const editingItem = useMemo(
    () => items.find((i) => i.id === editingItemId) ?? null,
    [items, editingItemId]
  );

  const handleMarkerClick = (id: string) => {
    setActiveMarkerId(id);
    setEditingItemId(id);
  };

  if (!currentTrip) {
    return (
      <div className="h-screen flex items-center justify-center">
        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "var(--color-bg-deep)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
           style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        <button type="button" onClick={() => router.push("/publish")}
          className="text-sm px-2 py-1 rounded cursor-pointer"
          style={{ color: "var(--color-text-muted)" }}>
          ← Publish
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          <h1 className="text-base font-bold" style={{ color: "var(--color-heading)" }}>
            {currentTrip.name} — Trip Map
          </h1>
        </div>

        {/* Day tabs */}
        {dates.length > 1 && (
          <div className="flex gap-1 ml-auto overflow-x-auto">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { setSelectedDate(d); setActiveMarkerId(null); }}
                className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer"
                style={{
                  backgroundColor: selectedDate === d ? ACCENT : "var(--color-surface-raised)",
                  color: selectedDate === d ? "#000" : "var(--color-text-muted)",
                }}
              >
                {formatTabDate(d)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Map */}
        <div className="flex-1 relative min-h-0">
          <TripMapView
            trail={mergedTrail}
            markers={markers}
            activeMarkerId={activeMarkerId}
            onMarkerClick={handleMarkerClick}
          />
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 overflow-y-auto p-3 hidden md:block"
             style={{ borderLeft: "1px solid var(--color-border-subtle)", backgroundColor: "var(--color-surface-raised)" }}>
          {!mergedTrail && (
            <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
              No GPS trail recorded for this day — items are plotted at their real-world location, but there&rsquo;s nothing to compare them against.
            </p>
          )}

          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color: FLAG_COLOR }}>⚠</span>
            <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
              {flaggedMarkers.length === 0 ? "Nothing flagged" : `${flaggedMarkers.length} to review`}
            </h2>
          </div>

          {flaggedMarkers.length === 0 && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Everything checked off lines up with where the trail actually was.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            {flaggedMarkers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleMarkerClick(m.id)}
                className="text-left p-2 rounded-lg cursor-pointer hover:brightness-110"
                style={{
                  backgroundColor: "var(--color-surface-overlay)",
                  border: activeMarkerId === m.id ? `1px solid ${FLAG_COLOR}` : "1px solid transparent",
                }}
              >
                <div className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {DAY_ITEM_TYPE_ICONS[m.itemType] ?? "📌"} {m.title}
                </div>
                {m.time && (
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {m.time}
                  </div>
                )}
                <div className="text-[10px] mt-1" style={{ color: FLAG_COLOR }}>
                  {m.flag.reason === "no-trail-coverage"
                    ? "No trail data near this time"
                    : `~${m.flag.nearestDistanceMiles} mi from the trail at this time`}
                </div>
              </button>
            ))}
          </div>

          {markers.length > 0 && (
            <p className="text-[10px] mt-4 pt-3" style={{ color: "var(--color-text-dim)", borderTop: "1px solid var(--color-border-subtle)" }}>
              {markers.length} item{markers.length === 1 ? "" : "s"} plotted this day. Items without a park/dining/show location (outfits, gear, sundries) aren&rsquo;t mappable and don&rsquo;t appear here.
            </p>
          )}
        </div>
      </div>

      <DayItemEditModal
        visible={!!editingItemId}
        item={editingItem}
        onClose={() => setEditingItemId(null)}
        onSave={async (id, updates) => { await updateItem(id, updates as Parameters<typeof updateItem>[1]); }}
        onRemove={async (id) => { await removeItem(id); setEditingItemId(null); }}
        onToggleCompleted={async (id) => { await toggleCompleted(id); }}
      />
    </div>
  );
}
