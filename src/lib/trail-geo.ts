// ==================== TRAIL GEO ====================
// Distance/duration math for a recorded GPS trail, plus a resort-boundary
// gate so a trail that kept recording after leaving the park (e.g. the
// drive home) doesn't get counted as walking distance. Previously this
// haversine/distance/duration trio was duplicated verbatim in
// TrailGallery.tsx and pdf-generator.ts with no boundary awareness at all —
// centralized here so the fix (and any future one) only needs to land once.

import { LAND_COORDINATES } from "./map-data";

export interface TrailPointLike {
  latitude: number;
  longitude: number;
  timestamp: number;
}

// ==================== RESORT BOUNDARY ====================

// A quarter-mile buffer *beyond* the resort's own known footprint (the
// bounding box of every land/hotel centroid we track) — not a quarter-mile
// radius from a single center point, which would be too tight: the parks
// themselves span roughly 0.35mi from RESORT_CENTER at their widest. The
// buffer is generous enough to include on-property hotels and immediately
// adjacent parking/hotels (a short walk), while a highway drive home clears
// it within moments of leaving.
const BOUNDARY_MARGIN_MILES = 0.25;

function computeResortBounds() {
  const lats = Object.values(LAND_COORDINATES).map((c) => c.lat);
  const lngs = Object.values(LAND_COORDINATES).map((c) => c.lng);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);

  // Degrees-per-mile is ~constant for latitude, but longitude needs a
  // cos(latitude) correction — fine as an approximation here since this
  // is a coarse in/out gate, not precision mapping.
  const avgLat = (latMin + latMax) / 2;
  const latMarginDeg = BOUNDARY_MARGIN_MILES / 69.0;
  const lngMarginDeg = BOUNDARY_MARGIN_MILES / (69.17 * Math.cos((avgLat * Math.PI) / 180));

  return {
    latMin: latMin - latMarginDeg,
    latMax: latMax + latMarginDeg,
    lngMin: lngMin - lngMarginDeg,
    lngMax: lngMax + lngMarginDeg,
  };
}

export const RESORT_BOUNDS = computeResortBounds();

export function isWithinResort(lat: number, lng: number): boolean {
  return (
    lat >= RESORT_BOUNDS.latMin && lat <= RESORT_BOUNDS.latMax &&
    lng >= RESORT_BOUNDS.lngMin && lng <= RESORT_BOUNDS.lngMax
  );
}

// ==================== DISTANCE / DURATION ====================

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Sums haversine distance between consecutive points. By default, a segment
 * only counts if BOTH endpoints are within the resort boundary — so a trail
 * that kept recording past the parking lot (e.g. driving home) stops
 * contributing distance the moment it leaves, without needing the point to
 * be manually trimmed. Pass `boundToResort: false` to get the raw,
 * unfiltered distance (e.g. for a trail intentionally covering travel to a
 * further-away hotel).
 */
export function calcDistanceMiles(
  points: TrailPointLike[],
  opts: { boundToResort?: boolean } = {}
): number {
  const boundToResort = opts.boundToResort ?? true;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (boundToResort && (!isWithinResort(a.latitude, a.longitude) || !isWithinResort(b.latitude, b.longitude))) {
      continue;
    }
    total += haversineMiles(a.latitude, a.longitude, b.latitude, b.longitude);
  }
  return total;
}

export function calcDurationMinutes(points: TrailPointLike[]): number {
  if (points.length < 2) return 0;
  return Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 60_000);
}

// ==================== TIME RANGE FILTER ====================
// Same "From/To" wall-clock filtering TrailGallery uses on the Publish page,
// pulled out here so a second surface (Trip Map) can filter a trail's
// *display* without duplicating the logic a third time.

export interface TrailTimeRange { from: string; to: string }

export function filterPointsByRange<T extends TrailPointLike>(
  points: T[],
  range: TrailTimeRange
): T[] {
  const [fh, fm] = range.from.split(":").map(Number);
  const [th, tm] = range.to.split(":").map(Number);
  const fromMins = fh * 60 + fm;
  const toMins = th * 60 + tm;
  return points.filter((p) => {
    const d = new Date(p.timestamp);
    const mins = d.getHours() * 60 + d.getMinutes();
    return mins >= fromMins && mins <= toMins;
  });
}

export function defaultTimeRange(points: TrailPointLike[]): TrailTimeRange | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const toTimeStr = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };
  return { from: toTimeStr(sorted[0].timestamp), to: toTimeStr(sorted[sorted.length - 1].timestamp) };
}
