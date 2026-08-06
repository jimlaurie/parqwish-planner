"use client";

import { useMemo, useState } from "react";
import { useParkData } from "@/hooks/use-park-data";
import { useTripWishes } from "@/hooks/use-trip-wishes";
import type { ParkDataItem } from "@/lib/park-data";

const ACCENT = "var(--color-accent-plan)";

export default function PlacesCatalogSection() {
  const { items, loading } = useParkData();
  const { allWishes, addWish } = useTripWishes();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const places = useMemo(
    () => items.filter((item) => item.type === "place"),
    [items]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const place of places) {
      if (place.category) set.add(place.category);
    }
    return Array.from(set).sort();
  }, [places]);

  const filteredPlaces = useMemo(() => {
    if (!categoryFilter) return places;
    return places.filter((place) => place.category === categoryFilter);
  }, [places, categoryFilter]);

  const groupedByPark = useMemo(() => {
    const groups: Record<string, ParkDataItem[]> = {};
    for (const place of filteredPlaces) {
      if (!groups[place.park]) groups[place.park] = [];
      groups[place.park].push(place);
    }
    return groups;
  }, [filteredPlaces]);

  const addedParkDataIds = useMemo(
    () => new Set(allWishes.map((w) => w.parkDataId).filter(Boolean)),
    [allWishes]
  );

  const handleAddPlace = async (place: ParkDataItem) => {
    await addWish({
      title: place.name,
      tags: ["place"],
      priority: "B",
      parkDataId: place.id,
      parkDataName: place.name,
      park: place.park,
      land: place.land,
    });
  };

  if (loading || places.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold cursor-pointer
                   transition-colors hover:opacity-80 mb-2"
        style={{ color: ACCENT }}
      >
        <span>{expanded ? "▼" : "▶"}</span>
        <span>{"\u{1F4CD}"} Browse Places</span>
        <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
          ({places.length})
        </span>
      </button>

      {expanded && (
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          {/* Category filter chips */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              <button
                onClick={() => setCategoryFilter(null)}
                className="text-xs px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                style={{
                  backgroundColor: !categoryFilter
                    ? ACCENT
                    : "var(--color-surface-raised)",
                  color: !categoryFilter ? "var(--color-bg-deep)" : "var(--color-text-muted)",
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className="text-xs px-2.5 py-1 rounded-full cursor-pointer transition-colors capitalize"
                  style={{
                    backgroundColor:
                      categoryFilter === cat ? ACCENT : "var(--color-surface-raised)",
                    color:
                      categoryFilter === cat ? "var(--color-bg-deep)" : "var(--color-text-muted)",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Places grouped by park */}
          <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
            {Object.entries(groupedByPark).map(([park, parkPlaces]) => (
              <div key={park}>
                <h4
                  className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  {park}
                </h4>
                <div className="flex flex-col gap-1">
                  {parkPlaces.map((place) => {
                    const alreadyAdded = addedParkDataIds.has(place.id);
                    return (
                      <div
                        key={place.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg"
                        style={{ backgroundColor: "var(--color-surface-sunken)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm truncate"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {"\u{1F4CD}"} {place.name}
                          </p>
                          <p
                            className="text-[10px] truncate"
                            style={{ color: "var(--color-text-dim)" }}
                          >
                            {place.land}
                            {place.category ? ` · ${place.category}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddPlace(place)}
                          disabled={alreadyAdded}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0
                                     transition-all duration-150 cursor-pointer disabled:cursor-default"
                          style={{
                            backgroundColor: alreadyAdded ? "transparent" : ACCENT,
                            color: alreadyAdded ? "var(--color-text-dim)" : "var(--color-bg-deep)",
                            border: alreadyAdded ? "1px solid var(--color-border-default)" : "none",
                          }}
                        >
                          {alreadyAdded ? "✓ Added" : "+ Plan"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Custom place creation placeholder */}
          <div
            className="mt-3 px-3 py-2.5 rounded-lg border border-dashed flex items-center justify-between gap-2"
            style={{ borderColor: "var(--color-border-default)" }}
          >
            <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
              Don&apos;t see a place? Custom place creation is coming soon.
            </p>
            <button
              disabled
              className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 cursor-default opacity-50"
              style={{
                backgroundColor: "var(--color-surface-raised)",
                color: "var(--color-text-dim)",
              }}
            >
              + Custom Place
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
