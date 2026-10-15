"use client";

// ==================== NEW PLACE FORM ====================
// A name and a tap-to-pin map for a custom Place that isn't in the park
// catalog (a parade viewing spot, a meeting point). Shared by both park
// catalog lists: Preview's Add to Day › Park catalog › Places
// (CatalogPicker) and the Plan page's catalog Places tab (CatalogBrowser).
// Reports the name and the pinned point; the caller decides what to add.

import dynamic from "next/dynamic";
import type { PickedPoint } from "./PlacePickerMap";

const PlacePickerMap = dynamic(() => import("./PlacePickerMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-xs" style={{ color: "var(--color-text-dim)" }}>
      Loading map…
    </div>
  ),
});

export default function NewPlaceForm({ name, point, onChange }: {
  name: string;
  point: PickedPoint | null;
  onChange: (name: string, point: PickedPoint | null) => void;
}) {
  const where = point
    ? point.parkLand ? `${point.parkLand.land} · ${point.parkLand.park}` : "Outside the parks"
    : "Tap the map to drop a pin";
  return (
    <div className="flex flex-col gap-2 px-3 pb-2 flex-1 min-h-0 overflow-y-auto">
      <input
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value, point)}
        placeholder="Place name, e.g. Our parade viewing spot"
        aria-label="New place name"
        maxLength={80}
        autoFocus
        className="w-full text-sm rounded-lg px-3 py-1.5 outline-none shrink-0"
        style={{ backgroundColor: "var(--color-surface-sunken)", border: "1px solid var(--color-border-input)", color: "var(--color-text-primary)" }}
      />
      {/* Fixed height: Leaflet sizes to 100% of its parent, which needs a
          definite height — a flex-grown box resolves to 0 here. */}
      <div className="rounded-lg overflow-hidden h-[260px] shrink-0" style={{ border: "1px solid var(--color-border-subtle)" }}>
        <PlacePickerMap value={point} onPick={(p) => onChange(name, p)} />
      </div>
      <p className="text-[11px] shrink-0" style={{ color: point ? "var(--color-text-secondary)" : "var(--color-text-dim)" }}>
        📍 {where}
      </p>
    </div>
  );
}
