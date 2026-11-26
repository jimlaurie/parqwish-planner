// ==================== TRIP RESORTS ====================
// Which resorts a trip visits (Trip.resortIds; dland-wishes
// docs/multi-park-architecture.md §7a). Missing means Disneyland Resort, so
// every trip from before multi-park keeps its meaning, and a trip that only
// visits Disneyland Resort is saved without the field. Pure; checked
// through the pages in tests/e2e/resorts.spec.ts.

import { RESORTS, DEFAULT_RESORT_ID, getResort, tripResortIds, dayResortId, resortOfParkDataId, type ResortConfig } from "@shared/constants/resorts";
import { RESORTS_AVAILABLE } from "@/lib/feature-flags";

// The trip and day rules themselves are shared with Pal
export { tripResortIds, dayResortId, withDayResort, resortOfParkDataId } from "@shared/constants/resorts";

/**
 * The resort a trip date is at in this build: the day's pick with the
 * resorts beta on, else Disneyland Resort (the live Planner ignores picks
 * made on the beta, as it shows no other resort).
 */
export function dayResortFor(trip: { resortIds?: string[]; dayResorts?: Record<string, string> } | null | undefined, date: string | null): string {
  return RESORTS_AVAILABLE && date ? dayResortId(trip, date) : DEFAULT_RESORT_ID;
}

/** Whether this build lets the trip's days pick a resort (the beta, and a trip visiting more than one). */
export function tripPicksDayResorts(trip: { resortIds?: string[] } | null | undefined): boolean {
  return RESORTS_AVAILABLE && tripResortIds(trip).length > 1;
}

/** A resort's name on a day tab: "Disneyland", "Knott's", "Universal". */
export function resortTabLabel(resortId: string): string {
  const name = getResort(resortId)?.name ?? resortId;
  return name.replace(/ (Resort|Berry Farm|Studios Hollywood)$/, "");
}

/**
 * Whether a trip item belongs on a day at `dayResort`: a park item only at
 * its own resort; anything else (a plain wish, packing, a pinned place) on
 * every day.
 */
export function onDayResort(parkDataId: string | undefined | null, dayResort: string): boolean {
  const resort = resortOfParkDataId(parkDataId);
  return !resort || resort.id === dayResort;
}

/**
 * What to save: the chosen resorts in registry order, without repeats or
 * unknown ids; undefined (the field left out) for Disneyland Resort alone or
 * nothing chosen.
 */
export function resortIdsToSave(ids: string[]): string[] | undefined {
  const chosen = RESORTS.map((r) => r.id).filter((id) => ids.includes(id));
  if (chosen.length === 0 || (chosen.length === 1 && chosen[0] === DEFAULT_RESORT_ID)) return undefined;
  return chosen;
}

/** The trip's resorts' names for its card ("Disneyland Resort · Knott's Berry Farm"), or null for Disneyland Resort alone. */
export function tripResortsLabel(trip?: { resortIds?: string[] } | null): string | null {
  const ids = tripResortIds(trip);
  if (ids.length === 1 && ids[0] === DEFAULT_RESORT_ID) return null;
  return ids.map((id) => getResort(id)?.name ?? id).join(" · ");
}

/** Of `offered` (the resorts this build shows), the trip's; all of them when there's no trip. */
export function resortsForTrip(offered: ResortConfig[], trip?: { resortIds?: string[] } | null): ResortConfig[] {
  if (!trip) return offered;
  const ids = tripResortIds(trip);
  const mine = offered.filter((r) => ids.includes(r.id));
  return mine.length ? mine : offered.filter((r) => r.id === DEFAULT_RESORT_ID);
}
