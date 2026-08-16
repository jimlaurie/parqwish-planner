"use client";

// ==================== TRIP MAP VIEW ====================
// Leaflet map for a single trip day: GPS trail + every item that day (not
// just completed ones) plotted at its real-world location, with a visual
// flag on any item whose logged time doesn't line up with where the trail
// actually was. Loaded dynamically by the Trip Map page (no SSR — Leaflet
// touches window).
//
// Shares TrailMiniMap's animated playback (ghost trail, scrubber,
// play/pause, speed) so a flagged item can be checked by scrubbing to its
// time and watching where the dot actually was — but item markers are
// always fully visible regardless of playback position, since the point
// here is comparing logged items against the trail, not just replaying it.
//
// Also supports correcting an individual GPS point (e.g. one that drifted
// while indoors): the page puts one point into "correcting" state, this
// view highlights it and listens for the next map click to relocate it.

import { useMemo, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap, useMapEvent } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DayItemType } from "@shared/types/day-item";
import { DAY_ITEM_TYPE_ICONS } from "@shared/types/day-item";
import { TILE_URL, TILE_ATTRIBUTION, TILE_CLASS_NAME, RESORT_CENTER } from "@/lib/map-data";
import type { FlagResult } from "@/lib/trip-map-flags";

const TRAIL_COLOR = "#FFA500";
const FLAG_COLOR = "#F44336";
const CORRECTING_COLOR = "#42A5F5";
const PHOTO_COLOR = "#EC407A";
const TICK_MS = 50;
const BASE_DURATION_MS = 30_000;
const SPEEDS = [1, 2, 5, 10] as const;
type Speed = (typeof SPEEDS)[number];

// ==================== TRAIL POINT / MERGED TRAIL TYPES ====================
// A day can have more than one recorded TripTrail row (one per user); the
// page flattens them into a single point list for display. Each point
// carries sourceTrailId so a correction can be written back to the right
// underlying record's key, and so a point stays identifiable across
// re-sorts/filters (see trip-map-prefs.ts's pointCorrectionKey).

export interface MergedTrailPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  sourceTrailId: string;
}

export interface MergedTrail {
  id: string;
  points: MergedTrailPoint[];
}

// ==================== MARKER TYPES ====================

export interface TripMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  itemType: DayItemType;
  time?: string; // "H:MM AM/PM"
  hasPhoto: boolean;
  flag: FlagResult;
}

// A standalone imported photo (Camera Roll, PhotoPass download) placed on
// the map — no schedule/completion concept, so no flagging applies.
export interface TripPhotoMarker {
  id: string;
  latitude: number;
  longitude: number;
  thumbnailUrl: string;
  caption?: string;
}

const MARKER_COLORS: Record<DayItemType, string> = {
  ride: "#1E88E5",
  show: "#8E24AA",
  dining: "#FB8C00",
  lightning_lane: "#FDD835",
  wish: "#78909C",
  shopping: "#E91E63",
  outfit: "#26A69A",
  equipment: "#6D4C41",
  sundry: "#8D6E63",
  place: "#43A047",
  custom: "#546E7A",
};

// ==================== HELPERS ====================

function flagLabel(flag: FlagResult): string | null {
  if (!flag.flagged) return null;
  if (flag.reason === "no-trail-coverage") return "No trail data near this time";
  if (flag.reason === "location-mismatch") {
    return `About ${flag.nearestDistanceMiles} mi from where the trail was at this time`;
  }
  return "Worth a second look";
}

function formatClockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

// ==================== SUB-COMPONENTS ====================

// Leaflet reads its container's size synchronously on mount and caches it.
// In a flex layout that's still settling (dynamic import swap, sidebar
// reflow) that read can land before the container reaches its final size —
// invalidateSize() alone enlarges the tile canvas but leaves the view
// fitted to the stale, smaller box. Re-measure AND re-fit on every real
// resize (not just once), which also naturally re-fits when bounds change
// (e.g. switching day tabs or the time-range filter).
function MapFitBounds({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [30, 30] });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [map, bounds]);
  return null;
}

function PanToMarker({ marker }: { marker: TripMapMarker | null }) {
  const map = useMap();
  useEffect(() => {
    if (!marker) return;
    map.panTo([marker.latitude, marker.longitude], { animate: true });
  }, [map, marker]);
  return null;
}

function PanToPoint({ point }: { point: MergedTrailPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    map.panTo([point.latitude, point.longitude], { animate: true });
  }, [map, point]);
  return null;
}

// Listens for the next map click while a point is being corrected. Not
// rendered/attached at all when nothing is being corrected, so an ordinary
// click on the map never accidentally relocates anything.
function CorrectionClickListener({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvent("click", (e) => onPick(e.latlng.lat, e.latlng.lng));
  return null;
}

// ==================== MAIN COMPONENT ====================

export default function TripMapView({
  trail,
  markers,
  photoMarkers = [],
  activeMarkerId,
  onMarkerClick,
  onActivePointChange,
  correctingPoint,
  onCorrectPoint,
}: {
  trail: MergedTrail | null;
  markers: TripMapMarker[];
  photoMarkers?: TripPhotoMarker[];
  activeMarkerId?: string | null;
  onMarkerClick: (id: string) => void;
  onActivePointChange?: (point: MergedTrailPoint | null) => void;
  correctingPoint?: MergedTrailPoint | null;
  onCorrectPoint?: (lat: number, lng: number) => void;
}) {
  const sortedPoints = useMemo(
    () => (trail ? [...trail.points].sort((a, b) => a.timestamp - b.timestamp) : []),
    [trail]
  );

  const trailPositions = useMemo(
    () => sortedPoints.map((p) => [p.latitude, p.longitude] as [number, number]),
    [sortedPoints]
  );

  // ---- Playback state ----
  const [sliderIndex, setSliderIndex] = useState(sortedPoints.length);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(2);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Jump to fully-drawn and stop playback whenever the underlying point set
  // changes (day switch, time-range filter) rather than mid-scrubbing a now
  // out-of-range slider position.
  useEffect(() => {
    setSliderIndex(sortedPoints.length);
    setPlaying(false);
  }, [sortedPoints]);

  const stepsPerTick = useMemo(
    () => Math.max(1, Math.ceil((trailPositions.length * speed * TICK_MS) / BASE_DURATION_MS)),
    [trailPositions.length, speed]
  );

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setSliderIndex((prev) => {
        const next = prev + stepsPerTick;
        if (next >= trailPositions.length) {
          setPlaying(false);
          return trailPositions.length;
        }
        return next;
      });
    }, TICK_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, stepsPerTick, trailPositions.length]);

  const activePositions = trailPositions.slice(0, sliderIndex);
  const currentPoint = sliderIndex > 0 && sliderIndex < trailPositions.length
    ? sortedPoints[sliderIndex - 1]
    : null;
  const complete = activePositions.length >= trailPositions.length;

  // The point the scrubber is "on" for list-highlighting purposes — unlike
  // currentPoint (which hides once playback completes, so the moving dot
  // disappears), this stays resolved to the last point at full draw, since
  // "slider at the end" should still highlight that last GPS entry.
  const activePoint = sliderIndex > 0
    ? sortedPoints[Math.min(sliderIndex, trailPositions.length) - 1]
    : null;

  useEffect(() => {
    onActivePointChange?.(activePoint ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePoint?.sourceTrailId, activePoint?.timestamp]);

  const handleTogglePlay = () => {
    if (sliderIndex >= trailPositions.length) setSliderIndex(0);
    setPlaying((p) => !p);
  };
  const handleReset = () => { setPlaying(false); setSliderIndex(0); };
  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaying(false);
    setSliderIndex(Number(e.target.value));
  };

  // Fit to the dense trail cluster (ignoring off-park commute legs) plus
  // every marker position, so an item the trail didn't directly cross
  // still ends up on-screen.
  const bounds = useMemo(() => {
    const clusterSource = (() => {
      if (trailPositions.length === 0) return [];
      const lats = trailPositions.map(([lat]) => lat).sort((a, b) => a - b);
      const lngs = trailPositions.map(([, lng]) => lng).sort((a, b) => a - b);
      const medLat = lats[Math.floor(lats.length / 2)];
      const medLng = lngs[Math.floor(lngs.length / 2)];
      const RADIUS = 0.05;
      const cluster = trailPositions.filter(
        ([lat, lng]) => Math.abs(lat - medLat) <= RADIUS && Math.abs(lng - medLng) <= RADIUS
      );
      return cluster.length >= 10 ? cluster : trailPositions;
    })();

    const allPoints: [number, number][] = [
      ...clusterSource,
      ...markers.map((m) => [m.latitude, m.longitude] as [number, number]),
      ...photoMarkers.map((m) => [m.latitude, m.longitude] as [number, number]),
    ];

    if (allPoints.length === 0) {
      const d = 0.01;
      return [
        [RESORT_CENTER.lat - d, RESORT_CENTER.lng - d],
        [RESORT_CENTER.lat + d, RESORT_CENTER.lng + d],
      ] as [[number, number], [number, number]];
    }

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const [lat, lng] of allPoints) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
    return [[minLat, minLng], [maxLat, maxLng]] as [[number, number], [number, number]];
  }, [trailPositions, markers, photoMarkers]);

  const activeMarker = markers.find((m) => m.id === activeMarkerId) ?? null;
  const hasPlayback = trailPositions.length > 1;

  return (
    <>
      <div className="flex-1 relative min-h-0">
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [30, 30] }}
          scrollWheelZoom
          style={{ height: "100%", width: "100%", cursor: correctingPoint ? "crosshair" : undefined }}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} className={TILE_CLASS_NAME} />

          {hasPlayback && (
            <>
              {/* Ghost — full path at low opacity, so the un-walked portion stays visible during playback */}
              <Polyline
                positions={trailPositions}
                pathOptions={{ color: TRAIL_COLOR, weight: 2, opacity: 0.25, lineCap: "round", lineJoin: "round" }}
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
                center={trailPositions[0]}
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
                  center={trailPositions[trailPositions.length - 1]}
                  radius={6}
                  pathOptions={{ color: "#F44336", fillColor: "#F44336", fillOpacity: 1, weight: 2 }}
                />
              )}
            </>
          )}

          {markers.map((m) => {
            const color = MARKER_COLORS[m.itemType] ?? "#78909C";
            const icon = DAY_ITEM_TYPE_ICONS[m.itemType] ?? "📌";
            const label = flagLabel(m.flag);
            return (
              <CircleMarker
                key={m.id}
                center={[m.latitude, m.longitude]}
                radius={m.flag.flagged ? 10 : 8}
                eventHandlers={{ click: () => onMarkerClick(m.id) }}
                pathOptions={{
                  color: m.flag.flagged ? FLAG_COLOR : "#fff",
                  weight: m.flag.flagged ? 3 : 2,
                  fillColor: color,
                  fillOpacity: 0.9,
                  dashArray: m.flag.flagged ? "4 3" : undefined,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>
                      {icon} {m.title} {m.hasPhoto && "📷"}
                    </div>
                    {m.time && (
                      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{m.time}</div>
                    )}
                    {label && (
                      <div style={{ fontSize: 11, color: FLAG_COLOR, marginTop: 2, fontWeight: 600 }}>
                        ⚠ {label}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>Click to edit</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {photoMarkers.map((m) => (
            <CircleMarker
              key={m.id}
              center={[m.latitude, m.longitude]}
              radius={7}
              pathOptions={{ color: "#fff", weight: 2, fillColor: PHOTO_COLOR, fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div style={{ minWidth: 100 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumbnailUrl} alt="" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 6, display: "block" }} />
                  {m.caption && (
                    <div style={{ fontSize: 10, color: "#666", marginTop: 4, maxWidth: 96, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.caption}
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

          {/* The point currently being relocated — pulsing-style dashed ring at its (about to change) location */}
          {correctingPoint && (
            <CircleMarker
              center={[correctingPoint.latitude, correctingPoint.longitude]}
              radius={12}
              pathOptions={{ color: CORRECTING_COLOR, fillColor: CORRECTING_COLOR, fillOpacity: 0.3, weight: 3, dashArray: "3 4" }}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={1} permanent>
                <div style={{ fontSize: 11, fontWeight: 600, color: CORRECTING_COLOR }}>
                  Click the map to relocate
                </div>
              </Tooltip>
            </CircleMarker>
          )}

          {correctingPoint && onCorrectPoint && (
            <CorrectionClickListener onPick={onCorrectPoint} />
          )}

          <MapFitBounds bounds={bounds} />
          <PanToMarker marker={activeMarker} />
          <PanToPoint point={correctingPoint ?? null} />
        </MapContainer>
      </div>

      {hasPlayback && (
        <div className="px-3 pt-2 pb-3 space-y-2 shrink-0"
             style={{ backgroundColor: "var(--color-surface-raised)", borderTop: "1px solid var(--color-border-subtle)" }}>

          <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            <span>{formatClockTime(sortedPoints[0].timestamp)}</span>
            <span className="font-semibold text-xs" style={{ color: "var(--color-text-primary)" }}>
              {activePoint ? formatClockTime(activePoint.timestamp) : "—"}
            </span>
            <span>{formatClockTime(sortedPoints[sortedPoints.length - 1].timestamp)}</span>
          </div>

          <input
            type="range"
            min={0}
            max={trailPositions.length}
            value={sliderIndex}
            onChange={handleSlider}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: TRAIL_COLOR }}
          />

          <div className="flex items-center gap-2">
            <button type="button" onClick={handleReset}
              className="w-7 h-7 rounded flex items-center justify-center text-sm cursor-pointer"
              style={{ backgroundColor: "var(--color-surface-overlay)", color: "var(--color-text-muted)" }}>
              ↺
            </button>
            <button type="button" onClick={handleTogglePlay}
              className="w-8 h-7 rounded flex items-center justify-center text-sm font-bold cursor-pointer"
              style={{ backgroundColor: TRAIL_COLOR, color: "#000" }}>
              {playing ? "⏸" : "▶"}
            </button>
            <span className="text-[10px] ml-1" style={{ color: "var(--color-text-muted)" }}>
              {sliderIndex}/{trailPositions.length} pts
            </span>
            <div className="flex gap-1 ml-auto">
              {SPEEDS.map((s) => (
                <button key={s} type="button" onClick={() => setSpeed(s)}
                  className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer"
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
      )}
    </>
  );
}
