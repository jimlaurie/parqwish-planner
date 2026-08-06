"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  GeoJSON,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAppStore } from "@/lib/store";
import type { DayItemRecord } from "@/lib/db";
import { getAttractionCoords, type AttractionCoord, type CoordMaps } from "@/lib/park-data";
import {
  LAND_COLORS,
  LAND_COORDINATES,
  RESORT_CENTER,
  RESORT_ZOOM,
  TILE_URL,
  TILE_ATTRIBUTION,
  TILE_CLASS_NAME,
} from "@/lib/map-data";

const ACCENT = "var(--color-accent-preview)";

// ==================== TYPES ====================

interface ParkMapProps {
  items: DayItemRecord[];
}

interface AttractionMarkerData {
  item: DayItemRecord;
  lat: number;
  lng: number;
  color: string;
}

interface LandMarkerData {
  land: string;
  lat: number;
  lng: number;
  color: string;
  count: number;
  items: DayItemRecord[];
  isHighlighted: boolean;
}

// ==================== CUSTOM MARKER ICONS ====================

function createAttractionIcon(color: string, completed: boolean): L.DivIcon {
  const opacity = completed ? 0.5 : 1;
  const check = completed ? "&#10003;" : "";
  return L.divIcon({
    className: "attraction-marker",
    html: `<div style="
      width: 24px; height: 24px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: var(--shadow-sm);
      opacity: ${opacity};
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: white;
    ">${check}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

// ==================== HELPER: FLY TO HIGHLIGHTED ====================

function MapFlyTo({ land }: { land: string | null }) {
  const map = useMap();
  // undefined = not yet mounted (skip flying on initial render)
  const prevLandRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const prev = prevLandRef.current;
    prevLandRef.current = land;

    // Skip first render so the initial center/zoom stays as-is
    if (prev === undefined) return;

    if (land && LAND_COORDINATES[land]) {
      const { lat, lng } = LAND_COORDINATES[land];
      if (!isFinite(lat) || !isFinite(lng)) return;
      map.flyTo([lat, lng], 17, { duration: 0.6 });
    } else if (prev !== null && land === null) {
      // Land was deselected — fly back to full resort view
      map.flyTo([RESORT_CENTER.lat, RESORT_CENTER.lng], RESORT_ZOOM, { duration: 0.6 });
    }
  }, [land, map]);

  return null;
}

// ==================== OFF-SCREEN INDICATOR ====================

function OffScreenIndicator({
  targetCoord,
  mapRef,
}: {
  targetCoord: { lat: number; lng: number } | null;
  mapRef: React.RefObject<L.Map | null>;
}) {
  const [arrow, setArrow] = useState<{
    visible: boolean; x: number; y: number; angle: number;
  }>({ visible: false, x: 0, y: 0, angle: 0 });

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !targetCoord) {
      setArrow((prev) => prev.visible ? { ...prev, visible: false } : prev);
      return;
    }

    const update = () => {
      if (!isFinite(targetCoord.lat) || !isFinite(targetCoord.lng)) return;
      const bounds = map.getBounds();
      const latlng = L.latLng(targetCoord.lat, targetCoord.lng);

      if (bounds.contains(latlng)) {
        setArrow((prev) => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const container = map.getContainer();
      const { width, height } = container.getBoundingClientRect();
      const point = map.latLngToContainerPoint(latlng);
      const margin = 28;

      // Clamp point to map edges
      const x = Math.max(margin, Math.min(width - margin, point.x));
      const y = Math.max(margin, Math.min(height - margin, point.y));
      const cx = width / 2;
      const cy = height / 2;
      const angle = Math.atan2(point.y - cy, point.x - cx) * (180 / Math.PI);

      setArrow({ visible: true, x, y, angle });
    };

    update();
    map.on("move", update);
    map.on("zoom", update);
    return () => {
      map.off("move", update);
      map.off("zoom", update);
    };
  }, [targetCoord, mapRef]);

  if (!arrow.visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: arrow.x,
        top: arrow.y,
        transform: `translate(-50%, -50%) rotate(${arrow.angle}deg)`,
        pointerEvents: "none",
        zIndex: 1000,
        transition: "left 0.15s ease-out, top 0.15s ease-out",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24">
        <path
          d="M4 12 L20 12 L14 6 M20 12 L14 18"
          stroke={ACCENT}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
      </svg>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function ParkMap({ items }: ParkMapProps) {
  const { highlightedLand, setHighlightedLand, hoveredTimelineItemId } = useAppStore();
  const mapRef = useRef<L.Map | null>(null);
  const [coordMaps, setCoordMaps] = useState<CoordMaps>({ byId: {}, byName: {} });
  const [landGeoJSON, setLandGeoJSON] = useState<GeoJsonObject | null>(null);

  // Load land overlay polygons (same file used by the SVG map builder)
  useEffect(() => {
    fetch("/data/land-overlays.geojson")
      .then((r) => r.json())
      .then(setLandGeoJSON)
      .catch(() => {/* non-critical — map works without overlays */});
  }, []);

  // Load attraction coordinates on mount
  useEffect(() => {
    getAttractionCoords().then(setCoordMaps);
  }, []);

  // Resolve single highlighted land (for flyTo)
  const singleHighlightedLand = useMemo(() => {
    if (!highlightedLand) return null;
    if (Array.isArray(highlightedLand)) return highlightedLand[0] ?? null;
    return highlightedLand;
  }, [highlightedLand]);

  // Coord lookup: parkDataId first (exact), then name match, then fuzzy
  const findCoord = useCallback(
    (item: DayItemRecord): AttractionCoord | undefined => {
      // 1. Direct ID lookup (most reliable — from wish's parkDataId)
      if (item.parkDataId && coordMaps.byId[item.parkDataId]) {
        return coordMaps.byId[item.parkDataId];
      }
      // 2. Exact name match
      const key = item.title.toLowerCase().trim();
      if (coordMaps.byName[key]) return coordMaps.byName[key];
      // 3. Fuzzy: item title is substring of a coord name
      for (const [name, coord] of Object.entries(coordMaps.byName)) {
        if (key.length >= 3 && name.includes(key)) return coord;
      }
      // 4. Fuzzy: coord name prefix matches within item title
      for (const [name, coord] of Object.entries(coordMaps.byName)) {
        const nameWords = name.split(/\s+/);
        if (nameWords.length >= 2) {
          const prefix = nameWords.slice(0, 2).join(" ");
          if (prefix.length >= 3 && key.includes(prefix)) return coord;
        }
      }
      return undefined;
    },
    [coordMaps]
  );

  // Split items into those with exact coords vs land-only
  const { attractionMarkers, landOnlyItems } = useMemo(() => {
    const attractions: AttractionMarkerData[] = [];
    const landOnly: DayItemRecord[] = [];

    for (const item of items) {
      const coord = findCoord(item);
      if (coord) {
        if (coord.stops && coord.stops.length > 0) {
          // Multi-stop ride: render a pin for each stop
          for (const stop of coord.stops) {
            if (!isFinite(stop.latitude) || !isFinite(stop.longitude)) continue;
            attractions.push({
              item: { ...item, title: `${item.title} — ${stop.name}`, land: stop.land },
              lat: stop.latitude,
              lng: stop.longitude,
              color: LAND_COLORS[stop.land] ?? ACCENT,
            });
          }
        } else {
          if (!isFinite(coord.latitude) || !isFinite(coord.longitude)) {
            if (item.land) landOnly.push(item);
            continue;
          }
          const land = item.land || coord.land;
          attractions.push({
            item,
            lat: coord.latitude,
            lng: coord.longitude,
            color: LAND_COLORS[land] ?? ACCENT,
          });
        }
      } else if (item.land) {
        landOnly.push(item);
      }
    }

    return { attractionMarkers: attractions, landOnlyItems: landOnly };
  }, [items, coordMaps, findCoord]);

  // Build land centroid markers for items without exact coords + background context
  const landMarkers: LandMarkerData[] = useMemo(() => {
    // Count land-only items per land
    const landItems: Record<string, DayItemRecord[]> = {};
    for (const item of landOnlyItems) {
      if (!item.land) continue;
      if (!landItems[item.land]) landItems[item.land] = [];
      landItems[item.land].push(item);
    }

    const result: LandMarkerData[] = [];
    for (const [land, coords] of Object.entries(LAND_COORDINATES)) {
      if (!coords || !isFinite(coords.lat) || !isFinite(coords.lng)) continue;
      const itemsInLand = landItems[land] ?? [];
      const isHighlighted = highlightedLand
        ? Array.isArray(highlightedLand)
          ? highlightedLand.includes(land)
          : highlightedLand === land
        : false;

      result.push({
        land,
        lat: coords.lat,
        lng: coords.lng,
        color: LAND_COLORS[land] ?? ACCENT,
        count: itemsInLand.length,
        items: itemsInLand,
        isHighlighted,
      });
    }

    return result;
  }, [landOnlyItems, highlightedLand]);

  const handleLandClick = useCallback(
    (land: string) => {
      if (highlightedLand === land) {
        setHighlightedLand(null);
      } else {
        setHighlightedLand(land);
      }
    },
    [highlightedLand, setHighlightedLand]
  );

  // Find coordinate for the selected/hovered attraction (used for off-screen indicator)
  const selectedCoord = useMemo(() => {
    if (!hoveredTimelineItemId) return null;
    const match = attractionMarkers.find((am) => am.item.id === hoveredTimelineItemId);
    if (match) return { lat: match.lat, lng: match.lng };
    return null;
  }, [hoveredTimelineItemId, attractionMarkers]);

  // Debug: log matching stats
  useEffect(() => {
    if (items.length > 0) {
      const idCount = Object.keys(coordMaps.byId).length;
      const nameCount = Object.keys(coordMaps.byName).length;
      console.log(`[ParkMap] ${items.length} items, ${idCount} id-coords, ${nameCount} name-coords, ${attractionMarkers.length} matched, ${landOnlyItems.length} land-only`);
      for (const item of items) {
        const found = findCoord(item);
        const method = item.parkDataId && coordMaps.byId[item.parkDataId] ? "ID" : found ? "name" : "none";
        console.log(`[ParkMap]   "${item.title}" [${method}${item.parkDataId ? ` pid:${item.parkDataId}` : ""}] → ${found ? `${found.latitude.toFixed(6)}, ${found.longitude.toFixed(6)}` : `NO MATCH (land: "${item.land ?? "none"}")`}`);
      }
    }
  }, [items, coordMaps, attractionMarkers, landOnlyItems, findCoord]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: "300px" }}>
      {/* CSS filter to style Voyager tiles — light enough to read details */}
      <style>{`
        .${TILE_CLASS_NAME} {
          filter: brightness(1.0) contrast(1.05) saturate(0.7) hue-rotate(10deg);
        }
        [data-theme="dark"] .${TILE_CLASS_NAME} {
          filter: brightness(0.92) contrast(1.08) saturate(0.6) hue-rotate(10deg);
        }
        .leaflet-popup-content-wrapper {
          background: var(--color-bg-card) !important;
          color: var(--color-text-primary) !important;
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md) !important;
          box-shadow: var(--shadow-md) !important;
        }
        .leaflet-popup-tip {
          background: var(--color-bg-card) !important;
        }
        .attraction-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      <MapContainer
        center={[RESORT_CENTER.lat, RESORT_CENTER.lng]}
        zoom={RESORT_ZOOM}
        style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}
        zoomControl={false}
        attributionControl={false}
        ref={mapRef}
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          className={TILE_CLASS_NAME}
        />

        {/* Land colour overlays — same polygons + colours as the SVG map */}
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

        {/* Fly to highlighted land (user controls zoom for individual items) */}
        <MapFlyTo land={singleHighlightedLand} />

        {/* Land centroid markers (subtle background) */}
        {landMarkers.map((marker) => (
          <LandCircleMarker
            key={marker.land}
            marker={marker}
            onMarkerClick={handleLandClick}
          />
        ))}

        {/* Individual attraction markers */}
        {attractionMarkers.map((am) => (
          <AttractionPin
            key={am.item.id}
            data={am}
            isHovered={hoveredTimelineItemId === am.item.id}
          />
        ))}
      </MapContainer>

      {/* Custom zoom controls */}
      <div
        className="absolute top-2 right-2 z-[1000] flex flex-col"
        style={{ gap: "2px" }}
      >
        {[
          {
            label: "+",
            title: "Zoom in",
            onClick: () => mapRef.current?.zoomIn(),
          },
          {
            label: "−",
            title: "Zoom out",
            onClick: () => mapRef.current?.zoomOut(),
          },
          {
            label: "⌂",
            title: "Reset to full park view",
            onClick: () => {
              mapRef.current?.flyTo(
                [RESORT_CENTER.lat, RESORT_CENTER.lng],
                RESORT_ZOOM,
                { duration: 0.6 }
              );
              setHighlightedLand(null);
            },
          },
        ].map(({ label, title, onClick }) => (
          <button
            key={label}
            title={title}
            onClick={onClick}
            style={{
              width: "28px",
              height: "28px",
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "6px",
              color: "var(--color-text-primary)",
              fontSize: label === "⌂" ? "14px" : "18px",
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-sm)",
              opacity: 0.9,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Off-screen indicator arrow for selected items */}
      <OffScreenIndicator targetCoord={selectedCoord} mapRef={mapRef} />

      {/* Legend overlay */}
      <div
        className="absolute bottom-2 left-2 rounded-lg px-2 py-1.5 text-[10px] z-[1000]"
        style={{
          backgroundColor: "var(--color-bg-card)",
          color: "var(--color-text-dim)",
          backdropFilter: "blur(6px)",
          opacity: 0.9,
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <div
            className="w-3 h-3 rounded-full border border-white"
            style={{ backgroundColor: ACCENT }}
          />
          <span>= attraction pin</span>
        </div>
        <div className="flex items-center gap-1.5 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: ACCENT }}
          />
          <span>= land area</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full opacity-40"
            style={{ backgroundColor: "var(--color-text-muted)" }}
          />
          <span>= no items</span>
        </div>
      </div>
    </div>
  );
}

// ==================== ATTRACTION PIN MARKER ====================

function AttractionPin({ data, isHovered }: { data: AttractionMarkerData; isHovered?: boolean }) {
  const markerRef = useRef<L.Marker | null>(null);
  const icon = useMemo(
    () => createAttractionIcon(data.color, data.item.completed),
    [data.color, data.item.completed]
  );

  // Open/close popup programmatically when hovered via timeline
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (isHovered) {
      marker.openPopup();
    } else {
      marker.closePopup();
    }
  }, [isHovered]);

  return (
    <Marker ref={markerRef} position={[data.lat, data.lng]} icon={icon}>
      <Popup autoPan={false}>
        <div style={{ minWidth: "140px" }}>
          <strong style={{ color: data.color }}>{data.item.title}</strong>
          <div style={{ fontSize: "12px", marginTop: "4px", color: "var(--color-text-secondary)" }}>
            {data.item.scheduledTime && (
              <span>{data.item.scheduledTime}</span>
            )}
            {data.item.land && (
              <span style={{ marginLeft: data.item.scheduledTime ? "8px" : 0 }}>
                {data.item.land}
              </span>
            )}
          </div>
          {data.item.completed && (
            <div style={{ fontSize: "11px", color: "var(--color-success)", marginTop: "2px" }}>
              Completed
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// ==================== LAND CIRCLE MARKER ====================

function LandCircleMarker({
  marker,
  onMarkerClick,
}: {
  marker: LandMarkerData;
  onMarkerClick: (land: string) => void;
}) {
  const hasItems = marker.count > 0;
  const baseRadius = hasItems ? 8 + Math.min(marker.count * 2, 6) : 5;
  const radius = marker.isHighlighted ? baseRadius + 3 : baseRadius;
  const fillOpacity = marker.isHighlighted
    ? 0.7
    : hasItems
      ? 0.35
      : 0.12;
  const weight = marker.isHighlighted ? 2 : 1;

  return (
    <CircleMarker
      center={[marker.lat, marker.lng]}
      radius={radius}
      pathOptions={{
        color: marker.isHighlighted ? ACCENT : marker.color,
        fillColor: marker.color,
        fillOpacity,
        weight,
      }}
      eventHandlers={{
        click: () => onMarkerClick(marker.land),
      }}
    >
      <Popup autoPan={false}>
        <div style={{ minWidth: "140px" }}>
          <strong style={{ color: marker.color }}>{marker.land}</strong>
          {marker.items.length > 0 ? (
            <ul style={{ margin: "4px 0 0", padding: "0 0 0 16px", fontSize: "12px" }}>
              {marker.items.map((item) => (
                <li key={item.id}>
                  {item.scheduledTime} — {item.title}
                  {item.completed && " \u2713"}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-muted)" }}>
              {marker.land}
            </p>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}
