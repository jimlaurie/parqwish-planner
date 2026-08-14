"use client";

// ==================== TRIP MAP VIEW ====================
// Static Leaflet map for a single trip day: GPS trail + every item that
// day (not just completed ones) plotted at its real-world location, with
// a visual flag on any item whose logged time doesn't line up with where
// the trail actually was. Loaded dynamically by the Trip Map page (no SSR
// — Leaflet touches window). Distinct from TrailMiniMap (Publish page's
// animated playback card, completed-items-only) — this view is about
// reviewing/correcting the day's record, not replaying it.

import { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { TripTrail } from "@/lib/db";
import type { DayItemType } from "@shared/types/day-item";
import { DAY_ITEM_TYPE_ICONS } from "@shared/types/day-item";
import { TILE_URL, TILE_ATTRIBUTION, TILE_CLASS_NAME, RESORT_CENTER } from "@/lib/map-data";
import type { FlagResult } from "@/lib/trip-map-flags";

const TRAIL_COLOR = "#FFA500";
const FLAG_COLOR = "#F44336";

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

// ==================== SUB-COMPONENTS ====================

// Leaflet reads its container's size synchronously on mount and caches it.
// In a flex layout that's still settling (dynamic import swap, sidebar
// reflow) that read can land before the container reaches its final size —
// invalidateSize() alone enlarges the tile canvas but leaves the view
// fitted to the stale, smaller box. Re-measure AND re-fit on every real
// resize (not just once), which also naturally re-fits when bounds change
// (e.g. switching day tabs).
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

// ==================== MAIN COMPONENT ====================

export default function TripMapView({
  trail,
  markers,
  activeMarkerId,
  onMarkerClick,
}: {
  trail: TripTrail | null;
  markers: TripMapMarker[];
  activeMarkerId?: string | null;
  onMarkerClick: (id: string) => void;
}) {
  const sortedPoints = useMemo(
    () => (trail ? [...trail.points].sort((a, b) => a.timestamp - b.timestamp) : []),
    [trail]
  );

  const trailPositions = useMemo(
    () => sortedPoints.map((p) => [p.latitude, p.longitude] as [number, number]),
    [sortedPoints]
  );

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
  }, [trailPositions, markers]);

  const activeMarker = markers.find((m) => m.id === activeMarkerId) ?? null;

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [30, 30] }}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} className={TILE_CLASS_NAME} />

      {trailPositions.length > 1 && (
        <Polyline
          positions={trailPositions}
          pathOptions={{ color: TRAIL_COLOR, weight: 3, opacity: 0.6, lineCap: "round", lineJoin: "round" }}
        />
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

      <MapFitBounds bounds={bounds} />
      <PanToMarker marker={activeMarker} />
    </MapContainer>
  );
}
