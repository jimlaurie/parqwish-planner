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
// it can't drift from the dots it's explaining. 12-step green-to-red
// gradient (ColorBrewer RdYlGn-11 reversed, extended with one extra dark
// red at the top end for the 71+ bucket) for finer-grained reading than a
// coarse 3-bucket scale would give.
export const WAIT_TIME_BUCKETS = [
  { label: "≤15", color: "#006837", max: 15 },
  { label: "16–20", color: "#1a9850", max: 20 },
  { label: "21–25", color: "#66bd63", max: 25 },
  { label: "26–30", color: "#a6d96a", max: 30 },
  { label: "31–35", color: "#d9ef8b", max: 35 },
  { label: "36–40", color: "#ffffbf", max: 40 },
  { label: "41–45", color: "#fee08b", max: 45 },
  { label: "46–50", color: "#fdae61", max: 50 },
  { label: "51–55", color: "#f46d43", max: 55 },
  { label: "56–60", color: "#d73027", max: 60 },
  { label: "61–70", color: "#a50026", max: 70 },
  { label: "71+", color: "#67001f", max: Infinity },
] as const;

export function waitColor(median: number): string {
  for (const bucket of WAIT_TIME_BUCKETS) {
    if (median <= bucket.max) return bucket.color;
  }
  return WAIT_TIME_BUCKETS[WAIT_TIME_BUCKETS.length - 1].color;
}

// Fixed white/dark-grey, not theme tokens — deliberate exception (same
// class as the raw-hex dot colors above): this sits directly on the map's
// Esri basemap tiles, which never theme with the rest of the app (confirmed
// — the tiles render identically in day/night mode), so a legend that
// switched to a dark surface in night mode would go semi-transparent onto
// still-light map tiles instead of staying legible.
export function WaitTimeLegend() {
  return (
    <div
      className="absolute bottom-3 left-3 z-[1000] grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 rounded-lg text-[11px] shadow-lg"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid rgba(0,0,0,0.15)",
        color: "#33333d",
      }}
    >
      {WAIT_TIME_BUCKETS.map((bucket) => (
        <div key={bucket.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: bucket.color, border: "1px solid #fff" }}
          />
          <span className="tabular-nums whitespace-nowrap">{bucket.label} min</span>
        </div>
      ))}
    </div>
  );
}
