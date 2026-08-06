"use client";

// ==================== TRAIL MINI MAP ====================
// Animated Leaflet map with play/pause, speed multiplier, and timeline scrubber.
// Loaded dynamically by TrailGallery (no SSR — Leaflet touches window).

import { useMemo, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { TripTrail } from "@/lib/db";
import { TILE_URL, TILE_ATTRIBUTION, TILE_CLASS_NAME } from "@/lib/map-data";

const TRAIL_COLOR = "#FFA500";
const TICK_MS = 50;
const BASE_DURATION_MS = 30_000;
const SPEEDS = [1, 2, 5, 10] as const;
type Speed = (typeof SPEEDS)[number];

// ==================== MARKER TYPES ====================

export interface TrailMarker {
  latitude: number;
  longitude: number;
  title: string;
  itemType: string;
  time?: string; // HH:mm
}

const MARKER_META: Record<string, { color: string; icon: string; label: string }> = {
  ride:     { color: "#1E88E5", icon: "🎢", label: "Ride" },
  show:     { color: "#8E24AA", icon: "🎭", label: "Show" },
  dining:   { color: "#FB8C00", icon: "🍽️", label: "Dining" },
  place:    { color: "#43A047", icon: "📍", label: "Place" },
  shopping: { color: "#E91E63", icon: "🛍️", label: "Shop" },
  wish:     { color: "#78909C", icon: "⭐", label: "Wish" },
};
const DEFAULT_MARKER = { color: "#78909C", icon: "📌", label: "Item" };

// ==================== HELPERS ====================

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ==================== MAP SUB-COMPONENTS ====================

function MapFitBounds({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current) return;
    fitted.current = true;
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return null;
}

function TrailMapView({
  allPositions,
  activePositions,
  currentPoint,
  bounds,
  markers = [],
}: {
  allPositions: [number, number][];
  activePositions: [number, number][];
  currentPoint: { latitude: number; longitude: number } | null;
  bounds: [[number, number], [number, number]];
  markers?: TrailMarker[];
}) {
  const complete = activePositions.length >= allPositions.length;
  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [20, 20] }}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} className={TILE_CLASS_NAME} />

      {/* Ghost — full path at low opacity */}
      <Polyline
        positions={allPositions}
        pathOptions={{ color: TRAIL_COLOR, weight: 2, opacity: 0.2 }}
      />

      {/* Active — drawn portion */}
      {activePositions.length > 1 && (
        <Polyline
          positions={activePositions}
          pathOptions={{ color: TRAIL_COLOR, weight: 3, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
        />
      )}

      {/* Start marker */}
      <CircleMarker
        center={allPositions[0]}
        radius={6}
        pathOptions={{ color: "#4CAF50", fillColor: "#4CAF50", fillOpacity: 1, weight: 2 }}
      />

      {/* Moving position dot */}
      {currentPoint && !complete && (
        <CircleMarker
          center={[currentPoint.latitude, currentPoint.longitude]}
          radius={7}
          pathOptions={{ color: "#fff", fillColor: TRAIL_COLOR, fillOpacity: 1, weight: 2 }}
        />
      )}

      {/* End marker when fully played */}
      {complete && (
        <CircleMarker
          center={allPositions[allPositions.length - 1]}
          radius={6}
          pathOptions={{ color: "#F44336", fillColor: "#F44336", fillOpacity: 1, weight: 2 }}
        />
      )}

      {/* Completed item markers */}
      {markers.map((m, i) => {
        const meta = MARKER_META[m.itemType] ?? DEFAULT_MARKER;
        return (
          <CircleMarker
            key={i}
            center={[m.latitude, m.longitude]}
            radius={8}
            pathOptions={{ color: "#fff", fillColor: meta.color, fillOpacity: 0.9, weight: 2 }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div style={{ minWidth: 120 }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>
                  {meta.icon} {m.title}
                </div>
                {m.time && (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                    {meta.label} · {m.time}
                  </div>
                )}
                {!m.time && (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{meta.label}</div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      <MapFitBounds bounds={bounds} />
    </MapContainer>
  );
}

// ==================== MAIN COMPONENT ====================

export default function TrailMiniMap({ trail, markers = [] }: { trail: TripTrail; markers?: TrailMarker[] }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [sliderIndex, setSliderIndex] = useState(trail.points.length); // start fully drawn
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(2);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sortedPoints = useMemo(
    () => [...trail.points].sort((a, b) => a.timestamp - b.timestamp),
    [trail.points]
  );

  const allPositions = useMemo(
    () => sortedPoints.map((p) => [p.latitude, p.longitude] as [number, number]),
    [sortedPoints]
  );

  // Fit view to the dense cluster to ignore off-park commute legs
  const bounds = useMemo(() => {
    if (allPositions.length === 0) return null;
    const lats = allPositions.map(([lat]) => lat).sort((a, b) => a - b);
    const lngs = allPositions.map(([, lng]) => lng).sort((a, b) => a - b);
    const medLat = lats[Math.floor(lats.length / 2)];
    const medLng = lngs[Math.floor(lngs.length / 2)];
    const RADIUS = 0.05;
    const cluster = allPositions.filter(
      ([lat, lng]) => Math.abs(lat - medLat) <= RADIUS && Math.abs(lng - medLng) <= RADIUS
    );
    const src = cluster.length >= 10 ? cluster : allPositions;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const [lat, lng] of src) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
    return [[minLat, minLng], [maxLat, maxLng]] as [[number, number], [number, number]];
  }, [allPositions]);

  const stepsPerTick = useMemo(
    () => Math.max(1, Math.ceil((allPositions.length * speed * TICK_MS) / BASE_DURATION_MS)),
    [allPositions.length, speed]
  );

  // Animation loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setSliderIndex((prev) => {
        const next = prev + stepsPerTick;
        if (next >= allPositions.length) {
          setPlaying(false);
          return allPositions.length;
        }
        return next;
      });
    }, TICK_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, stepsPerTick, allPositions.length]);

  if (!bounds || allPositions.length === 0) {
    return (
      <div className="w-full h-48 rounded-lg flex items-center justify-center"
           style={{ backgroundColor: "var(--color-overlay-light)" }}>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>No trail points</span>
      </div>
    );
  }

  const activePositions = allPositions.slice(0, sliderIndex);
  const currentPoint = sliderIndex > 0 && sliderIndex < allPositions.length
    ? sortedPoints[sliderIndex - 1]
    : null;
  const first = sortedPoints[0];
  const last = sortedPoints[sortedPoints.length - 1];
  const currentTs = sliderIndex > 0 ? sortedPoints[Math.min(sliderIndex, allPositions.length) - 1].timestamp : null;

  const handleTogglePlay = () => {
    if (sliderIndex >= allPositions.length) setSliderIndex(0);
    setPlaying((p) => !p);
  };

  const handleReset = () => {
    setPlaying(false);
    setSliderIndex(0);
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaying(false);
    setSliderIndex(Number(e.target.value));
  };

  const controls = (
    <div className="px-3 pt-2 pb-3 space-y-2"
         style={{ backgroundColor: "var(--color-surface-raised)", borderTop: "1px solid var(--color-border-subtle)" }}>

      {/* Timestamps */}
      <div className="flex items-center justify-between text-[10px]"
           style={{ color: "var(--color-text-muted)" }}>
        <span>{formatTime(first.timestamp)}</span>
        <span className="font-semibold text-xs" style={{ color: "var(--color-text-primary)" }}>
          {currentTs ? formatTime(currentTs) : "—"}
        </span>
        <span>{formatTime(last.timestamp)}</span>
      </div>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={allPositions.length}
        value={sliderIndex}
        onChange={handleSlider}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: TRAIL_COLOR }}
      />

      {/* Play controls + speed */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleReset}
          className="w-7 h-7 rounded flex items-center justify-center text-sm"
          style={{ backgroundColor: "var(--color-surface-overlay)", color: "var(--color-text-muted)" }}>
          ↺
        </button>
        <button type="button" onClick={handleTogglePlay}
          className="w-8 h-7 rounded flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: TRAIL_COLOR, color: "#000" }}>
          {playing ? "⏸" : "▶"}
        </button>
        <span className="text-[10px] ml-1" style={{ color: "var(--color-text-muted)" }}>
          {sliderIndex}/{allPositions.length} pts
        </span>
        <div className="flex gap-1 ml-auto">
          {SPEEDS.map((s) => (
            <button key={s} type="button" onClick={() => setSpeed(s)}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: speed === s ? TRAIL_COLOR : "var(--color-surface-overlay)",
                color: speed === s ? "#000" : "var(--color-text-muted)",
              }}>
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const mapProps = { allPositions, activePositions, currentPoint, bounds, markers };

  return (
    <>
      {/* Inline card */}
      <div className="rounded-lg overflow-hidden"
           style={{ border: "1px solid var(--color-border-subtle)" }}>
        <div className="relative w-full h-64">
          <TrailMapView {...mapProps} />
          <button type="button" onClick={() => setFullscreen(true)}
            className="absolute top-2 right-2 z-[1000] w-8 h-8 rounded flex items-center justify-center text-sm"
            style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-primary)" }}
            title="Expand map">
            ⛶
          </button>
        </div>
        {controls}
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-[9999] flex flex-col"
             style={{ backgroundColor: "var(--color-bg-deep)" }}>
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
               style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              GPS Trail — {trail.date}
            </span>
            <button type="button" onClick={() => setFullscreen(false)}
              className="text-xl leading-none px-2" style={{ color: "var(--color-text-muted)" }}>
              ✕
            </button>
          </div>
          <div className="flex-1 relative min-h-0">
            <TrailMapView {...mapProps} />
          </div>
          {controls}
        </div>
      )}
    </>
  );
}
