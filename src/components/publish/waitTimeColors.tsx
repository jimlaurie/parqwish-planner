// ==================== WAIT TIME COLOR SCALE ====================
// Split out from WaitTimeHeatMap.tsx so the color scale and legend can be
// statically imported by the page (heat-map/page.tsx) without pulling
// react-leaflet/leaflet.css into the SSR bundle — that module is
// leaflet-heavy and must only ever be reached via WaitTimeHeatMap's own
// `dynamic(..., { ssr: false })` import, or `next build`'s prerender fails
// with "window is not defined". A plain type-only import doesn't trigger
// this (erased at compile time), but a real value import does.

// Raw hex, not CSS vars — the dots this feeds are Leaflet/SVG fill
// attributes, which don't resolve CSS custom properties (same documented
// gotcha as ResortMask.tsx). The legend below uses the same hex values so
// it can't drift from the dots it's explaining.
export const WAIT_TIME_BUCKETS = [
  { label: "Short (≤20 min)", color: "#4CAF50", max: 20 },
  { label: "Moderate (21–45 min)", color: "#FFC107", max: 45 },
  { label: "Long (46+ min)", color: "#F44336", max: Infinity },
] as const;

export function waitColor(median: number): string {
  for (const bucket of WAIT_TIME_BUCKETS) {
    if (median <= bucket.max) return bucket.color;
  }
  return WAIT_TIME_BUCKETS[WAIT_TIME_BUCKETS.length - 1].color;
}

export function WaitTimeLegend() {
  return (
    <div
      className="absolute bottom-3 left-3 z-[1000] flex flex-col gap-1.5 px-3 py-2 rounded-lg text-xs shadow-lg"
      style={{
        backgroundColor: "var(--color-surface-raised)",
        border: "1px solid var(--color-border-subtle)",
        color: "var(--color-text-secondary)",
      }}
    >
      {WAIT_TIME_BUCKETS.map((bucket) => (
        <div key={bucket.label} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: bucket.color, border: "1px solid #fff" }}
          />
          <span>{bucket.label}</span>
        </div>
      ))}
    </div>
  );
}
