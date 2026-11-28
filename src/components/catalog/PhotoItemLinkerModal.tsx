"use client";

// ==================== PHOTO ITEM LINKER MODAL ====================
// Two tabs (27 Nov 2026). "Add to items" (the default) finds your collection
// items, wishes and packing items and moves the photo onto the ones picked
// (src/lib/photo-attach.ts): before, it found none of them, so an unlinked
// photo couldn't go into the Collection. "Tag a park place" is what this
// window always did, below.
// Multi-select variant of TripPhotoLocationPicker — that component fires
// onSelect once and closes, right for placing a photo during import. This
// one presents a checklist so a standalone (TripPhoto) photo can be linked
// to more than one item at once from the Catalog Photo Gallery. Searches the
// same two sources (static park-data catalog + this trip's custom Places)
// via the shared useTripCustomPlaces hook, so both pickers stay consistent.

import { useState, useMemo } from "react";
import { useParkData } from "@/hooks/use-park-data";
import { useAttachTargets, type AttachChoice } from "@/hooks/use-attach-targets";
import { MAX_ITEM_PHOTOS, type AttachTarget } from "@/lib/photo-attach";
import { useTripCustomPlaces, TYPE_ICONS, type LocationMatch } from "@/components/publish/TripPhotoLocationPicker";

interface PhotoItemLinkerModalProps {
  tripId: string;
  initialParkDataIds: string[];
  initialWishIds: string[];
  onConfirm: (parkDataIds: string[], wishIds: string[]) => void;
  /** Moves the photo onto these items (Add to items). */
  onAddToItems: (targets: AttachTarget[]) => void;
  onClose: () => void;
}

type LinkTab = "items" | "places";

export default function PhotoItemLinkerModal({
  tripId,
  initialParkDataIds,
  initialWishIds,
  onConfirm,
  onAddToItems,
  onClose,
}: PhotoItemLinkerModalProps) {
  const [tab, setTab] = useState<LinkTab>("items");
  const targets = useAttachTargets();
  const [picked, setPicked] = useState<Map<string, AttachChoice>>(new Map());
  const keyOf = (t: AttachTarget) => `${t.kind}:${t.id}`;
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

  const itemMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? targets.filter((t) => t.name.toLowerCase().includes(q) || t.kindLabel.toLowerCase().includes(q)) : targets;
    return list.slice(0, 80);
  }, [targets, search]);

  const togglePicked = (t: AttachChoice) => setPicked((prev) => {
    const next = new Map(prev);
    if (next.has(keyOf(t))) next.delete(keyOf(t)); else next.set(keyOf(t), t);
    return next;
  });

  const tabButton = (value: LinkTab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => setTab(value)}
      className="text-xs px-3 py-1.5 rounded-full cursor-pointer"
      style={{
        backgroundColor: tab === value ? "var(--color-gold)" : "var(--color-surface-raised)",
        color: tab === value ? "var(--color-bg-deep)" : "var(--color-text-muted)",
      }}
    >
      {label}
    </button>
  );

  const checkbox = (checked: boolean) => (
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
  );

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
        role="dialog"
        aria-modal="true"
        aria-label="Link photo"
      >
        <div className="p-4 pb-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: "var(--color-heading)" }}>
            Link photo
          </h2>
          <div className="flex gap-2 mb-3" role="tablist">
            {tabButton("items", "Add to items")}
            {tabButton("places", "Tag a park place")}
          </div>
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search"
            placeholder={tab === "items" ? "Search your collection, wishes, packing…" : "Search rides, shows, dining, places…"}
            className="w-full rounded-lg px-3 py-2 text-xs outline-none border"
            style={{
              backgroundColor: "var(--color-surface-raised)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-border-input)",
            }}
          />
        </div>

        {tab === "items" && (
          <div className="flex-1 overflow-y-auto p-2">
            <p className="text-[10px] px-3 pb-2" style={{ color: "var(--color-text-dim)" }}>
              The photo moves onto the items you pick (up to {MAX_ITEM_PHOTOS} photos an item).
            </p>
            {itemMatches.map((t) => {
              const checked = picked.has(keyOf(t));
              const full = t.photoCount >= MAX_ITEM_PHOTOS;
              return (
                <button
                  key={keyOf(t)}
                  type="button"
                  onClick={() => togglePicked(t)}
                  disabled={full && !checked}
                  aria-pressed={checked}
                  className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg hover:brightness-110 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: checked ? "color-mix(in srgb, var(--color-gold) 12%, transparent)" : "transparent" }}
                >
                  {checkbox(checked)}
                  <span className="min-w-0">
                    <span className="block text-xs truncate" style={{ color: "var(--color-text-primary)" }}>{t.name}</span>
                    <span className="block text-[10px] truncate" style={{ color: "var(--color-text-dim)" }}>
                      {t.kindLabel}{full ? ` · ${MAX_ITEM_PHOTOS} photos already` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
            {itemMatches.length === 0 && (
              <p className="text-xs text-center py-6" style={{ color: "var(--color-text-dim)" }}>No matches.</p>
            )}
          </div>
        )}

        {tab === "places" && <div className="flex-1 overflow-y-auto p-2">
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
                {checkbox(checked)}
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
        </div>}

        <div className="p-4 pt-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
            {tab === "items" ? `${picked.size} picked` : `${totalSelected} linked`}
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
            {tab === "items" ? (
              <button
                type="button"
                disabled={picked.size === 0}
                onClick={() => onAddToItems([...picked.values()].map(({ kind, id, name }) => ({ kind, id, name })))}
                className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
              >
                {picked.size > 1 ? `Add to ${picked.size} items` : "Add to item"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConfirm([...parkDataIds], [...wishIds])}
                className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
