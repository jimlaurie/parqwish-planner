"use client";

import { useState, useMemo } from "react";
import { useParkData } from "@/hooks/use-park-data";
import type { ParkDataItem } from "@/lib/park-data";

const TYPE_ICONS: Record<string, string> = {
  ride: "\u{1F3A2}",
  show: "\u{1F3AD}",
  dining: "\u{1F37D}\uFE0F",
  shop: "\u{1F6CD}\uFE0F",
};

interface ParkDataLinkerProps {
  linkedParkDataIds: string[];
  onChange: (ids: string[]) => void;
  filterTypes?: ParkDataItem["type"][];
}

export default function ParkDataLinker({
  linkedParkDataIds,
  onChange,
  filterTypes,
}: ParkDataLinkerProps) {
  const { items: allParkData, loading } = useParkData();
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");

  // Park data items filtered by type
  const availableItems = useMemo(() => {
    if (!filterTypes || filterTypes.length === 0) return allParkData;
    return allParkData.filter((item) => filterTypes.includes(item.type));
  }, [allParkData, filterTypes]);

  // Resolve linked items
  const linkedItems = useMemo(() => {
    if (linkedParkDataIds.length === 0) return [];
    const idSet = new Set(linkedParkDataIds);
    return allParkData.filter((item) => idSet.has(item.id));
  }, [allParkData, linkedParkDataIds]);

  // Search results
  const filteredResults = useMemo(() => {
    const excludeSet = new Set(linkedParkDataIds);
    let results = availableItems.filter((item) => !excludeSet.has(item.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.park.toLowerCase().includes(q) ||
          item.land.toLowerCase().includes(q)
      );
    } else {
      results = [];
    }
    return results.slice(0, 15);
  }, [availableItems, linkedParkDataIds, search]);

  const handleLink = (itemId: string) => {
    onChange([...linkedParkDataIds, itemId]);
  };

  const handleUnlink = (itemId: string) => {
    onChange(linkedParkDataIds.filter((id) => id !== itemId));
  };

  return (
    <div>
      {/* Linked item chips */}
      {linkedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {linkedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-accent-prepare) 12%, transparent)",
                color: "var(--color-accent-prepare)",
              }}
            >
              {TYPE_ICONS[item.type] ?? ""} {item.name}
              <span
                className="text-[10px] opacity-60 ml-0.5"
              >
                {item.park}
              </span>
              <button
                onClick={() => handleUnlink(item.id)}
                className="ml-0.5 hover:opacity-70 cursor-pointer"
                style={{ color: "var(--color-error)" }}
              >
                {"\u2715"}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Link button or search */}
      {showSearch ? (
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              loading
                ? "Loading..."
                : `Search ${availableItems.length} locations...`
            }
            className="w-full rounded-lg px-3 py-2 text-sm outline-none
                       border border-white/10 focus:border-[var(--color-gold)]
                       transition-colors duration-200 mb-2"
            style={{
              backgroundColor: "var(--color-bg-deep)",
              color: "var(--color-text-primary)",
            }}
            autoFocus
          />

          {filteredResults.length > 0 && (
            <div
              className="max-h-40 overflow-y-auto rounded-lg border border-white/10"
              style={{ backgroundColor: "var(--color-bg-deep)" }}
            >
              {filteredResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleLink(item.id)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 cursor-pointer
                             transition-colors flex items-center gap-2 text-sm"
                >
                  <span className="text-xs">{TYPE_ICONS[item.type] ?? ""}</span>
                  <span className="flex-1 min-w-0">
                    <span style={{ color: "var(--color-text-primary)" }}>
                      {item.name}
                    </span>
                    <span
                      className="block text-[10px]"
                      style={{ color: "var(--color-text-dim)" }}
                    >
                      {item.park} &middot; {item.land}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredResults.length === 0 && search.trim() && (
            <p
              className="text-xs py-2 text-center"
              style={{ color: "var(--color-text-dim)" }}
            >
              No locations found
            </p>
          )}

          <button
            onClick={() => {
              setShowSearch(false);
              setSearch("");
            }}
            className="mt-2 text-xs cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-muted)" }}
          >
            Done linking
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="text-xs cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5
                     rounded-full border border-dashed border-white/20"
          style={{ color: "var(--color-text-muted)" }}
        >
          + Link location
        </button>
      )}
    </div>
  );
}
