// ==================== RESORT LAND DEFINITIONS ====================
// GPS polygon boundaries for every named land/area in the Disneyland Resort.
// Used to render semi-transparent tinted overlays on the resort SVG map.
//
// Coordinates are [lat, lng] pairs — polygons are closed automatically.
// Approximate boundaries suitable for visual overlays; not exact park-property lines.
// Adjust individual polygon coords as needed to refine coverage.

export type ParkKey =
  | "disneyland"
  | "dca"
  | "downtown_disney"
  | "hotels"
  | "esplanade"
  | "parking";

export interface ResortLand {
  id: string;
  name: string;
  park: ParkKey;
  /** Hex fill color for the tint */
  color: string;
  /** Overlay opacity (0–1) — typically 0.25–0.35 */
  opacity: number;
  /** GPS polygon as [lat, lng] pairs — auto-closed */
  polygon: Array<[number, number]>;
}

// ==================== DISNEYLAND PARK ====================

const DL_LANDS: ResortLand[] = [
  {
    id: "dl-main-street",
    name: "Main Street, U.S.A.",
    park: "disneyland",
    color: "#E8D080",
    opacity: 0.32,
    polygon: [
      [33.8097, -117.9210], [33.8097, -117.9173],
      [33.8123, -117.9178], [33.8123, -117.9205],
    ],
  },
  {
    id: "dl-hub",
    name: "Hub",
    park: "disneyland",
    color: "#F0E0C0",
    opacity: 0.30,
    polygon: [
      [33.8121, -117.9207], [33.8121, -117.9175],
      [33.8136, -117.9170], [33.8140, -117.9185],
      [33.8140, -117.9200], [33.8136, -117.9210],
    ],
  },
  {
    id: "dl-adventureland",
    name: "Adventureland",
    park: "disneyland",
    color: "#7BBF6A",
    opacity: 0.32,
    polygon: [
      [33.8097, -117.9245], [33.8097, -117.9208],
      [33.8120, -117.9208], [33.8120, -117.9245],
    ],
  },
  {
    id: "dl-new-orleans",
    name: "New Orleans Square",
    park: "disneyland",
    color: "#B080C8",
    opacity: 0.32,
    polygon: [
      [33.8118, -117.9250], [33.8118, -117.9210],
      [33.8135, -117.9210], [33.8135, -117.9250],
    ],
  },
  {
    id: "dl-frontierland",
    name: "Frontierland",
    park: "disneyland",
    color: "#C8956A",
    opacity: 0.32,
    polygon: [
      [33.8133, -117.9260], [33.8133, -117.9210],
      [33.8153, -117.9210], [33.8153, -117.9260],
    ],
  },
  {
    id: "dl-bayou",
    name: "Bayou Country",
    park: "disneyland",
    color: "#6AB8A8",
    opacity: 0.32,
    polygon: [
      [33.8151, -117.9252], [33.8151, -117.9215],
      [33.8165, -117.9215], [33.8165, -117.9252],
    ],
  },
  {
    id: "dl-galaxys-edge",
    name: "Star Wars: Galaxy's Edge",
    park: "disneyland",
    color: "#7080B8",
    opacity: 0.35,
    polygon: [
      [33.8143, -117.9268], [33.8143, -117.9228],
      [33.8170, -117.9228], [33.8170, -117.9268],
    ],
  },
  {
    id: "dl-fantasyland",
    name: "Fantasyland",
    park: "disneyland",
    color: "#E890B8",
    opacity: 0.30,
    polygon: [
      [33.8134, -117.9222], [33.8134, -117.9165],
      [33.8162, -117.9165], [33.8162, -117.9222],
    ],
  },
  {
    id: "dl-tomorrowland",
    name: "Tomorrowland",
    park: "disneyland",
    color: "#70A8D0",
    opacity: 0.32,
    polygon: [
      [33.8108, -117.9178], [33.8108, -117.9150],
      [33.8155, -117.9150], [33.8155, -117.9172],
      [33.8134, -117.9172],
    ],
  },
];

// ==================== DISNEY CALIFORNIA ADVENTURE ====================

const DCA_LANDS: ResortLand[] = [
  {
    id: "dca-buena-vista",
    name: "Buena Vista Street",
    park: "dca",
    color: "#E8A060",
    opacity: 0.32,
    polygon: [
      [33.8082, -117.9200], [33.8082, -117.9160],
      [33.8100, -117.9160], [33.8100, -117.9200],
    ],
  },
  {
    id: "dca-hollywood",
    name: "Hollywood Land",
    park: "dca",
    color: "#C87070",
    opacity: 0.32,
    polygon: [
      [33.8098, -117.9210], [33.8098, -117.9183],
      [33.8122, -117.9183], [33.8122, -117.9210],
    ],
  },
  {
    id: "dca-grizzly",
    name: "Grizzly Peak",
    park: "dca",
    color: "#88A860",
    opacity: 0.32,
    polygon: [
      [33.8120, -117.9210], [33.8120, -117.9185],
      [33.8145, -117.9185], [33.8145, -117.9210],
    ],
  },
  {
    id: "dca-pacific-wharf",
    name: "San Fransokyo Square",
    park: "dca",
    color: "#60B0A8",
    opacity: 0.32,
    polygon: [
      [33.8108, -117.9198], [33.8108, -117.9178],
      [33.8122, -117.9178], [33.8122, -117.9198],
    ],
  },
  {
    id: "dca-avengers",
    name: "Avengers Campus",
    park: "dca",
    color: "#7088B8",
    opacity: 0.32,
    polygon: [
      [33.8120, -117.9183], [33.8120, -117.9152],
      [33.8145, -117.9152], [33.8145, -117.9183],
    ],
  },
  {
    id: "dca-cars-land",
    name: "Cars Land",
    park: "dca",
    color: "#C8844A",
    opacity: 0.32,
    polygon: [
      [33.8087, -117.9178], [33.8087, -117.9150],
      [33.8112, -117.9150], [33.8112, -117.9178],
    ],
  },
  {
    id: "dca-paradise",
    name: "Paradise Gardens",
    park: "dca",
    color: "#98C878",
    opacity: 0.30,
    polygon: [
      [33.8082, -117.9200], [33.8082, -117.9178],
      [33.8105, -117.9178], [33.8105, -117.9200],
    ],
  },
  {
    id: "dca-pixar-pier",
    name: "Pixar Pier",
    park: "dca",
    color: "#58B0C8",
    opacity: 0.32,
    polygon: [
      [33.8082, -117.9178], [33.8082, -117.9150],
      [33.8100, -117.9150], [33.8100, -117.9178],
    ],
  },
];

// ==================== RESORT-WIDE AREAS ====================

const OTHER_LANDS: ResortLand[] = [
  {
    id: "esplanade",
    name: "Esplanade",
    park: "esplanade",
    color: "#D8D0A8",
    opacity: 0.28,
    polygon: [
      [33.8082, -117.9215], [33.8082, -117.9155],
      [33.8098, -117.9155], [33.8098, -117.9215],
    ],
  },
  {
    id: "downtown-disney",
    name: "Downtown Disney",
    park: "downtown_disney",
    color: "#D8B840",
    opacity: 0.28,
    polygon: [
      [33.8053, -117.9265], [33.8053, -117.9148],
      [33.8082, -117.9148], [33.8082, -117.9265],
    ],
  },
  {
    id: "hotel-grand-californian",
    name: "Grand Californian Hotel",
    park: "hotels",
    color: "#D8C090",
    opacity: 0.30,
    polygon: [
      [33.8082, -117.9222], [33.8082, -117.9203],
      [33.8105, -117.9203], [33.8105, -117.9222],
    ],
  },
  {
    id: "hotel-disneyland",
    name: "Disneyland Hotel",
    park: "hotels",
    color: "#D0C8A0",
    opacity: 0.30,
    polygon: [
      [33.8055, -117.9275], [33.8055, -117.9243],
      [33.8082, -117.9243], [33.8082, -117.9275],
    ],
  },
  {
    id: "hotel-pixar-place",
    name: "Pixar Place Hotel",
    park: "hotels",
    color: "#D8B8A0",
    opacity: 0.30,
    polygon: [
      [33.8053, -117.9245], [33.8053, -117.9220],
      [33.8080, -117.9220], [33.8080, -117.9245],
    ],
  },
  {
    id: "parking-mickey-friends",
    name: "Mickey & Friends Parking",
    park: "parking",
    color: "#B8B8B0",
    opacity: 0.28,
    polygon: [
      [33.8145, -117.9284], [33.8145, -117.9225],
      [33.8162, -117.9225], [33.8162, -117.9284],
    ],
  },
  {
    id: "parking-pixar-pals",
    name: "Pixar Pals Parking",
    park: "parking",
    color: "#B8B8B0",
    opacity: 0.28,
    polygon: [
      [33.8145, -117.9228], [33.8145, -117.9205],
      [33.8162, -117.9205], [33.8162, -117.9228],
    ],
  },
  {
    // Toy Story Parking is east of Harbor Blvd — just outside map bounds.
    // Rendered as a small indicator strip at the far right edge.
    id: "parking-toy-story",
    name: "Toy Story Parking",
    park: "parking",
    color: "#B0B0A8",
    opacity: 0.35,
    polygon: [
      [33.8088, -117.9158], [33.8088, -117.9148],
      [33.8110, -117.9148], [33.8110, -117.9158],
    ],
  },
];

// ==================== COMBINED EXPORT ====================

export const RESORT_LANDS: ResortLand[] = [
  // Render larger background areas first, specific lands on top
  ...OTHER_LANDS,
  ...DL_LANDS,
  ...DCA_LANDS,
];

/** Filter lands by park key */
export function getLandsByPark(park: ParkKey): ResortLand[] {
  return RESORT_LANDS.filter((l) => l.park === park);
}

/** Return the land a GPS point falls within (first match) */
export function getLandForPoint(
  lat: number,
  lng: number
): ResortLand | undefined {
  return RESORT_LANDS.find(({ polygon }) => pointInPolygon(lat, lng, polygon));
}

function pointInPolygon(
  lat: number,
  lng: number,
  poly: Array<[number, number]>
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
