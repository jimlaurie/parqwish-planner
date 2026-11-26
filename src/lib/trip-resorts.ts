// ==================== TRIP RESORTS ====================
// Which resorts a trip visits (Trip.resortIds; dland-wishes
// docs/multi-park-architecture.md §7a). Missing means Disneyland Resort, so
// every trip from before multi-park keeps its meaning, and a trip that only
// visits Disneyland Resort is saved without the field. Pure; checked
// through the pages in tests/e2e/resorts.spec.ts.

import { RESORTS, DEFAULT_RESORT_ID, getResort, type ResortConfig } from "@shared/constants/resorts";

/** The trip's resort ids, known ones only, Disneyland Resort when it names none. */
export function tripResortIds(trip?: { resortIds?: string[] } | null): string[] {
  const known = (trip?.resortIds ?? []).filter((id) => !!getResort(id));
  return known.length ? known : [DEFAULT_RESORT_ID];
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
