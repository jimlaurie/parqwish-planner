// ==================== TRIP MAP PROXIMITY ====================
// Answers "what's nearby right now?" continuously as the Trip Map's playback
// scrubber moves — distinct from trip-map-flags.ts, which flags a completed
// item once at data-load time. Used to surface a marker's name/photos in the
// sidebar as the trail passes near it.

import { haversineMiles } from "./trail-geo";
import type { TripMapMarker } from "@/components/publish/TripMapView";

// ~130ft, in the middle of realistic in-park smartphone GPS accuracy (tens
// of feet in open areas, degrading to 100-300ft near tall structures/covered
// queues, which theme parks have plenty of) — tight enough to mean
// something, loose enough that a queue entrance offset from its attraction's
// plotted lat/lng doesn't miss.
export const PROXIMITY_THRESHOLD_MILES = 130 / 5280;

// Deliberately wider than trip-map-flags.ts's 20-minute flagging tolerance —
// this is a looser "surface what's nearby while scrubbing" UX aid, not a
// correctness check, and a wider window reduces the chance a coarse 5-minute
// arrow-key scrub hops clean over a narrow match window.
export const TIME_WINDOW_MINUTES = 25;

export function findNearestMarkerAt(
  point: { latitude: number; longitude: number } | null,
  currentAbsoluteMs: number | null,
  markers: TripMapMarker[],
  opts: { proximityMiles?: number; timeWindowMinutes?: number } = {}
): TripMapMarker | null {
  if (!point) return null;
  const proximityMiles = opts.proximityMiles ?? PROXIMITY_THRESHOLD_MILES;
  const timeWindowMs = (opts.timeWindowMinutes ?? TIME_WINDOW_MINUTES) * 60_000;

  let nearest: TripMapMarker | null = null;
  let nearestDistance = Infinity;

  for (const marker of markers) {
    const distance = haversineMiles(point.latitude, point.longitude, marker.latitude, marker.longitude);
    if (distance > proximityMiles) continue;

    // A marker with a logged time also has to be near the current scrub
    // time — several attractions can sit close together geographically, so
    // proximity alone would trigger on an item merely walked past, not
    // actually experienced at that moment. Markers with no logged time fall
    // back to proximity-only.
    if (marker.scheduledMs != null) {
      if (currentAbsoluteMs == null || Math.abs(currentAbsoluteMs - marker.scheduledMs) > timeWindowMs) {
        continue;
      }
    }

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = marker;
    }
  }

  return nearest;
}
