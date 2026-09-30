// ==================== PLACE LOCATION ====================
// Resolves a map point (a custom Place pinned on the Preview "Add to Day"
// map) to the park + land names the rest of the app uses. Pure — the caller
// supplies the land-overlays.geojson features.
//
// Polygon names in land-overlays.geojson don't all match the app's land
// names (landConfig.json), so they're mapped here. Points outside every
// polygon fall back to the nearest land centroid within FALLBACK_RADIUS_M.

import { LAND_COORDINATES } from "./map-data";

export interface ParkLand {
  park: string;
  land: string;
}

interface OverlayFeature {
  properties?: { name?: string } | null;
  geometry?: { type: string; coordinates: number[][][] } | null;
}

const FALLBACK_RADIUS_M = 250;

// Overlay polygon name → app park label + land name.
const OVERLAY_TO_PARK_LAND: Record<string, ParkLand> = {
  "Main Street, U.S.A.": { park: "Disneyland", land: "Main Street U.S.A." },
  "Paradise Gardens": { park: "California Adventure", land: "Paradise Gardens Park" },
  "Grand Californian Hotel": { park: "Hotels", land: "Disney's Grand Californian Hotel" },
  "Disneyland Hotel": { park: "Hotels", land: "Disneyland Hotel" },
  "Pixar Place Hotel": { park: "Hotels", land: "Pixar Place Hotel" },
  Esplanade: { park: "Disneyland Resort", land: "Esplanade" },
  "Mickey & Friends Parking": { park: "Disneyland Resort", land: "Parking" },
  "Pixar Pals Parking": { park: "Disneyland Resort", land: "Parking" },
  "Toy Story Parking": { park: "Disneyland Resort", land: "Parking" },
};

const DISNEYLAND_LANDS = new Set([
  "Hub", "Tomorrowland", "Fantasyland", "Frontierland", "Adventureland", "New Orleans Square",
  "Bayou Country", "Mickey's Toontown", "Star Wars: Galaxy's Edge",
]);
const DCA_LANDS = new Set([
  "Buena Vista Street", "Hollywood Land", "Avengers Campus", "San Fransokyo Square",
  "Cars Land", "Pixar Pier", "Grizzly Peak", "Performance Corridor",
]);

// Downtown Disney is one polygon but two app lands; split at roughly the
// district's midpoint (west end borders the Disneyland Hotel).
const DOWNTOWN_WEST_OF_LNG = -117.9225;

function overlayToParkLand(name: string, lng: number): ParkLand | null {
  if (OVERLAY_TO_PARK_LAND[name]) return OVERLAY_TO_PARK_LAND[name];
  if (name === "Downtown Disney") {
    return { park: "Downtown Disney", land: lng < DOWNTOWN_WEST_OF_LNG ? "West Downtown Disney" : "East Downtown Disney" };
  }
  if (DISNEYLAND_LANDS.has(name)) return { park: "Disneyland", land: name };
  if (DCA_LANDS.has(name)) return { park: "California Adventure", land: name };
  return null;
}

/** Ray-casting point-in-polygon on a GeoJSON [lng, lat] ring. */
function inRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestLand(lat: number, lng: number): ParkLand | null {
  let best: { land: string; dist: number } | null = null;
  for (const [land, c] of Object.entries(LAND_COORDINATES)) {
    const dist = metersBetween(lat, lng, c.lat, c.lng);
    if (!best || dist < best.dist) best = { land, dist };
  }
  if (!best || best.dist > FALLBACK_RADIUS_M) return null;
  if (DISNEYLAND_LANDS.has(best.land) || best.land === "Main Street U.S.A.") return { park: "Disneyland", land: best.land };
  if (DCA_LANDS.has(best.land) || best.land === "Paradise Gardens Park") return { park: "California Adventure", land: best.land };
  if (best.land.includes("Hotel")) return { park: "Hotels", land: best.land };
  return { park: "Downtown Disney", land: lng < DOWNTOWN_WEST_OF_LNG ? "West Downtown Disney" : "East Downtown Disney" };
}

/** Park + land for a point, or null when it's outside the resort. */
export function resolveParkLand(lat: number, lng: number, features: OverlayFeature[]): ParkLand | null {
  for (const f of features) {
    const name = f.properties?.name;
    const geom = f.geometry;
    if (!name || geom?.type !== "Polygon" || !geom.coordinates?.[0]) continue;
    if (inRing(lng, lat, geom.coordinates[0])) {
      const resolved = overlayToParkLand(name, lng);
      if (resolved) return resolved;
    }
  }
  return nearestLand(lat, lng);
}
