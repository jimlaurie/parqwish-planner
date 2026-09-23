"use client";

// ==================== RIDE RELIABILITY PAGE ====================
// Resort-wide breakdown analytics, sourced from the dland-wishes Cloud
// Function generateRideReliabilityStats (see park-data.ts's
// getRideReliabilityStats()). Like the Wait Time Heat Map, this has no
// trip/date dependency and is reached via the /preview/analytics gallery.
//
// The three metrics per ride — odds of a breakdown on a given day, average
// downtime per breakdown, and recovery/walk-off impact on wait times — were
// previously one-off analyses run by hand (scripts/analyze-wait-times.js in
// dland-wishes, and the "The Walk-Off Effect"/"The Odds of a Breakdown"
// blog posts). This is their first live-app home. A ride's average-downtime
// and odds figures are capped so a breakdown that never reopened before
// close doesn't look like it lasted into the next day — see the Cloud
// Function for the fix; nothing on this page needs to know about it.
//
// No sortable-table component exists anywhere in this codebase yet — built
// from scratch here with the app's established ad-hoc inline-style
// convention rather than introducing a table library for one page.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getRideReliabilityStats, type RideReliabilityRecovery, type RideReliabilityStats } from "@/lib/park-data";

const ACCENT = "var(--color-accent-preview)";

interface Row {
  id: string;
  rideName: string;
  park: string;
  oddsOfBreakdownPct: number;
  avgDowntimeMinutes: number | null;
  breakdownCount: number;
  recovery: RideReliabilityRecovery | null;
}

type SortKey =
  | "rideName" | "park" | "oddsOfBreakdownPct" | "avgDowntimeMinutes" | "breakdownCount"
  | "avgWaitBeforeDown" | "avgWaitRightAfterReopen" | "avgWaitPlus30min" | "avgDropImmediate";

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "rideName", label: "Ride" },
  { key: "park", label: "Park" },
  { key: "oddsOfBreakdownPct", label: "Odds of Breakdown", numeric: true },
  { key: "avgDowntimeMinutes", label: "Avg Downtime", numeric: true },
  { key: "breakdownCount", label: "Breakdowns", numeric: true },
  { key: "avgWaitBeforeDown", label: "Wait Before", numeric: true },
  { key: "avgWaitRightAfterReopen", label: "Right After", numeric: true },
  { key: "avgWaitPlus30min", label: "+30 min", numeric: true },
  { key: "avgDropImmediate", label: "Drop", numeric: true },
];

const PARK_LABELS: Record<string, string> = {
  disneyland: "Disneyland",
  californiaadventure: "DCA",
};

function getSortValue(row: Row, key: SortKey): string | number | null {
  switch (key) {
    case "rideName": return row.rideName;
    case "park": return row.park;
    case "oddsOfBreakdownPct": return row.oddsOfBreakdownPct;
    case "avgDowntimeMinutes": return row.avgDowntimeMinutes;
    case "breakdownCount": return row.breakdownCount;
    case "avgWaitBeforeDown": return row.recovery?.avgWaitBeforeDown ?? null;
    case "avgWaitRightAfterReopen": return row.recovery?.avgWaitRightAfterReopen ?? null;
    case "avgWaitPlus30min": return row.recovery?.avgWaitPlus30min ?? null;
    case "avgDropImmediate": return row.recovery?.avgDropImmediate ?? null;
  }
}

function compareRows(a: Row, b: Row, key: SortKey, dir: 1 | -1): number {
  const av = getSortValue(a, key);
  const bv = getSortValue(b, key);
  // Nulls (rides with no recovery data yet) always sort last, regardless of
  // direction — otherwise ascending sort puts them first, which reads as
  // "best" when it actually means "not enough data".
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
  return ((av as number) - (bv as number)) * dir;
}

function formatPct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}
function formatMin(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)} min`;
}

export default function RideReliabilityPage() {
  const router = useRouter();
  const [stats, setStats] = useState<RideReliabilityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("oddsOfBreakdownPct");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  useEffect(() => {
    getRideReliabilityStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo<Row[]>(() => {
    if (!stats) return [];
    return Object.entries(stats.rides).map(([id, r]) => ({
      id,
      rideName: r.rideName,
      park: r.park,
      oddsOfBreakdownPct: r.oddsOfBreakdownPct,
      avgDowntimeMinutes: r.avgDowntimeMinutes,
      breakdownCount: r.breakdownCount,
      recovery: r.recovery,
    }));
  }, [stats]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDir)),
    [rows, sortKey, sortDir]
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1) as 1 | -1);
    } else {
      setSortKey(key);
      // Name/park columns read more naturally A-Z first; every metric
      // column is more interesting highest-first.
      setSortDir(key === "rideName" || key === "park" ? 1 : -1);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-6xl">
        <div className="flex items-center gap-3 mb-2">
          <button type="button" onClick={() => router.push("/preview/analytics")}
            className="text-sm px-2 py-1 rounded cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}>
            ← Analytics
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <h1 className="text-base font-bold" style={{ color: "var(--color-heading)" }}>
              Ride Reliability
            </h1>
          </div>
        </div>

        <p className="text-xs mb-1" style={{ color: "var(--color-text-dim)" }}>
          Historical resort-wide breakdown data, not a live status board — useful for setting expectations, not for knowing what&rsquo;s down right now.
        </p>

        {stats && (
          <p className="text-[10px] mb-4" style={{ color: "var(--color-text-dim)" }}>
            Based on {stats.windowDays} days of data ({stats.windowStart} to {stats.windowEnd}) &middot; {sortedRows.length} rides shown &middot; a breakdown that never reopened before close is capped at that day&rsquo;s last reading, not carried into the next day.
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading…</span>
          </div>
        ) : !stats || sortedRows.length === 0 ? (
          <div className="flex items-center justify-center py-20 px-8 text-center">
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Reliability data isn&rsquo;t available yet — check back after tonight&rsquo;s update.
            </span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-xl" style={{ border: "1px solid var(--color-border-subtle)" }}>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-surface-sunken)" }}>
                  {COLUMNS.map((col) => {
                    const active = col.key === sortKey;
                    return (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className={`px-3 py-2 cursor-pointer select-none whitespace-nowrap font-semibold ${col.numeric ? "text-right" : "text-left"}`}
                        style={{ color: active ? ACCENT : "var(--color-text-secondary)" }}
                      >
                        {col.label}
                        {active && <span className="ml-1">{sortDir === 1 ? "↑" : "↓"}</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--color-surface-sunken) 45%, transparent)",
                      borderTop: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>{row.rideName}</td>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-text-dim)" }}>{PARK_LABELS[row.park] ?? row.park}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--color-text-primary)" }}>{formatPct(row.oddsOfBreakdownPct)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--color-text-primary)" }}>{formatMin(row.avgDowntimeMinutes)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--color-text-dim)" }}>{row.breakdownCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--color-text-dim)" }}>{formatMin(row.recovery?.avgWaitBeforeDown ?? null)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--color-text-dim)" }}>{formatMin(row.recovery?.avgWaitRightAfterReopen ?? null)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--color-text-dim)" }}>{formatMin(row.recovery?.avgWaitPlus30min ?? null)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--color-text-dim)" }}>{formatMin(row.recovery?.avgDropImmediate ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
