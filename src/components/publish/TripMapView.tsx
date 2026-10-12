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

import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Polyline, CircleMarker, Tooltip, useMap, useMapEvent } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import type { DayItemType } from "@shared/types/day-item";
import { DAY_ITEM_TYPE_ICONS } from "@shared/types/day-item";
import { TILE_URL, TILE_ATTRIBUTION, TILE_CLASS_NAME, TILE_MAX_NATIVE_ZOOM, RESORT_CENTER } from "@/lib/map-data";
import type { FlagResult } from "@/lib/trip-map-flags";
import { findNearestMarkerAt } from "@/lib/trip-map-proximity";
import ResortMask from "@/components/map/ResortMask";
import { TRAIL_CASING_COLOR } from "@/lib/trail-people";

const TRAIL_COLOR = "#FFA500";
const FLAG_COLOR = "#F44336";
const CORRECTING_COLOR = "#42A5F5";
const PHOTO_COLOR = "#EC407A";
const TICK_MS = 50;
const BASE_DURATION_MS = 30_000;
const SPEEDS = [1, 2, 5, 10] as const;
type Speed = (typeof SPEEDS)[number];
// Fixed step per arrow-key press, not a fraction of trail duration — gives a
// predictable nudge size regardless of trail length (a 2-hour evening visit
// and a 14-hour full day shouldn't jump by wildly different absolute amounts
// per key press).
const ARROW_KEY_STEP_MS = 5 * 60_000;

// ==================== TRAIL POINT / MERGED TRAIL TYPES ====================
// A day can have more than one recorded TripTrail row (one per user). The
// page flattens the shown ones into a single time-sorted point list, which
// drives the shared timeline (scrubber, playback, GPS list); each point
// carries sourceTrailId so the map can draw every person's trail as its own
// line, a correction can be written back to the right record's key, and a
// point stays identifiable across re-sorts/filters (see trip-map-prefs.ts's
// pointCorrectionKey).

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

/** One person's line on the map: which trail it is, and how to draw it. */
export interface TrailLine {
  id: string; // the TripTrail id its points carry as sourceTrailId
  label: string;
  color: string;
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
  scheduledMs?: number; // absolute ms for `time` on its date; undefined if unscheduled
  photoThumbnailUrls?: string[];
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
  lines,
  markers,
  photoMarkers = [],
  activeMarkerId,
  onMarkerClick,
  onActivePointChange,
  onNearbyMarkerChange,
  correctingPoint,
  onCorrectPoint,
}: {
  trail: MergedTrail | null;
  /** One entry per person shown; more than one draws dark edges under the (pale) person colours. */
  lines: TrailLine[];
  markers: TripMapMarker[];
  photoMarkers?: TripPhotoMarker[];
  activeMarkerId?: string | null;
  onMarkerClick: (id: string) => void;
  onActivePointChange?: (point: MergedTrailPoint | null) => void;
  onNearbyMarkerChange?: (marker: TripMapMarker | null) => void;
  correctingPoint?: MergedTrailPoint | null;
  onCorrectPoint?: (lat: number, lng: number) => void;
}) {
  const [landGeoJSON, setLandGeoJSON] = useState<GeoJsonObject | null>(null);

  // Land overlay polygons — same file ParkMap uses (see ParkMap.tsx)
  useEffect(() => {
    fetch("/data/land-overlays.geojson")
      .then((r) => r.json())
      .then(setLandGeoJSON)
      .catch(() => {/* non-critical — map works without overlays */});
  }, []);

  const sortedPoints = useMemo(
    () => (trail ? [...trail.points].sort((a, b) => a.timestamp - b.timestamp) : []),
    [trail]
  );

  const trailPositions = useMemo(
    () => sortedPoints.map((p) => [p.latitude, p.longitude] as [number, number]),
    [sortedPoints]
  );

  // ---- Playback state ----
  // Time-based (elapsed ms since the trail's first point), not point-index —
  // GPS points aren't evenly spaced in time (denser during fast movement,
  // sparser when stationary), so an index-based slider doesn't correspond to
  // a linear division of the day: a dense burst of points would eat up a
  // disproportionate share of the slider's length relative to a long, sparse
  // stationary stretch. Position is resolved by snapping to the last real
  // recorded point at-or-before the current elapsed time, not by
  // interpolating a synthetic point between two real ones — interpolating
  // would draw motion during a genuine GPS gap that was never recorded, and
  // onActivePointChange/point-correction both key off a real point's
  // (sourceTrailId, timestamp) identity, which an interpolated point has none of.
  const totalDurationMs = sortedPoints.length > 1
    ? sortedPoints[sortedPoints.length - 1].timestamp - sortedPoints[0].timestamp
    : 0;
  const [elapsedMs, setElapsedMs] = useState(totalDurationMs);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(2);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Jump to fully-drawn and stop playback when the day or time-range filter
  // actually changes — but NOT when a GPS point is merely corrected (same
  // day, same range, just one point's lat/lng moved). Keyed on trail id
  // (changes on day switch) and point count (changes when the range filter
  // widens/narrows what's included) rather than the sortedPoints array
  // reference itself, which gets a new identity on every correction too
  // (correction only ever touches lat/lng, never timestamp, so the range
  // filter's inclusion of a point — and therefore this count — is unaffected
  // by a correction alone).
  useEffect(() => {
    setElapsedMs(totalDurationMs);
    setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail?.id, sortedPoints.length]);

  const msPerTick = useMemo(
    () => (totalDurationMs * speed * TICK_MS) / BASE_DURATION_MS,
    [totalDurationMs, speed]
  );

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + msPerTick;
        if (next >= totalDurationMs) {
          setPlaying(false);
          return totalDurationMs;
        }
        return next;
      });
    }, TICK_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, msPerTick, totalDurationMs]);

  // Index of the last recorded point at-or-before the current elapsed time
  // (binary search — sortedPoints is already sorted by timestamp).
  const activeIndex = useMemo(() => {
    if (sortedPoints.length === 0) return -1;
    const targetMs = sortedPoints[0].timestamp + elapsedMs;
    let lo = 0, hi = sortedPoints.length - 1, result = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (sortedPoints[mid].timestamp <= targetMs) {
        result = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return result;
  }, [sortedPoints, elapsedMs]);

  const complete = activeIndex + 1 >= trailPositions.length;

  // The point the scrubber is "on" for list-highlighting purposes — this
  // stays resolved to the last point at full draw (the moving dots hide
  // then), since "slider at the end" should still highlight that last GPS
  // entry.
  const activePoint = activeIndex >= 0 ? sortedPoints[activeIndex] : null;

  useEffect(() => {
    onActivePointChange?.(activePoint ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePoint?.sourceTrailId, activePoint?.timestamp]);

  // What's nearby right now, for the sidebar panel — uses activePoint (the
  // moving dots hide once playback completes) since proximity
  // detection should keep working whether the user is playing, paused, or
  // has manually scrubbed to a static spot; scrubbing to inspect a moment is
  // already a documented use of this view (see file header).
  const currentAbsoluteMs = sortedPoints.length > 0 ? sortedPoints[0].timestamp + elapsedMs : null;

  // Each person's own line, cut at the shared clock: drawn up to now, a dot
  // where they are while they're recording, an end mark once they've stopped.
  const drawnLines = useMemo(() => lines.map((line) => {
    const pts = sortedPoints.filter((p) => p.sourceTrailId === line.id);
    const positions = pts.map((p) => [p.latitude, p.longitude] as [number, number]);
    const t = currentAbsoluteMs ?? Infinity;
    const doneCount = complete ? pts.length : pts.filter((p) => p.timestamp <= t).length;
    const last = pts[pts.length - 1];
    const finished = complete || (!!last && last.timestamp <= t);
    return {
      ...line,
      positions,
      drawn: positions.slice(0, doneCount),
      dot: !finished && doneCount > 0 ? positions[doneCount - 1] : null,
      end: finished && positions.length > 0 ? positions[positions.length - 1] : null,
    };
  }), [lines, sortedPoints, currentAbsoluteMs, complete]);
  const casing = lines.length > 1;
  const nearbyMarker = useMemo(
    () => findNearestMarkerAt(activePoint, currentAbsoluteMs, markers),
    [activePoint, currentAbsoluteMs, markers]
  );

  useEffect(() => {
    onNearbyMarkerChange?.(nearbyMarker);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyMarker?.id]);

  const handleTogglePlay = () => {
    if (complete) setElapsedMs(0);
    setPlaying((p) => !p);
  };
  const handleReset = () => { setPlaying(false); setElapsedMs(0); };
  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaying(false);
    setElapsedMs(Number(e.target.value));
  };

  // Left/right arrow keys step the scrubber by a fixed amount of elapsed
  // time, matching the pattern in PhotoViewer.tsx. Ignored while an input or
  // textarea has focus — both as standard defensive practice, and because
  // the scrubber <input type="range"> below is itself one such element and
  // would otherwise double-step from both its own native arrow-key handling
  // and this global listener.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (trailPositions.length < 2) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const target = document.activeElement;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      e.preventDefault();
      setPlaying(false);
      const delta = e.key === "ArrowRight" ? ARROW_KEY_STEP_MS : -ARROW_KEY_STEP_MS;
      setElapsedMs((prev) => Math.min(totalDurationMs, Math.max(0, prev + delta)));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trailPositions.length, totalDurationMs]);

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
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} className={TILE_CLASS_NAME} maxNativeZoom={TILE_MAX_NATIVE_ZOOM} />

          <ResortMask />

          {landGeoJSON && (
            <GeoJSON
              key={JSON.stringify(landGeoJSON)}
              data={landGeoJSON}
              interactive={false}
              style={(feature) => ({
                fillColor: feature?.properties?.color ?? "#888888",
                fillOpacity: feature?.properties?.opacity ?? 0.28,
                color: feature?.properties?.color ?? "#888888",
                weight: 1.5,
                opacity: 0.6,
              })}
            />
          )}

          {hasPlayback && drawnLines.map((line) => line.positions.length > 0 && (
            <Fragment key={line.id}>
              {/* Ghost — the person's full path at low opacity, so the un-walked part stays visible during playback */}
              <Polyline
                positions={line.positions}
                pathOptions={{ color: line.color, weight: 2, opacity: 0.3, lineCap: "round", lineJoin: "round" }}
              />
              {/* Drawn portion, with a dark edge when several people share the map */}
              {line.drawn.length > 1 && casing && (
                <Polyline
                  positions={line.drawn}
                  pathOptions={{ color: TRAIL_CASING_COLOR, weight: 5.5, opacity: 0.45, lineCap: "round", lineJoin: "round" }}
                />
              )}
              {line.drawn.length > 1 && (
                <Polyline
                  positions={line.drawn}
                  pathOptions={{ color: line.color, weight: 3, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
                />
              )}
              {/* Start marker */}
              <CircleMarker
                center={line.positions[0]}
                radius={casing ? 5 : 6}
                pathOptions={{ color: casing ? line.color : "#4CAF50", fillColor: "#4CAF50", fillOpacity: 1, weight: 2 }}
              >
                {casing && <Tooltip direction="top" offset={[0, -6]}>{line.label} starts</Tooltip>}
              </CircleMarker>
              {/* Where they are right now */}
              {line.dot && (
                <CircleMarker
                  center={line.dot}
                  radius={7}
                  pathOptions={{ color: casing ? TRAIL_CASING_COLOR : "#fff", fillColor: line.color, fillOpacity: 1, weight: 2 }}
                >
                  {casing && <Tooltip direction="top" offset={[0, -8]}>{line.label}</Tooltip>}
                </CircleMarker>
              )}
              {/* End marker once they've stopped recording */}
              {line.end && (
                <CircleMarker
                  center={line.end}
                  radius={casing ? 5 : 6}
                  pathOptions={{ color: casing ? line.color : "#F44336", fillColor: "#F44336", fillOpacity: 1, weight: 2 }}
                >
                  {casing && <Tooltip direction="top" offset={[0, -6]}>{line.label} ends</Tooltip>}
                </CircleMarker>
              )}
            </Fragment>
          ))}

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
              {formatClockTime(sortedPoints[0].timestamp + elapsedMs)}
            </span>
            <span>{formatClockTime(sortedPoints[sortedPoints.length - 1].timestamp)}</span>
          </div>

          <input
            type="range"
            min={0}
            max={totalDurationMs}
            value={elapsedMs}
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
              {Math.round(elapsedMs / 60_000)}/{Math.round(totalDurationMs / 60_000)} min
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
