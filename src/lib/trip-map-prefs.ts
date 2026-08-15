// ==================== TRIP MAP PREFERENCES ====================
// Local-only (this browser only, never synced) preferences for the Trip
// Map view: the last-used trail time-range filter per trip+day, and manual
// corrections to individual GPS points whose recorded location drifted
// (typically from being indoors, or elevator/parking-structure noise).
//
// Point corrections are deliberately NOT written back through
// db.trails/Firestore — a correction here is a personal display fix layered
// on top of the synced recording, the same relationship excludedPhotoIds
// already has to the Publish photo gallery (see store.ts), not a rewrite of
// the recorded trail itself. Mutating the synced record directly would risk
// the correction being silently clobbered by the next cloud pull, and doing
// that safely would need real sync-architecture work (a Firestore write
// path, rules, mobile-side handling) — out of scope for a quick fix to a
// handful of drifted points.

const RANGE_PREFIX = "parqwish:tripmap:range:";
const CORRECTIONS_KEY = "parqwish:tripmap:pointCorrections";

export interface StoredTimeRange {
  from: string;
  to: string;
}

export interface PointCorrection {
  latitude: number;
  longitude: number;
}

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable/full — a lost preference isn't worth surfacing an error for
  }
}

// ==================== TIME RANGE (per trip + day) ====================

export function getStoredTimeRange(tripId: string, date: string): StoredTimeRange | null {
  return safeGet<StoredTimeRange>(RANGE_PREFIX + `${tripId}::${date}`);
}

export function setStoredTimeRange(tripId: string, date: string, range: StoredTimeRange): void {
  safeSet(RANGE_PREFIX + `${tripId}::${date}`, range);
}

export function clearStoredTimeRange(tripId: string, date: string): void {
  try {
    localStorage.removeItem(RANGE_PREFIX + `${tripId}::${date}`);
  } catch {
    // ignore
  }
}

// ==================== POINT CORRECTIONS (flat map) ====================
// Keyed by `${sourceTrailId}::${timestamp}` — a specific GPS reading from a
// specific recorded trail row, stable regardless of how points get merged,
// sorted, or re-filtered for display.

export function pointCorrectionKey(sourceTrailId: string, timestamp: number): string {
  return `${sourceTrailId}::${timestamp}`;
}

export function getAllPointCorrections(): Record<string, PointCorrection> {
  return safeGet<Record<string, PointCorrection>>(CORRECTIONS_KEY) ?? {};
}

export function setPointCorrection(key: string, coord: PointCorrection): void {
  const all = getAllPointCorrections();
  all[key] = coord;
  safeSet(CORRECTIONS_KEY, all);
}

export function clearPointCorrection(key: string): void {
  const all = getAllPointCorrections();
  delete all[key];
  safeSet(CORRECTIONS_KEY, all);
}
