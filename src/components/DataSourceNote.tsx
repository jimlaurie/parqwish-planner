"use client";

// ==================== DATA SOURCE NOTE ====================
// A one-line note where a page depends on data that isn't live right now:
// the deployed copy standing in ("from Oct 12 (the live copy couldn't be
// loaded)") or nothing at all. Says nothing while the data is live, included
// with this version, or saved on this device (data-sources.ts).

import { describeFallback, SOURCE_LABELS, useDataSource, type SourceKey } from "@/lib/data-sources";

export default function DataSourceNote({ source, className = "" }: { source: SourceKey; className?: string }) {
  const s = useDataSource(source);
  const text = s ? describeFallback(s) : null;
  if (!s || !text) return null;
  return (
    <p role="note" aria-label={`${SOURCE_LABELS[source]} source`} className={`text-[11px] ${className}`}
       style={{ color: s.kind === "failed" ? "var(--color-error)" : "var(--color-warning)" }}>
      {s.kind === "failed" ? "⚠️" : "🕘"} {text}
    </p>
  );
}
