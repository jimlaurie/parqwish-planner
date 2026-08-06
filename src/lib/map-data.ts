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

// CartoDB Voyager tiles — detailed roads & buildings, darkened via CSS filter
export const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

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
