// ==================== TRIP PHOTO LOCATION ====================
// Figures out where an imported photo was taken, in order of confidence:
// 1. EXIF GPS on the file itself (camera roll shots almost always have this).
// 2. EXIF capture time, matched against the day's GPS trail (same
//    nearest-in-time approach trip-map-flags.ts uses for review flagging) —
//    common for photos that recorded a timestamp but GPS was off.
// 3. Neither — caller falls back to the manual location picker (PhotoPass
//    downloads typically land here; Disney's export pipeline generally
//    strips GPS and often the original capture timestamp too).

import exifr from "exifr";
import db from "./db";

const TIME_TOLERANCE_MINUTES = 20;

export interface ExifLocation {
  latitude?: number;
  longitude?: number;
  capturedAt?: string; // ISO-8601
}

export async function readExifLocation(file: File): Promise<ExifLocation> {
  try {
    const data = await exifr.parse(file, { gps: true, pick: ["DateTimeOriginal", "CreateDate"] });
    if (!data) return {};
    const capturedAt: Date | undefined = data.DateTimeOriginal ?? data.CreateDate;
    return {
      latitude: typeof data.latitude === "number" ? data.latitude : undefined,
      longitude: typeof data.longitude === "number" ? data.longitude : undefined,
      capturedAt: capturedAt instanceof Date && !isNaN(capturedAt.getTime()) ? capturedAt.toISOString() : undefined,
    };
  } catch {
    // Unreadable/unsupported format (e.g. some HEIC variants) — not fatal,
    // caller falls through to manual placement.
    return {};
  }
}

export interface TrailSuggestion {
  latitude: number;
  longitude: number;
}

/**
 * Nearest GPS trail point to a given timestamp, across every recorded trail
 * row for that trip+day (mirrors the multi-user merge Trip Map already
 * does). Returns null if nothing is within TIME_TOLERANCE_MINUTES.
 */
export async function suggestLocationFromTrail(
  tripId: string,
  date: string,
  capturedAtIso: string
): Promise<TrailSuggestion | null> {
  const targetMs = new Date(capturedAtIso).getTime();
  if (isNaN(targetMs)) return null;

  const trails = await db.trails.where("[tripId+date]").equals([tripId, date]).toArray();
  const toleranceMs = TIME_TOLERANCE_MINUTES * 60_000;

  let nearest: TrailSuggestion | null = null;
  let nearestDelta = Infinity;
  for (const trail of trails) {
    for (const p of trail.points) {
      const delta = Math.abs(p.timestamp - targetMs);
      if (delta <= toleranceMs && delta < nearestDelta) {
        nearestDelta = delta;
        nearest = { latitude: p.latitude, longitude: p.longitude };
      }
    }
  }
  return nearest;
}
