"use client";

// ==================== PLACE PICKER MAP ====================
// Tap-to-pin map for creating a custom Place from the Preview "Add to Day"
// modal. Leaflet — import this only via next/dynamic with ssr: false.
// Reports the pinned point plus its resolved park/land (place-location.ts);
// the land overlays are also what that resolution uses, so they're loaded
// once here and handed back to the caller through onPick.

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, useMapEvents } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import { TILE_URL, TILE_ATTRIBUTION, TILE_CLASS_NAME, TILE_MAX_NATIVE_ZOOM, RESORT_CENTER, RESORT_ZOOM } from "@/lib/map-data";
import { resolveParkLand, type ParkLand } from "@/lib/place-location";
import ResortMask from "@/components/map/ResortMask";

export interface PickedPoint {
  lat: number;
  lng: number;
  /** null when the pin is outside every park, hotel, and Downtown area. */
  parkLand: ParkLand | null;
}

interface PlacePickerMapProps {
  value: PickedPoint | null;
  onPick: (point: PickedPoint) => void;
}

type OverlayCollection = GeoJsonObject & { features?: Parameters<typeof resolveParkLand>[2] };

function ClickToPin({ features, onPick }: { features: OverlayCollection["features"]; onPick: (p: PickedPoint) => void }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onPick({ lat, lng, parkLand: resolveParkLand(lat, lng, features ?? []) });
    },
  });
  return null;
}

export default function PlacePickerMap({ value, onPick }: PlacePickerMapProps) {
  const [overlays, setOverlays] = useState<OverlayCollection | null>(null);

  useEffect(() => {
    fetch("/data/land-overlays.geojson")
      .then((r) => r.json())
      .then(setOverlays)
      .catch((err) => console.error("[PlacePickerMap] overlay load failed:", err));
  }, []);

  return (
    <>
    {/* The tile provider's attribution must stay visible, but at Leaflet's
        default size it covers a fifth of this small map. */}
    <style>{`
      .place-picker-map .leaflet-control-attribution { font-size: 8px; line-height: 1.3; padding: 0 4px; }
    `}</style>
    <MapContainer
      className="place-picker-map"
      center={value ? [value.lat, value.lng] : [RESORT_CENTER.lat, RESORT_CENTER.lng]}
      zoom={value ? RESORT_ZOOM + 1 : RESORT_ZOOM}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", cursor: "crosshair" }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} className={TILE_CLASS_NAME} maxNativeZoom={TILE_MAX_NATIVE_ZOOM} />
      <ResortMask />
      {overlays && (
        <GeoJSON
          data={overlays}
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
      <ClickToPin features={overlays?.features} onPick={onPick} />
      {value && (
        <CircleMarker
          center={[value.lat, value.lng]}
          radius={9}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#FFA500", fillOpacity: 1 }}
        />
      )}
    </MapContainer>
    </>
  );
}
