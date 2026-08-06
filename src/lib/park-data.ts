// ==================== PARK DATA ====================

// Served from public/data/ (downloaded from Firebase Storage via scripts/download-park-data.mjs)
const BASE_URL = "/data";

const FILES = ["rides.json", "shows.json", "restaurants.json", "shops.json", "places.json"] as const;

const CACHE_KEY = "dland-park-data-cache-v4";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface ParkDataStop {
  name: string;
  land: string;
  latitude: number;
  longitude: number;
}

export interface ParkDataItem {
  id: string;
  name: string;
  type: "ride" | "show" | "dining" | "shop" | "place";
  park: string;
  land: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  stops?: ParkDataStop[];

  // Rich detail fields from park data JSON
  status?: string;

  // Rides
  rideType?: string;
  hasLL?: boolean;
  heightCm?: number;
  heightRequirement?: string;
  warnings?: string[];
  closureReason?: string;
  openedDate?: string;
  closedDate?: string;

  // Shows
  showTypes?: string[];
  duration?: number;
  timeRanges?: Array<{ start: string; end: string }>;
  times?: string[];

  // Dining
  diningType?: string;
  cuisine?: string;
  reservations?: boolean;
  requiresReservations?: boolean;
  url?: string;
  menuUrl?: string;
  reservationUrl?: string;

  // Shops
  shopType?: string;
  description?: string;
  merchandiseCategories?: string[];
  notableItems?: string;
  hours?: string;
  acceptsAPDiscount?: boolean;
}

export const PARK_LABELS: Record<string, string> = {
  disneyland: "Disneyland",
  californiaadventure: "California Adventure",
  downtown: "Downtown Disney",
  hotels: "Hotels",
  disneyland_resort: "Disneyland Resort",
};

// Hotel park keys still used in Firestore entity data (shops/restaurants/places).
// Normalised to "Hotels" in flattenParkData so the UI shows the correct hierarchy.
const HOTEL_PARK_KEYS = new Set(["grandcalifornian", "disneyland_hotel", "pixar_place_hotel"]);

function fileToType(file: string): ParkDataItem["type"] {
  if (file.includes("rides")) return "ride";
  if (file.includes("shows")) return "show";
  if (file.includes("restaurants")) return "dining";
  if (file.includes("places")) return "place";
  return "shop";
}

// Loose entity type that covers all JSON fields across all files
interface RawParkEntity {
  name?: string;
  land?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  stops?: ParkDataStop[];
  status?: string;
  // rides
  type?: string;
  hasLL?: boolean;
  heightCm?: number;
  heightRequirement?: string;
  warnings?: string[];
  closureReason?: string;
  openedDate?: string;
  closedDate?: string;
  // shows
  types?: string[];
  duration?: number;
  timeRanges?: Array<{ start: string; end: string }>;
  times?: string[];
  // dining
  cuisine?: string;
  reservations?: boolean;
  requiresReservations?: boolean;
  url?: string;
  menuUrl?: string;
  reservationUrl?: string;
  // shops
  description?: string;
  merchandiseCategories?: string[];
  notableItems?: string;
  hours?: string;
  acceptsAPDiscount?: boolean;
}

function flattenParkData(
  data: Record<string, Record<string, RawParkEntity>>,
  type: ParkDataItem["type"]
): ParkDataItem[] {
  const items: ParkDataItem[] = [];
  for (const [parkKey, entities] of Object.entries(data)) {
    if (parkKey === "version" || parkKey === "lastUpdated") continue;
    const parkLabel = HOTEL_PARK_KEYS.has(parkKey) ? "Hotels" : (PARK_LABELS[parkKey] ?? parkKey);
    for (const [entityId, entity] of Object.entries(entities)) {
      if (!entity.name) continue;
      const item: ParkDataItem = {
        id: `${parkKey}__${entityId}`,
        name: entity.name,
        type,
        park: parkLabel,
        land: entity.land ?? "Unknown",
        ...(entity.category ? { category: entity.category } : {}),
        ...(entity.status ? { status: entity.status } : {}),
      };

      if (entity.latitude != null && entity.longitude != null) {
        item.latitude = entity.latitude;
        item.longitude = entity.longitude;
      }
      if (entity.stops && Array.isArray(entity.stops)) {
        item.stops = entity.stops;
      }

      // Rich fields by entity type
      if (type === "ride") {
        if (entity.type) item.rideType = entity.type;
        if (entity.hasLL != null) item.hasLL = entity.hasLL;
        if (entity.heightCm != null) item.heightCm = entity.heightCm;
        if (entity.heightRequirement) item.heightRequirement = entity.heightRequirement;
        if (entity.warnings?.length) item.warnings = entity.warnings;
        if (entity.closureReason) item.closureReason = entity.closureReason;
        if (entity.openedDate) item.openedDate = entity.openedDate;
        if (entity.closedDate) item.closedDate = entity.closedDate;
      } else if (type === "show") {
        if (entity.types?.length) item.showTypes = entity.types;
        if (entity.duration != null) item.duration = entity.duration;
        if (entity.timeRanges?.length) item.timeRanges = entity.timeRanges;
        if (entity.times?.length) item.times = entity.times;
      } else if (type === "dining") {
        if (entity.type) item.diningType = entity.type;
        if (entity.cuisine) item.cuisine = entity.cuisine;
        if (entity.reservations != null) item.reservations = entity.reservations;
        if (entity.requiresReservations != null) item.requiresReservations = entity.requiresReservations;
        if (entity.url) item.url = entity.url;
        if (entity.menuUrl) item.menuUrl = entity.menuUrl;
        if (entity.reservationUrl) item.reservationUrl = entity.reservationUrl;
      } else if (type === "shop") {
        if (entity.type) item.shopType = entity.type;
        if (entity.description) item.description = entity.description;
        if (entity.merchandiseCategories?.length) item.merchandiseCategories = entity.merchandiseCategories;
        if (entity.notableItems) item.notableItems = entity.notableItems;
        if (entity.hours) item.hours = entity.hours;
        if (entity.acceptsAPDiscount != null) item.acceptsAPDiscount = entity.acceptsAPDiscount;
      } else if (type === "place") {
        if (entity.description) item.description = entity.description;
      }

      items.push(item);
    }
  }
  return items;
}

interface CacheEntry {
  data: ParkDataItem[];
  timestamp: number;
}

export async function getParkData(): Promise<ParkDataItem[]> {
  // Check localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL && entry.data.length > 0) {
        return entry.data;
      }
    }
  } catch {
    // Cache read failed
  }

  // Fetch all files in parallel
  const results = await Promise.allSettled(
    FILES.map(async (file) => {
      const res = await fetch(`${BASE_URL}/${file}`);
      if (!res.ok) throw new Error(`${file}: ${res.status}`);
      const data = await res.json();
      return flattenParkData(data, fileToType(file));
    })
  );

  const items: ParkDataItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }

  // Sort alphabetically
  items.sort((a, b) => a.name.localeCompare(b.name));

  // Only cache if we got data (avoids caching an empty result from a failed fetch)
  if (items.length > 0) {
    try {
      const entry: CacheEntry = { data: items, timestamp: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Cache write failed (e.g. quota)
    }
  }

  return items;
}

// ==================== COORDINATE LOOKUP ====================

// Two lookup maps:
// 1. By parkDataId (e.g. "disneyland__space-mountain") → exact match from wish linkage
// 2. By name (lowercase) → fuzzy fallback for unlinked items
const coordCacheKey = "dland-park-coord-cache";

export function clearParkDataCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(coordCacheKey);
    localStorage.removeItem(landConfigCacheKey);
  } catch {
    // localStorage unavailable
  }
}

export interface AttractionCoord {
  latitude: number;
  longitude: number;
  land: string;
  stops?: ParkDataStop[];
}

export interface CoordMaps {
  byId: Record<string, AttractionCoord>;   // parkDataId → coord
  byName: Record<string, AttractionCoord>; // lowercase name → coord
}

export async function getAttractionCoords(): Promise<CoordMaps> {
  // Check localStorage cache
  try {
    const cached = localStorage.getItem(coordCacheKey);
    if (cached) {
      const entry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL && entry.data?.byId) {
        return entry.data;
      }
    }
  } catch { /* cache read failed */ }

  const byId: Record<string, AttractionCoord> = {};
  const byName: Record<string, AttractionCoord> = {};

  const results = await Promise.allSettled(
    FILES.map(async (file) => {
      const res = await fetch(`${BASE_URL}/${file}`);
      if (!res.ok) return;
      const data = await res.json();
      for (const [parkKey, entities] of Object.entries(data)) {
        if (parkKey === "version" || parkKey === "lastUpdated") continue;
        if (typeof entities !== "object" || entities === null) continue;
        for (const [entityId, entity] of Object.entries(entities as Record<string, Record<string, unknown>>)) {
          if (entity.name && entity.latitude != null && entity.longitude != null) {
            const coord: AttractionCoord = {
              latitude: entity.latitude as number,
              longitude: entity.longitude as number,
              land: (entity.land as string) ?? "Unknown",
            };
            if (entity.stops && Array.isArray(entity.stops)) {
              coord.stops = entity.stops as ParkDataStop[];
            }
            // ID-based key matches parkDataId format: "parkKey__entityId"
            byId[`${parkKey}__${entityId}`] = coord;
            // Name-based key for fuzzy fallback
            byName[(entity.name as string).toLowerCase()] = coord;
          }
        }
      }
    })
  );

  void results;

  const maps: CoordMaps = { byId, byName };
  if (Object.keys(byId).length > 0) {
    try {
      localStorage.setItem(coordCacheKey, JSON.stringify({ data: maps, timestamp: Date.now() }));
    } catch { /* cache write failed */ }
  }

  return maps;
}

// ==================== TAG MAPPING ====================

export const PARK_DATA_TYPE_TO_TAG: Record<ParkDataItem["type"], string> = {
  ride: "rides",
  show: "shows",
  dining: "eats",
  shop: "shopping",
  place: "place",
};

// ==================== LAND CONFIG ====================

// Canonical park → lands mapping, managed via the admin panel (Firestore `parkData/landConfig`).
// Source of truth for land pickers — avoids deriving lands from possibly-stale entity data
// (e.g. one-off place names like "Toy Story Parking" showing up as "lands" for Disneyland Resort).
export interface LandConfigEntry {
  displayName: string;
  lands: string[];
}

const landConfigCacheKey = "dland-land-config-cache";

export async function getLandConfig(): Promise<Record<string, LandConfigEntry>> {
  try {
    const cached = localStorage.getItem(landConfigCacheKey);
    if (cached) {
      const entry: CacheEntry & { data: Record<string, LandConfigEntry> } = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL && entry.data && Object.keys(entry.data).length > 0) {
        return entry.data;
      }
    }
  } catch {
    // Cache read failed
  }

  try {
    const res = await fetch(`${BASE_URL}/landConfig.json`);
    if (!res.ok) throw new Error(`landConfig.json: ${res.status}`);
    const data: Record<string, LandConfigEntry> = await res.json();

    try {
      localStorage.setItem(landConfigCacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // Cache write failed
    }

    return data;
  } catch {
    return {};
  }
}
