"use client";

// ==================== PHOTO ITEM LINKER MODAL ====================
// Multi-select variant of TripPhotoLocationPicker — that component fires
// onSelect once and closes, right for placing a photo during import. This
// one presents a checklist so a standalone (TripPhoto) photo can be linked
// to more than one item at once from the Catalog Photo Gallery. Searches the
// same two sources (static park-data catalog + this trip's custom Places)
// via the shared useTripCustomPlaces hook, so both pickers stay consistent.

import { useState, useMemo } from "react";
import { useParkData } from "@/hooks/use-park-data";
import { useTripCustomPlaces, TYPE_ICONS, type LocationMatch } from "@/components/publish/TripPhotoLocationPicker";

interface PhotoItemLinkerModalProps {
  tripId: string;
  initialParkDataIds: string[];
  initialWishIds: string[];
  onConfirm: (parkDataIds: string[], wishIds: string[]) => void;
  onClose: () => void;
}

export default function PhotoItemLinkerModal({
  tripId,
  initialParkDataIds,
  initialWishIds,
  onConfirm,
  onClose,
}: PhotoItemLinkerModalProps) {
  const { items: catalogItems } = useParkData();
  const customPlaces = useTripCustomPlaces(tripId);
  const [search, setSearch] = useState("");
  const [parkDataIds, setParkDataIds] = useState(new Set(initialParkDataIds));
  const [wishIds, setWishIds] = useState(new Set(initialWishIds));

  const candidates: LocationMatch[] = useMemo(() => {
    const catalog: LocationMatch[] = catalogItems
      .filter((i) => i.latitude != null && i.longitude != null)
      .map((i) => ({
        label: `${TYPE_ICONS[i.type]} ${i.name}`,
        sublabel: `${i.park} · ${i.land}`,
        latitude: i.latitude!,
        longitude: i.longitude!,
        linkedParkDataId: i.id,
      }));
    const custom = customPlaces.map((p) => ({ ...p, label: `${TYPE_ICONS.custom} ${p.label}` }));
    return [...custom, ...catalog];
  }, [catalogItems, customPlaces]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates.slice(0, 60);
    return candidates.filter((c) => c.label.toLowerCase().includes(q) || c.sublabel.toLowerCase().includes(q)).slice(0, 60);
  }, [candidates, search]);

  const toggle = (c: LocationMatch) => {
    if (c.linkedParkDataId) {
      setParkDataIds((prev) => {
        const next = new Set(prev);
        if (next.has(c.linkedParkDataId!)) next.delete(c.linkedParkDataId!);
        else next.add(c.linkedParkDataId!);
        return next;
      });
    } else if (c.linkedWishId) {
      setWishIds((prev) => {
        const next = new Set(prev);
        if (next.has(c.linkedWishId!)) next.delete(c.linkedWishId!);
        else next.add(c.linkedWishId!);
        return next;
      });
    }
  };

  const isChecked = (c: LocationMatch) =>
    (c.linkedParkDataId && parkDataIds.has(c.linkedParkDataId)) ||
    (c.linkedWishId && wishIds.has(c.linkedWishId)) ||
    false;

  const totalSelected = parkDataIds.size + wishIds.size;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--color-overlay)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl flex flex-col"
        style={{ backgroundColor: "var(--color-bg-card)", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: "var(--color-heading)" }}>
            Link photo to items
          </h2>
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rides, shows, dining, places…"
            className="w-full rounded-lg px-3 py-2 text-xs outline-none border"
            style={{
              backgroundColor: "var(--color-surface-raised)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-border-input)",
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((c, i) => {
            const checked = isChecked(c);
            return (
              <button
                key={`${c.linkedParkDataId ?? c.linkedWishId}_${i}`}
                type="button"
                onClick={() => toggle(c)}
                className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg hover:brightness-110 cursor-pointer transition-colors"
                style={{ backgroundColor: checked ? "color-mix(in srgb, var(--color-gold) 12%, transparent)" : "transparent" }}
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 border text-[10px]"
                  style={{
                    borderColor: checked ? "var(--color-gold)" : "var(--color-border-input)",
                    backgroundColor: checked ? "var(--color-gold)" : "transparent",
                    color: "var(--color-bg-deep)",
                  }}
                >
                  {checked ? "✓" : ""}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs truncate" style={{ color: "var(--color-text-primary)" }}>{c.label}</span>
                  <span className="block text-[10px] truncate" style={{ color: "var(--color-text-dim)" }}>{c.sublabel}</span>
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: "var(--color-text-dim)" }}>
              No matches.
            </p>
          )}
        </div>

        <div className="p-4 pt-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
            {totalSelected} linked
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border-input)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm([...parkDataIds], [...wishIds])}
              className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
