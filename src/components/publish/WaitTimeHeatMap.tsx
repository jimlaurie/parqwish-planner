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
import { waitColor } from "./waitTimeColors";

export interface WaitTimeMarker {
  id: string;
  rideName: string;
  latitude: number;
  longitude: number;
  medianWaitMinutes: number;
  sampleSize: number;
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
    <>
      {/* A drop shadow keeps light-colored dots (yellow, pale green) from
          blending into similarly-toned land overlay fills. filter on an SVG
          path works fine but doesn't resolve CSS custom properties any
          better than fill/stroke do (same gotcha as waitColor's raw hex),
          so this is a plain global style rule, not a token. Kept outside
          MapContainer rather than as a child of it — MapContainer's
          children are expected to be Leaflet-context-aware layers, and a
          plain non-Leaflet element is safer rendered as a sibling. */}
      <style>{`
        .wait-marker-dot {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 1px rgba(0, 0, 0, 0.4));
        }
      `}</style>

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
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: waitColor(m.medianWaitMinutes),
              fillOpacity: 0.9,
              className: "wait-marker-dot",
            }}
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
    </>
  );
}
