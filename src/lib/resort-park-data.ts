// ==================== RESORT PARK DATA ====================
// The Park Catalog's other resorts (behind RESORTS_AVAILABLE): their park
// data files and nightly ride stats, read live from Storage under the
// resort's dataPath (data/resorts/knotts/rides.json, published by the
// dland-wishes onResortDataUpdate and stats functions). Disneyland Resort
// goes through park-data.ts as before, with its bundled copies and caches.
//
// There are no deployed copies of other resorts' files yet, so a failed
// read is reported as a failure (the Catalog says so), never as an empty
// resort.

import { RESORTS, DEFAULT_RESORT_ID, getResort, type ResortConfig } from "@shared/constants/resorts";
import { RESORTS_AVAILABLE } from "@/lib/feature-flags";
import {
  FILES, LIVE_TIMEOUT_MS, fetchJson, fileToType, flattenParkData, getParkData,
  getRideReliabilityStats, getWaitTimeStats, liveUrl,
  type ParkDataItem, type RideReliabilityStats, type WaitTimeStats,
} from "@/lib/park-data";

/** The resorts the Park Catalog offers: only Disneyland Resort unless the flag is on. */
export function catalogResorts(): ResortConfig[] {
  if (!RESORTS_AVAILABLE) return RESORTS.filter((r) => r.id === DEFAULT_RESORT_ID);
  return [...RESORTS];
}

/** What the resort's paid line is called, for its rides' hasLL. */
const PAID_QUEUE_LABELS: Record<string, string> = {
  disneyland_resort: "Lightning Lane",
  knotts: "Fast Lane",
  universal_hollywood: "Universal Express",
};

export function paidQueueLabel(resortId: string): string {
  return PAID_QUEUE_LABELS[resortId] ?? "Paid line";
}

/** The resort's park and area names in registry order, for grouping the Catalog. */
export function resortParkNames(resort: ResortConfig): string[] {
  return [...resort.parks, ...resort.areas].map((p) => p.name);
}

// ==================== ITEMS ====================

const itemsByResort = new Map<string, Promise<ParkDataItem[]>>();

/**
 * A resort's catalog items. Kept in memory for the page's life once loaded;
 * a failed load is forgotten so the next switch tries again.
 */
export function getResortParkData(resortId: string): Promise<ParkDataItem[]> {
  if (resortId === DEFAULT_RESORT_ID) return getParkData();
  let pending = itemsByResort.get(resortId);
  if (!pending) {
    pending = loadResortParkData(resortId);
    pending.catch(() => itemsByResort.delete(resortId));
    itemsByResort.set(resortId, pending);
  }
  return pending;
}

async function loadResortParkData(resortId: string): Promise<ParkDataItem[]> {
  const resort = getResort(resortId);
  if (!resort) throw new Error(`Unknown resort ${resortId}`);
  const labels = Object.fromEntries([...resort.parks, ...resort.areas].map((p) => [p.key, p.name]));
  const results = await Promise.allSettled(FILES.map(async (file) => {
    const data = await fetchJson(liveUrl(`${resort.dataPath}${file}`), { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) });
    return flattenParkData(data as Parameters<typeof flattenParkData>[0], fileToType(file), labels);
  }));
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length === results.length) {
    throw new Error(`${resort.name}'s park data couldn't be loaded: ${String(failed[0].reason)}`);
  }
  failed.forEach((r) => console.error(`[ResortParkData] ${resortId}: a file failed:`, r.reason));
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

// ==================== RIDE STATS ====================

export interface ResortRideStats {
  waits: WaitTimeStats | null;
  reliability: RideReliabilityStats | null;
}

const statsByResort = new Map<string, Promise<ResortRideStats>>();

async function liveStats<T extends { rides?: unknown }>(resort: ResortConfig, file: string): Promise<T | null> {
  try {
    const data = await fetchJson(liveUrl(`${resort.dataPath}${file}`), { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) }) as T;
    if (!data?.rides) throw new Error("no rides in the file");
    return data;
  } catch (err) {
    console.error(`[ResortParkData] ${resort.id}: ${file} unavailable:`, err);
    return null;
  }
}

/** A resort's typical waits and reliability (null for a file that didn't load; rows then show no wait chips). */
export function getResortRideStats(resortId: string): Promise<ResortRideStats> {
  if (resortId === DEFAULT_RESORT_ID) {
    return Promise.all([getWaitTimeStats(), getRideReliabilityStats()]).then(([waits, reliability]) => ({ waits, reliability }));
  }
  let pending = statsByResort.get(resortId);
  if (!pending) {
    const resort = getResort(resortId);
    pending = resort
      ? Promise.all([
          liveStats<WaitTimeStats>(resort, "waitTimeStats.json"),
          liveStats<RideReliabilityStats>(resort, "rideReliabilityStats.json"),
        ]).then(([waits, reliability]) => ({ waits, reliability }))
      : Promise.resolve({ waits: null, reliability: null });
    statsByResort.set(resortId, pending);
  }
  return pending;
}
