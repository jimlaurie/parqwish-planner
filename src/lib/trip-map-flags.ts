// ==================== TRIP MAP FLAGS ====================
// Flags a completed, timed item whose logged location doesn't line up with
// where the GPS trail actually was around that time — a signal the item may
// have been checked off at the wrong time, in the wrong place, or not
// actually done (e.g. marked complete from memory after the fact). Purely
// a review signal, not an error: "no-trail-coverage" just means the trail
// doesn't reach that moment (recording started late, gap, etc.), which is
// common and not necessarily wrong.

import { haversineMiles } from "./trail-geo";
import type { TrailPointLike } from "./trail-geo";

const TIME_TOLERANCE_MINUTES = 20;
const DISTANCE_THRESHOLD_MILES = 0.2;

export interface FlagResult {
  flagged: boolean;
  reason?: "no-trail-coverage" | "location-mismatch";
  nearestDistanceMiles?: number;
}

function scheduledTimeToMs(date: string, scheduledTime: string): number | null {
  const [hh, mm] = scheduledTime.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return null;
  const d = new Date(date + "T00:00:00");
  d.setHours(hh, mm, 0, 0);
  return d.getTime();
}

export function flagItem(
  date: string,
  scheduledTime: string | undefined,
  coord: { latitude: number; longitude: number } | undefined,
  trailPoints: TrailPointLike[]
): FlagResult {
  if (!scheduledTime || !coord || trailPoints.length === 0) {
    return { flagged: false };
  }
  const targetMs = scheduledTimeToMs(date, scheduledTime);
  if (targetMs === null) return { flagged: false };

  const toleranceMs = TIME_TOLERANCE_MINUTES * 60_000;
  let nearest: { latitude: number; longitude: number } | null = null;
  let nearestDelta = Infinity;
  for (const p of trailPoints) {
    const delta = Math.abs(p.timestamp - targetMs);
    if (delta <= toleranceMs && delta < nearestDelta) {
      nearestDelta = delta;
      nearest = p;
    }
  }

  if (!nearest) {
    return { flagged: true, reason: "no-trail-coverage" };
  }

  const distance = haversineMiles(coord.latitude, coord.longitude, nearest.latitude, nearest.longitude);
  const rounded = Math.round(distance * 100) / 100;
  if (distance > DISTANCE_THRESHOLD_MILES) {
    return { flagged: true, reason: "location-mismatch", nearestDistanceMiles: rounded };
  }
  return { flagged: false, nearestDistanceMiles: rounded };
}
