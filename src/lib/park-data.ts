// ==================== PARK DATA ====================

import { syncDay, type ShowtimeHistory } from "@/lib/showtimes";
import { parkDate } from "@/lib/dates";

// Served from public/data/ (downloaded from Firebase Storage via scripts/download-park-data.mjs)
const BASE_URL = "/data";

// The same files straight from Firebase Storage, refreshed by Cloud Functions
// (shows.json's showtimes every morning at 6 AM PT). Readable from the
// Planner's origins and localhost:3000 thanks to the bucket's CORS rule
// (dland-wishes docs/changelog.md, "CORS Rule on the Storage Bucket").
const LIVE_BASE_URL = "https://storage.googleapis.com/my-tour-guide-backend.firebasestorage.app/data";
/** Files read live, falling back to the deploy's copy in public/data/:
 *  showtimes change daily, and restaurants carry Disney's View/Menu/Reserve
 *  links, which the publish step adds and refreshes nightly. */
const LIVE_FILES = new Set<string>(["shows.json", "restaurants.json"]);
const DISNEY_SITE = "https://disneyland.disney.go.com";
export const LIVE_TIMEOUT_MS = 8000;

/**
 * A live Storage URL with a query that changes hourly. Storage lets browsers
 * cache these files for an hour, and a copy cached before the bucket's CORS
 * rule covered this site would keep failing; the query also picks up the
 * morning's new showtimes on the hour.
 */
export function liveUrl(path: string): string {
  return `${LIVE_BASE_URL}/${path}?h=${Math.floor(Date.now() / 3_600_000)}`;
}

const FILES = ["rides.json", "shows.json", "restaurants.json", "shops.json", "places.json"] as const;

// ==================== CACHE KEYS ====================
// Every localStorage cache here is keyed to the build's version, so each
// deploy starts with fresh caches: a change to what's cached (a new field,
// a new source) can't be hidden by a copy cached before it, and there's no
// suffix to remember to bump (forgotten three times before this). Older
// keys are removed at startup by pruneOldParkDataCaches().

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

/** A cache key for this build, e.g. "dland-park-data-cache@6.0.84". */
export function cacheKey(name: string): string {
  return `dland-${name}-cache@${APP_VERSION}`;
}

/** Any park data cache key, this build's or an older one ("-v6", "@6.0.83"...). Not the app store's keys. */
const PARK_CACHE_KEY_PATTERN = /^dland-[a-z-]+-cache(-v\d+)?(@.+)?$/;

/** Removes park data caches left by earlier builds. Safe to call on every start. */
export function pruneOldParkDataCaches(): void {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && PARK_CACHE_KEY_PATTERN.test(key) && !key.endsWith(`@${APP_VERSION}`)) stale.push(key);
    }
    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage unavailable
  }
}

const CACHE_KEY = cacheKey("park-data");
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
// Once the cached showtimes are from an earlier park day, look again this often
const STALE_SHOWTIMES_RETRY = 60 * 60 * 1000; // 1 hour

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
    if (parkKey === "version" || parkKey === "lastUpdated" || typeof entities !== "object" || !entities) continue;
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
        // Stored as a path on Disney's site ("/dine-res/…"); Pal adds the host the same way
        if (entity.reservationUrl) item.reservationUrl = entity.reservationUrl.startsWith("/") ? DISNEY_SITE + entity.reservationUrl : entity.reservationUrl;
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
  /** shows.json's lastShowtimeSync: when its showtimes were fetched (they're that day's schedule). */
  showtimesSyncedAt?: string | null;
}

let showtimesSyncedAt: string | null = null;

/**
 * When the loaded showtimes were synced (ISO), or null if unknown. They're
 * the schedule for the day they were synced: normally today's, read live
 * from Storage, or the deploy's copy if that couldn't be reached. Set by getParkData.
 */
export function getShowtimesSyncedAt(): string | null {
  return showtimesSyncedAt;
}

/**
 * A cached copy is used for up to a day, but once its showtimes are from an
 * earlier park day (Pacific) it's refetched hourly, so the morning's new
 * showtimes show up the same day.
 */
function isCacheFresh(entry: CacheEntry, now: number): boolean {
  const age = now - entry.timestamp;
  if (age >= CACHE_TTL || entry.data.length === 0) return false;
  const today = parkDate(new Date(now));
  return syncDay(entry.showtimesSyncedAt ?? null) === today || age < STALE_SHOWTIMES_RETRY;
}

async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

/** One park data file: live from Storage for LIVE_FILES, else (or if that fails) the deploy's copy. */
async function fetchParkFile(file: string): Promise<Record<string, unknown>> {
  if (LIVE_FILES.has(file)) {
    try {
      const data = await fetchJson(liveUrl(file), { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) });
      // Every park data file is keyed by park (restaurants.json has no "version")
      if (data && typeof data === "object" && typeof data.disneyland === "object") return data;
      console.warn(`[park-data] live ${file} looked wrong, using the deployed copy`);
    } catch (err) {
      console.warn(`[park-data] live ${file} unavailable, using the deployed copy:`, err);
    }
  }
  return fetchJson(`${BASE_URL}/${file}`);
}

// ==================== SHOWTIME HISTORY ====================
// A few weeks of daily showtime snapshots kept by the dland-wishes
// syncShowtimes function (functions/showtimeHistory.js), read live from
// Storage only: without it the Planner falls back to the latest sync.

const HISTORY_CACHE_KEY = cacheKey("showtime-history");
let historyInFlight: Promise<ShowtimeHistory | null> | null = null;

export function getShowtimeHistory(): Promise<ShowtimeHistory | null> {
  historyInFlight ??= loadShowtimeHistory().finally(() => { historyInFlight = null; });
  return historyInFlight;
}

async function loadShowtimeHistory(): Promise<ShowtimeHistory | null> {
  const now = Date.now();
  const today = parkDate(new Date(now));
  try {
    const cached = localStorage.getItem(HISTORY_CACHE_KEY);
    if (cached) {
      const entry: { data: ShowtimeHistory; timestamp: number } = JSON.parse(cached);
      const age = now - entry.timestamp;
      const hasToday = !!entry.data?.days?.[today];
      if (entry.data?.days && age < CACHE_TTL && (hasToday || age < STALE_SHOWTIMES_RETRY)) return entry.data;
    }
  } catch { /* cache read failed */ }

  try {
    const data = await fetchJson(liveUrl("showtimeHistory.json"), { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) });
    if (!data || typeof data.days !== "object" || !data.days) throw new Error("no days");
    const history: ShowtimeHistory = { days: data.days as ShowtimeHistory["days"] };
    try {
      localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify({ data: history, timestamp: now }));
    } catch { /* cache write failed */ }
    return history;
  } catch (err) {
    console.warn("[park-data] showtime history unavailable:", err);
    return null;
  }
}

// Callers that ask at the same time (the catalog and the show schedules on
// Preview) share one download.
let inFlight: Promise<ParkDataItem[]> | null = null;

export function getParkData(): Promise<ParkDataItem[]> {
  inFlight ??= loadParkData().finally(() => { inFlight = null; });
  return inFlight;
}

async function loadParkData(): Promise<ParkDataItem[]> {
  // Check localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const entry: CacheEntry = JSON.parse(cached);
      if (isCacheFresh(entry, Date.now())) {
        showtimesSyncedAt = entry.showtimesSyncedAt ?? null;
        return entry.data;
      }
    }
  } catch {
    // Cache read failed
  }

  // Fetch all files in parallel
  const results = await Promise.allSettled(
    FILES.map(async (file) => {
      const data = await fetchParkFile(file);
      if (file === "shows.json" && typeof data.lastShowtimeSync === "string") showtimesSyncedAt = data.lastShowtimeSync;
      return flattenParkData(data as Record<string, Record<string, RawParkEntity>>, fileToType(file));
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
      const entry: CacheEntry = { data: items, timestamp: Date.now(), showtimesSyncedAt };
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
const coordCacheKey = cacheKey("park-coord");

// Keyed to the build (cacheKey): the day-of-week and hourly fields once
// shipped behind a key nobody bumped, and looked broken for up to 24h.
const waitStatsCacheKey = cacheKey("wait-time-stats");

export function clearParkDataCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(HISTORY_CACHE_KEY);
    localStorage.removeItem(HOURS_CACHE_KEY);
    localStorage.removeItem(coordCacheKey);
    localStorage.removeItem(landConfigCacheKey);
    localStorage.removeItem(waitStatsCacheKey);
    localStorage.removeItem(rideReliabilityCacheKey);
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

// ==================== WAIT TIME STATS ====================
// Published nightly by the dland-wishes Cloud Function generateWaitTimeStats,
// keyed "parkKey__entityId" to match CoordMaps.byId directly — no fuzzy
// name matching needed on this side, that resolution already happened
// server-side against the same rides.json this file also fetches.

const WAIT_STATS_FILE = "waitTimeStats.json";

export interface WaitTimeDayStat {
  medianWaitMinutes: number;
  sampleSize: number;
}

export interface WaitTimeRideEntry {
  rideName: string;
  park: string;
  weekday: WaitTimeDayStat | null;
  weekend: WaitTimeDayStat | null;
  byDayOfWeek?: Record<string, WaitTimeDayStat>;
  byHour?: {
    weekday: Record<string, WaitTimeDayStat>;
    weekend: Record<string, WaitTimeDayStat>;
  };
  byHourByDayOfWeek?: Record<string, Record<string, WaitTimeDayStat>>;
}

export interface WaitTimeStats {
  generatedAt: string;
  windowDays: number;
  windowStart: string;
  windowEnd: string;
  minSampleSize: number;
  rides: Record<string, WaitTimeRideEntry>;
  unmatchedRideNames: string[];
}

export async function getWaitTimeStats(): Promise<WaitTimeStats | null> {
  try {
    const cached = localStorage.getItem(waitStatsCacheKey);
    if (cached) {
      const entry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL && entry.data?.rides) {
        return entry.data;
      }
    }
  } catch { /* cache read failed */ }

  try {
    const res = await fetch(`${BASE_URL}/${WAIT_STATS_FILE}`);
    if (!res.ok) return null;
    const data = await res.json() as WaitTimeStats;

    try {
      localStorage.setItem(waitStatsCacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    } catch { /* cache write failed */ }

    return data;
  } catch {
    return null;
  }
}

// ==================== RIDE RELIABILITY STATS ====================
// Published nightly by the dland-wishes Cloud Function
// generateRideReliabilityStats, same "${parkKey}__${entityId}" keying as
// waitTimeStats.json above.

const RIDE_RELIABILITY_FILE = "rideReliabilityStats.json";

// Bump the version suffix whenever RideReliabilityEntry's shape changes —
const rideReliabilityCacheKey = cacheKey("ride-reliability");

export interface RideReliabilityRecovery {
  episodeCount: number;
  avgWaitBeforeDown: number;
  avgWaitRightAfterReopen: number;
  avgWaitPlus30min: number;
  avgDropImmediate: number;
  avgDropPlus30min: number;
}

export interface RideReliabilityEntry {
  rideName: string;
  park: string;
  daysOpen: number;
  daysWithBreakdown: number;
  oddsOfBreakdownPct: number;
  breakdownCount: number;
  avgDowntimeMinutes: number | null;
  recovery: RideReliabilityRecovery | null;
}

export interface RideReliabilityStats {
  generatedAt: string;
  windowDays: number;
  windowStart: string;
  windowEnd: string;
  minBreakdownMinutes: number;
  minRecoveryEpisodes: number;
  minDaysOpen: number;
  rides: Record<string, RideReliabilityEntry>;
  unmatchedRideNames: string[];
}

export async function getRideReliabilityStats(): Promise<RideReliabilityStats | null> {
  try {
    const cached = localStorage.getItem(rideReliabilityCacheKey);
    if (cached) {
      const entry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < CACHE_TTL && entry.data?.rides) {
        return entry.data;
      }
    }
  } catch { /* cache read failed */ }

  try {
    const res = await fetch(`${BASE_URL}/${RIDE_RELIABILITY_FILE}`);
    if (!res.ok) return null;
    const data = await res.json() as RideReliabilityStats;

    try {
      localStorage.setItem(rideReliabilityCacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    } catch { /* cache write failed */ }

    return data;
  } catch {
    return null;
  }
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

const landConfigCacheKey = cacheKey("land-config");

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

// ==================== PARK HOURS ====================
// One file per day, data/hours/YYYY-MM-DD.json, written nightly by the
// dland-wishes generateParkHours function from ThemeParks.wiki, about a
// month ahead (later days don't exist yet). Read live from Storage.

export interface ParkSpecialHours {
  description: string;
  openingTime: string | null;
  closingTime: string | null;
}

export interface ParkHoursForPark {
  /** ISO times with the park's offset, e.g. "2026-10-16T08:00:00-07:00". */
  openingTime: string | null;
  closingTime: string | null;
  /** Ticketed events (e.g. an after-hours party) that day. */
  specialHours: ParkSpecialHours[];
}

export interface DayParkHours {
  date: string;
  disneyland: ParkHoursForPark | null;
  californiaadventure: ParkHoursForPark | null;
}

const HOURS_CACHE_KEY = cacheKey("park-hours");
const HOURS_TTL = 6 * 60 * 60 * 1000; // hours rarely change, but they can
const hoursInFlight = new Map<string, Promise<DayParkHours | null>>();

type HoursCache = Record<string, { data: DayParkHours | null; fetchedAt: number }>;

function readHoursCache(): HoursCache {
  try {
    return JSON.parse(localStorage.getItem(HOURS_CACHE_KEY) || "{}") as HoursCache;
  } catch {
    return {};
  }
}

function writeHoursCache(date: string, data: DayParkHours | null): void {
  try {
    const cache = readHoursCache();
    const cutoff = Date.now() - HOURS_TTL;
    for (const [d, e] of Object.entries(cache)) if (e.fetchedAt < cutoff) delete cache[d];
    cache[date] = { data, fetchedAt: Date.now() };
    localStorage.setItem(HOURS_CACHE_KEY, JSON.stringify(cache));
  } catch { /* cache write failed */ }
}

/**
 * A day's park hours, or null when they aren't posted (too far ahead, or
 * past). Rejects when they couldn't be loaded (offline, blocked), which the
 * caller should say differently from "not posted".
 */
export function getParkHours(date: string): Promise<DayParkHours | null> {
  const cached = readHoursCache()[date];
  if (cached && Date.now() - cached.fetchedAt < HOURS_TTL) return Promise.resolve(cached.data);
  let pending = hoursInFlight.get(date);
  if (!pending) {
    pending = fetch(liveUrl(`hours/${date}.json`), { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) })
      .then(async (res) => {
        // Storage answers 403 (or 404) for a file that doesn't exist yet
        if (!res.ok && res.status !== 403 && res.status !== 404) throw new Error(`park hours ${date}: ${res.status}`);
        const data = res.ok ? ((await res.json()) as DayParkHours) : null;
        writeHoursCache(date, data);
        return data;
      })
      .finally(() => hoursInFlight.delete(date));
    hoursInFlight.set(date, pending);
  }
  return pending;
}
