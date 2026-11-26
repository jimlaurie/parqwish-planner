// ==================== RESORT REGISTRY ====================
// Every resort the apps know about: its parks, time zone, ThemeParks.wiki
// ids, where its published data lives, and what it supports. The data is
// shared/data/resorts.json (copied to functions/resorts.json for the Cloud
// Functions, which can't import from shared/; a test keeps the two equal).
// See docs/multi-park-architecture.md.
//
// Disneyland Resort keeps its original park keys and its legacy data files
// (dataPath ""); other resorts use globally unique park keys and their own
// files under data/resorts/<id>/.

import registry from "../data/resorts.json";

export interface ParkConfig {
  /** Globally unique — the Planner's parkDataId is `${key}__${entityId}`. */
  key: string;
  name: string;
  shortName: string;
  themeparksWikiId?: string;
}

export interface ResortCapabilities {
  liveWaits: boolean;
  /** Operator-specific paid queue, or null when ThemeParks.wiki has no usable data. */
  paidQueues: "lightning_lane" | null;
  showtimes: boolean;
  /** Pal has a hand-drawn ParkMap for this resort. */
  drawnMap: boolean;
  /** collectWaitTimes records this resort's parks into BigQuery. */
  collectAnalytics: boolean;
}

/** live = in the apps; preview = dev/TestFlight only; hidden = backend only. */
export type ResortStatus = "live" | "preview" | "hidden";

export interface ResortConfig {
  id: string;
  name: string;
  shortName: string;
  /** IANA zone — dates, hours and analytics are in the resort's local time. */
  timezone: string;
  center: [number, number];
  themeparksWikiId: string;
  /** "" for the legacy Disneyland Resort files, else "resorts/<id>/". */
  dataPath: string;
  /** Gated theme parks. */
  parks: ParkConfig[];
  /** Non-gated areas: shopping districts, hotels. */
  areas: ParkConfig[];
  capabilities: ResortCapabilities;
  status: ResortStatus;
}

export const RESORTS: readonly ResortConfig[] = registry.resorts as ResortConfig[];

/** Trips without resortIds are Disneyland Resort trips. */
export const DEFAULT_RESORT_ID = "disneyland_resort";

export function getResort(id: string): ResortConfig | undefined {
  return RESORTS.find((r) => r.id === id);
}

/** The resort a park or area key belongs to. */
export function resortForPark(parkKey: string): ResortConfig | undefined {
  return RESORTS.find((r) => [...r.parks, ...r.areas].some((p) => p.key === parkKey));
}

/** The resort of a park item's id (`${parkKey}__${entityId}`), or undefined when it names no known park. */
export function resortOfParkDataId(parkDataId: string | undefined | null): ResortConfig | undefined {
  const parkKey = parkDataId?.split("__")[0];
  return parkKey ? resortForPark(parkKey) : undefined;
}

// ==================== TRIPS ====================

/** A trip's resort ids, known ones only, Disneyland Resort when it names none. */
export function tripResortIds(trip?: { resortIds?: string[] } | null): string[] {
  const known = (trip?.resortIds ?? []).filter((id) => !!getResort(id));
  return known.length ? known : [DEFAULT_RESORT_ID];
}

/** The resort a trip date is at: its pick (if the trip still visits it), else the trip's first. */
export function dayResortId(trip: { resortIds?: string[]; dayResorts?: Record<string, string> } | null | undefined, date: string): string {
  const ids = tripResortIds(trip);
  const picked = trip?.dayResorts?.[date];
  return picked && ids.includes(picked) ? picked : ids[0];
}

/**
 * The trip's dayResorts with `date` at `resortId`: a date at the trip's
 * first resort isn't listed (missing means the first), and an empty map is
 * undefined, so a trip that never changes a day carries no field.
 */
export function withDayResort(
  trip: { resortIds?: string[]; dayResorts?: Record<string, string> }, date: string, resortId: string,
): Record<string, string> | undefined {
  const next = { ...(trip.dayResorts ?? {}) };
  if (resortId === tripResortIds(trip)[0]) delete next[date];
  else next[date] = resortId;
  return Object.keys(next).length ? next : undefined;
}

/** Resorts shown in the apps; preview ones only when asked for (dev builds). */
export function visibleResorts(includePreview = false): ResortConfig[] {
  return RESORTS.filter((r) => r.status === "live" || (includePreview && r.status === "preview"));
}
