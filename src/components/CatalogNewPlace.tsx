"use client";

// ==================== PIN A NEW PLACE (PLAN CATALOG) ====================
// The Plan page catalog's Places tab: name a spot that isn't in the park
// catalog, pin it on the map, and add it to the trip's plan as a Place wish
// (the same as Preview's Add to Day › Park catalog › Pin a new place, minus
// putting it on a day). The form itself is play/NewPlaceForm.tsx.

import { useState } from "react";
import NewPlaceForm from "@/components/play/NewPlaceForm";
import type { PickedPoint } from "@/components/play/PlacePickerMap";

interface CatalogNewPlaceProps {
  accent: string;
  /** Adds the place to the plan; resolves once it's saved. */
  onAdd: (name: string, point: PickedPoint) => Promise<void>;
  onCancel: () => void;
}

export default function CatalogNewPlace({ accent, onAdd, onCancel }: CatalogNewPlaceProps) {
  const [name, setName] = useState("");
  const [point, setPoint] = useState<PickedPoint | null>(null);
  const [saving, setSaving] = useState(false);
  const ready = !!name.trim() && !!point && !saving;

  const add = async () => {
    if (!ready || !point) return;
    setSaving(true);
    try {
      await onAdd(name.trim(), point);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col shrink-0 pt-1">
      <NewPlaceForm name={name} point={point} onChange={(n, p) => { setName(n); setPoint(p); }} />
      <div className="flex items-center justify-end gap-2 px-3 pb-3 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={add}
          disabled={!ready}
          title={ready ? undefined : "Name the place and tap the map to pin it"}
          className="px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
          style={{ backgroundColor: accent, color: "var(--color-bg-deep)" }}
        >
          {saving ? "Adding…" : "+ Add to plan"}
        </button>
      </div>
    </div>
  );
}
