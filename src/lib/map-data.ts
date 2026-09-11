/**
 * Land centroid coordinates & colors for the Leaflet park map.
 * Coordinates are approximate centers of each themed land.
 * Can be refined over time to per-attraction coordinates.
 */

// ==================== LAND COLORS ====================
// Consistent with mobile ParkMap.js and TimelineCard.tsx

export const LAND_COLORS: Record<string, string> = {
  // Disneyland
  "Main Street U.S.A.": "#C4785B",
  Tomorrowland: "#5B8FCC",
  Fantasyland: "#B87BC4",
  Frontierland: "#C49E5B",
  Adventureland: "#5BAF6B",
  "New Orleans Square": "#7B6BAF",
  "Bayou Country": "#8B6F47",
  "Mickey's Toontown": "#E87B8A",
  "Star Wars: Galaxy's Edge": "#4A6B7B",
  Hub: "#FFD700",

  // DCA
  "Buena Vista Street": "#C4785B",
  "Hollywood Land": "#CC5B5B",
  "Avengers Campus": "#5B5BCC",
  "San Fransokyo Square": "#CC8855",
  "Cars Land": "#CC7B3B",
  "Pixar Pier": "#5BC4C4",
  "Paradise Gardens Park": "#6BAF5B",
  "Grizzly Peak": "#7B8B5B",

  // Downtown Disney & Hotels
  "Downtown Disney District": "#B89B6B",
  "Disneyland Hotel": "#6B7BAF",
  "Disney's Grand Californian Hotel": "#8B6F47",
  "Pixar Place Hotel": "#5BC4C4",
};

// ==================== LAND COORDINATES ====================
// Approximate centroid lat/lng for each themed land

export const LAND_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Disneyland Park
  "Main Street U.S.A.": { lat: 33.81125, lng: -117.91900 },
  Tomorrowland:          { lat: 33.81225, lng: -117.91680 },
  Fantasyland:           { lat: 33.81350, lng: -117.91820 },
  Frontierland:          { lat: 33.81270, lng: -117.92050 },
  Adventureland:         { lat: 33.81170, lng: -117.92010 },
  "New Orleans Square":  { lat: 33.81200, lng: -117.92120 },
  "Bayou Country":       { lat: 33.81310, lng: -117.92200 },
  "Mickey's Toontown":   { lat: 33.81470, lng: -117.91840 },
  "Star Wars: Galaxy's Edge": { lat: 33.81510, lng: -117.92220 },
  Hub:                   { lat: 33.81215, lng: -117.91880 },

  // Disney California Adventure
  "Buena Vista Street":   { lat: 33.80870, lng: -117.91900 },
  "Hollywood Land":       { lat: 33.80820, lng: -117.91760 },
  "Avengers Campus":      { lat: 33.80740, lng: -117.91680 },
  "San Fransokyo Square": { lat: 33.80600, lng: -117.91700 },
  "Cars Land":            { lat: 33.80510, lng: -117.91840 },
  "Pixar Pier":           { lat: 33.80530, lng: -117.92020 },
  "Paradise Gardens Park": { lat: 33.80640, lng: -117.91960 },
  "Grizzly Peak":         { lat: 33.80730, lng: -117.91920 },

  // Downtown Disney & Hotels
  "Downtown Disney District":         { lat: 33.80920, lng: -117.92350 },
  "Disneyland Hotel":                 { lat: 33.80850, lng: -117.92570 },
  "Disney's Grand Californian Hotel": { lat: 33.80900, lng: -117.92180 },
  "Pixar Place Hotel":                { lat: 33.80590, lng: -117.92220 },
};

// ==================== MAP CONFIGURATION ====================

export const RESORT_CENTER = { lat: 33.8100, lng: -117.9190 };
export const RESORT_ZOOM = 16;

// Esri's free "World Light Gray" basemap — no API key required, roads and
// place labels only, no baked-in POI icons (shops/restaurants/ATMs/etc.).
// Deliberately built as a muted backdrop for apps that draw their own
// markers on top, which is exactly what every consumer of this constant
// does (ParkMap's attraction pins, TripMapView/TrailMiniMap's GPS trails).
//
// Second stop for this constant: originally CartoDB's "Voyager" raster
// tiles (basemaps.cartocdn.com), which silently started requiring an
// account/key — requests still returned 200, but the image itself was a
// placeholder reading "API KEY REQUIRED", which Leaflet just rendered as
// if it were real map imagery. Swapped to OpenStreetMap's standard tile
// server to fix that, but standard OSM tiles are busy with built-in POI
// icons (baked into the raster image itself, not a toggleable layer) that
// visually competed with this app's own pins — Esri's Light Gray style
// avoids both problems at once. Note the {z}/{y}/{x} order (Esri's
// MapServer tile scheme, not the {z}/{x}/{y} XYZ order OSM/Carto used)
// and no {s} subdomain (Esri serves from a single host, no sharding).
export const TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS';

// This basemap's detailed source imagery doesn't cover every region equally —
// confirmed by direct tile fetch that for the Anaheim resort area specifically,
// zoom 16 returns real map content but zoom 17+ returns another placeholder
// tile ("Map data not yet available"), even though the service's own tile
// grid technically goes up to zoom 23. Every consumer of TILE_URL must pass
// this as the TileLayer's maxNativeZoom prop, so Leaflet stops requesting
// tiles past this level and instead upscales the zoom-16 tile — blurrier at
// close zoom, but real geography instead of another broken watermark. (Any
// future tile-source swap should re-check this per-region limit rather than
// assuming a service's documented max zoom holds everywhere.)
export const TILE_MAX_NATIVE_ZOOM = 16;

// CSS class name applied to the tile layer for dark-theme filtering
export const TILE_CLASS_NAME = "dark-map-tiles";

// ==================== PARK GROUPINGS ====================

export const PARK_LANDS: Record<string, string[]> = {
  disneyland: [
    "Main Street U.S.A.",
    "Hub",
    "Adventureland",
    "New Orleans Square",
    "Bayou Country",
    "Frontierland",
    "Star Wars: Galaxy's Edge",
    "Fantasyland",
    "Mickey's Toontown",
    "Tomorrowland",
  ],
  californiaadventure: [
    "Buena Vista Street",
    "Hollywood Land",
    "Avengers Campus",
    "San Fransokyo Square",
    "Cars Land",
    "Pixar Pier",
    "Paradise Gardens Park",
    "Grizzly Peak",
  ],
  downtown: [
    "West Downtown Disney",
    "East Downtown Disney",
    "Disneyland Hotel",
    "Disney's Grand Californian Hotel",
    "Pixar Place Hotel",
    "Esplanade",
    "Parking",
  ],
};

// Resolve a park key from a land name
export function getParkForLand(land: string): string | null {
  for (const [park, lands] of Object.entries(PARK_LANDS)) {
    if (lands.includes(land)) return park;
  }
  return null;
}
