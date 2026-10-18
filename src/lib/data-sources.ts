// ==================== DATA SOURCES ====================
// Where each kind of data on screen came from: read live from Storage,
// included with this version by design ("bundled": rides, shops, places,
// typical weather), the deployed copy standing in for a live file that
// couldn't be read ("deployed", a fallback), a copy saved on this device
// ("cached"), or nothing ("failed"). Loaders report here (park-data.ts,
// weather-data.ts); the Play page lists them all, and pages that depend on
// one can say when it isn't live, so a fallback never passes for fresh data
// (dland-wishes docs/roadmap.md › "Fallbacks are visible"). Every fallback
// is also logged.

import { useSyncExternalStore } from "react";

export type SourceKind = "live" | "bundled" | "deployed" | "cached" | "failed";

export type SourceKey =
  | "parkData" | "shows" | "restaurants" | "showtimeHistory"
  | "waitTimeStats" | "rideReliability" | "weatherForecast" | "weatherNormals";

export interface DataSource {
  key: SourceKey;
  kind: SourceKind;
  /** When the data itself was made (the file's lastUpdated/generatedAt/fetchedAt), ISO; null if unknown */
  asOf: string | null;
  /** Why it isn't live, for the log and the Play page ("live copy unavailable") */
  detail?: string;
}

/** What each source is called on screen, in the order the Play page lists them. */
export const SOURCE_LABELS: Record<SourceKey, string> = {
  parkData: "Rides, shows, dining, shops and places",
  shows: "Showtimes",
  restaurants: "Dining links (View, Menu, Reserve)",
  showtimeHistory: "Showtime history (for later days)",
  waitTimeStats: "Typical waits",
  rideReliability: "Ride reliability",
  weatherForecast: "Weather forecast",
  weatherNormals: "Typical weather",
};

const sources = new Map<SourceKey, DataSource>();
const listeners = new Set<() => void>();
let snapshot: DataSource[] = [];

/** Records where a kind of data came from. Anything but "live" is logged. */
export function reportSource(source: DataSource): void {
  const prev = sources.get(source.key);
  if (prev && prev.kind === source.kind && prev.asOf === source.asOf && prev.detail === source.detail) return;
  sources.set(source.key, source);
  if (source.kind === "failed") {
    console.warn(`[data-sources] ${SOURCE_LABELS[source.key]}: couldn't be loaded${source.detail ? ` (${source.detail})` : ""}`);
  } else if (source.kind === "deployed") {
    console.warn(`[data-sources] ${SOURCE_LABELS[source.key]}: using the deployed copy${source.asOf ? ` from ${source.asOf}` : ""}${source.detail ? ` (${source.detail})` : ""}`);
  }
  snapshot = (Object.keys(SOURCE_LABELS) as SourceKey[]).map((k) => sources.get(k)).filter((s): s is DataSource => !!s);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: DataSource[] = [];

/** Every source reported so far, in display order. */
export function useDataSources(): DataSource[] {
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
}

/** One source, or undefined until its loader has reported. */
export function useDataSource(key: SourceKey): DataSource | undefined {
  return useDataSources().find((s) => s.key === key);
}

/** The date data was made, as "Oct 17, 6:00 AM" in park time (or "Oct 17" for a plain date); "" if unknown. */
export function formatAsOf(iso: string | null): string {
  if (!iso) return "";
  // A plain date ("2026-10-15") is that day, not midnight UTC (the 14th in Pacific time)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }
  const at = new Date(iso);
  if (isNaN(at.getTime())) return "";
  return at.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
}

/** "Live, updated Oct 17, 6:00 AM" / "Deployed copy from Oct 12, …" / "Couldn't be loaded". */
export function describeSource(source: DataSource): string {
  const when = formatAsOf(source.asOf);
  switch (source.kind) {
    case "live": return when ? `Live, updated ${when}` : "Live";
    case "bundled": return when ? `Included with this version, updated ${when}` : "Included with this version";
    case "cached": return when ? `Saved on this device, updated ${when}` : "Saved on this device";
    case "deployed": return `Copy deployed with the Planner${when ? `, from ${when}` : ""} (the live copy couldn't be loaded)`;
    case "failed": return "Couldn't be loaded";
  }
}

/** The short form for a note on the page that uses it: "Typical waits from Oct 10, 4:00 AM (the latest couldn't be loaded)". */
export function describeFallback(source: DataSource): string | null {
  const label = SOURCE_LABELS[source.key];
  if (source.kind === "failed") return `${label} couldn't be loaded right now`;
  if (source.kind !== "deployed") return null;
  const when = formatAsOf(source.asOf);
  return `${label}${when ? ` from ${when}` : ": an older copy"} (the latest couldn't be loaded)`;
}
