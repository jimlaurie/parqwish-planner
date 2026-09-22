"use client";

// ==================== WAIT TIME HEAT MAP ====================
// Resort-wide Leaflet map showing every ride as a color-coded dot by
// historical median wait time (green/yellow/red), sourced from a nightly
// BigQuery-backed aggregate published by the dland-wishes Cloud Function
// generateWaitTimeStats (see src/lib/park-data.ts's getWaitTimeStats()).
// Deliberately scoped v1: a weekday/weekend toggle only — no time slider,
// no rain/event filters, no Voronoi shading, no Lightning-Lane-demand mode
// (all deferred to a later pass once this pipeline's shape is proven).
//
// Unlike TripMapView/TrailMiniMap (day-specific/trip-specific), this data
// has no trip or date dependency — it's resort-wide historical stats — so
// this component takes a flat marker list, not trail/day-item props.

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import { TILE_URL, TILE_ATTRIBUTION, TILE_CLASS_NAME, TILE_MAX_NATIVE_ZOOM, RESORT_CENTER, RESORT_ZOOM } from "@/lib/map-data";
import ResortMask from "@/components/map/ResortMask";

export interface WaitTimeMarker {
  id: string;
  rideName: string;
  latitude: number;
  longitude: number;
  medianWaitMinutes: number;
  sampleSize: number;
}

// Raw hex, not CSS vars — SVG/Leaflet fill attributes don't resolve CSS
// custom properties (same documented gotcha as ResortMask.tsx).
function waitColor(median: number): string {
  if (median <= 20) return "#4CAF50"; // green
  if (median <= 45) return "#FFC107"; // yellow
  return "#F44336";                   // red
}

export default function WaitTimeHeatMap({ markers }: { markers: WaitTimeMarker[] }) {
  const [landGeoJSON, setLandGeoJSON] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    fetch("/data/land-overlays.geojson")
      .then((r) => r.json())
      .then(setLandGeoJSON)
      .catch(() => {/* non-critical — map works without overlays */});
  }, []);

  return (
    <MapContainer
      center={[RESORT_CENTER.lat, RESORT_CENTER.lng]}
      zoom={RESORT_ZOOM}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
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

      {markers.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.latitude, m.longitude]}
          radius={8}
          pathOptions={{ color: "#fff", weight: 2, fillColor: waitColor(m.medianWaitMinutes), fillOpacity: 0.9 }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={1}>
            <div style={{ minWidth: 140 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{m.rideName}</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                {m.medianWaitMinutes} min median
              </div>
              <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                {m.sampleSize.toLocaleString()} readings
              </div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
