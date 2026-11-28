"use client";

// GalleryPhotoPickerModal.tsx - pick photos for an item from the Photo
// Gallery (every photo in the catalog, as Catalog › Photos' All photos),
// instead of only from files (27 Nov 2026). Opened by PhotoPicker's
// "Gallery" button in the wish, packing and collection editors. A copy goes
// on the item; the photo stays where it was. Photos the item already has
// aren't offered.

import { useMemo, useState } from "react";
import { useAllTripPhotos, PHOTO_CATEGORY_CHIPS, type TripPhotoEntry } from "@/hooks/use-all-trip-photos";
import type { PhotoResolutions } from "@/lib/image-utils";

interface Props {
  /** The item's photos now, so they aren't offered again. */
  current: PhotoResolutions[];
  /** How many more the item can take. */
  room: number;
  onPick: (sets: PhotoResolutions[]) => void;
  onClose: () => void;
}

const setOf = (p: TripPhotoEntry): PhotoResolutions => ({ thumbnail: p.thumbnail, display: p.url, full: p.full });

export default function GalleryPhotoPickerModal({ current, room, onPick, onClose }: Props) {
  const { photos, loading } = useAllTripPhotos(null, "all");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  // Each photo once (the same image can be on two items), minus the item's own
  const offered = useMemo(() => {
    const have = new Set(current.flatMap((s) => [s.display, s.full]));
    const seen = new Set<string>();
    return photos.filter((p) => {
      if (have.has(p.url) || have.has(p.full) || seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });
  }, [photos, current]);

  const categories = useMemo(() => {
    const ids = new Set(offered.map((p) => p.categoryId));
    return PHOTO_CATEGORY_CHIPS.filter((c) => ids.has(c.id));
  }, [offered]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offered.filter((p) => (category === "all" || p.categoryId === category)
      && (!q || p.caption.toLowerCase().includes(q) || p.linkedItemTitle.toLowerCase().includes(q)));
  }, [offered, category, search]);

  const toggle = (id: string) => setPicked((prev) => {
    if (prev.includes(id)) return prev.filter((x) => x !== id);
    return prev.length >= room ? prev : [...prev, id];
  });

  const add = () => {
    const byId = new Map(offered.map((p) => [p.id, p]));
    onPick(picked.map((id) => byId.get(id)).filter((p): p is TripPhotoEntry => !!p).map(setOf));
  };

  const chip = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setCategory(id)}
      aria-pressed={category === id}
      className="text-xs px-3 py-1 rounded-full cursor-pointer whitespace-nowrap"
      style={{
        backgroundColor: category === id ? "color-mix(in srgb, var(--color-gold) 18%, transparent)" : "transparent",
        color: category === id ? "var(--color-gold)" : "var(--color-text-dim)",
        border: `1px solid ${category === id ? "var(--color-gold)" : "var(--color-border-subtle)"}`,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--color-overlay)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add from Photo Gallery"
        className="w-full max-w-2xl rounded-2xl flex flex-col"
        style={{ backgroundColor: "var(--color-bg-card)", maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-3 flex flex-col gap-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--color-heading)" }}>Add from Photo Gallery</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search photos"
            placeholder="Search by item…"
            className="w-full rounded-lg px-3 py-2 text-xs outline-none border"
            style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-primary)", borderColor: "var(--color-border-input)" }}
          />
          {categories.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {chip("all", "All")}
              {categories.map((c) => chip(c.id, `${c.icon} ${c.label}`))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loading photos…</p>}
          {!loading && shown.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: "var(--color-text-dim)" }}>
              {offered.length === 0 ? "No other photos in the gallery yet." : "No photos match."}
            </p>
          )}
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
            {shown.map((p) => {
              const on = picked.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  aria-label={`${p.caption || p.linkedItemTitle}${on ? ", picked" : ""}`}
                  className="relative rounded-lg overflow-hidden cursor-pointer text-left"
                  style={{ outline: on ? "3px solid var(--color-gold)" : "1px solid var(--color-border-subtle)", outlineOffset: on ? "-3px" : "-1px" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URI */}
                  <img src={p.thumbnail} alt="" className="w-full aspect-square object-cover" />
                  <span className="block text-[10px] px-1.5 py-1 truncate" style={{ color: "var(--color-text-secondary)", backgroundColor: "var(--color-surface-raised)" }}>
                    {p.categoryIcon} {p.caption || p.linkedItemTitle}
                  </span>
                  {on && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 pt-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
            {picked.length} picked{picked.length >= room ? ` · room for ${room}` : ""}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border-input)" }}>
              Cancel
            </button>
            <button type="button" onClick={add} disabled={picked.length === 0}
              className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>
              {picked.length > 1 ? `Add ${picked.length} photos` : "Add photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
