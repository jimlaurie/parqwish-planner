"use client";

// ==================== DATA SOURCE LIST ====================
// The Play page's list of where each kind of data came from this session
// (data-sources.ts), loading each so the list is complete.

import { useEffect } from "react";
import { describeSource, SOURCE_LABELS, useDataSources, type SourceKind } from "@/lib/data-sources";
import { getParkData, getRideReliabilityStats, getShowtimeHistory, getWaitTimeStats } from "@/lib/park-data";
import { getWeather } from "@/lib/weather-data";

const DOT: Record<SourceKind, string> = {
  live: "var(--color-success)",
  bundled: "var(--color-success)",
  cached: "var(--color-success)",
  deployed: "var(--color-warning)",
  failed: "var(--color-error)",
};

export default function DataSourceList() {
  const sources = useDataSources();
  useEffect(() => {
    // Each reports its source as it loads; failures are reported, not thrown
    void Promise.allSettled([getParkData(), getShowtimeHistory(), getWaitTimeStats(), getRideReliabilityStats(), getWeather()]);
  }, []);
  if (sources.length === 0) return null;
  return (
    <ul aria-label="Where the data comes from" className="mt-4 space-y-1.5">
      {sources.map((s) => (
        <li key={s.key} data-testid={`source-${s.key}`} className="flex items-start gap-2 text-xs">
          <span aria-hidden="true" className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOT[s.kind] }} />
          <span>
            <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{SOURCE_LABELS[s.key]}</span>{" "}
            <span style={{ color: s.kind === "failed" ? "var(--color-error)" : s.kind === "deployed" ? "var(--color-warning)" : "var(--color-text-muted)" }}>
              {describeSource(s)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
