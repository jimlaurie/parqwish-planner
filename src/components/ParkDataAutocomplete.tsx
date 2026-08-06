"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParkData } from "@/hooks/use-park-data";
import { PARK_DATA_TYPE_TO_TAG, type ParkDataItem } from "@/lib/park-data";

const TYPE_ICONS: Record<ParkDataItem["type"], string> = {
  ride: "\u{1F3A2}",
  show: "\u{1F3AD}",
  dining: "\u{1F37D}\uFE0F",
  shop: "\u{1F6CD}\uFE0F",
  place: "\u{1F4CD}",
};

const TYPE_LABELS: Record<ParkDataItem["type"], string> = {
  ride: "Rides",
  show: "Shows",
  dining: "Dining",
  shop: "Shops",
  place: "Places",
};

const PAGE_SIZE = 30;

interface ParkDataAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: ParkDataItem) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function ParkDataAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search rides, shows, dining, places...",
  autoFocus,
}: ParkDataAutocompleteProps) {
  const { items, loading } = useParkData();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Type keyword aliases: allow searching by type name
  const TYPE_KEYWORDS: Record<string, ParkDataItem["type"]> = {
    ride: "ride", rides: "ride",
    show: "show", shows: "show",
    dining: "dining", restaurant: "dining", restaurants: "dining", food: "dining", eat: "dining", eats: "dining",
    shop: "shop", shops: "shop", shopping: "shop", store: "shop", stores: "shop",
    place: "place", places: "place", landmark: "place", statue: "place", viewpoint: "place", "photo spot": "place",
    character: "place", placard: "place", "guest services": "place", "meeting point": "place", "scenic area": "place",
  };

  // Filter: search on name, type, park, and land (returns ALL matches)
  const allMatches = useMemo(() => {
    if (value.trim().length < 1 || items.length === 0) return [];
    const q = value.toLowerCase().trim();

    // Check if query matches a type keyword
    const typeMatch = TYPE_KEYWORDS[q];

    const filtered = items.filter((item) => {
      // Type keyword match (e.g., "ride" → all rides)
      if (typeMatch && item.type === typeMatch) return true;
      // Name match
      if (item.name.toLowerCase().includes(q)) return true;
      // Park match
      if (item.park.toLowerCase().includes(q)) return true;
      // Land match
      if (item.land.toLowerCase().includes(q)) return true;
      return false;
    });

    // Sort by park, land, name for browsable results
    filtered.sort((a, b) => {
      if (a.park !== b.park) return a.park.localeCompare(b.park);
      if (a.land !== b.land) return a.land.localeCompare(b.land);
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [value, items]);

  // Paginated view of matches
  const suggestions = useMemo(
    () => allMatches.slice(0, displayLimit),
    [allMatches, displayLimit]
  );
  const hasMore = allMatches.length > displayLimit;

  // Group by type
  const grouped = useMemo(() => {
    const groups: Partial<Record<ParkDataItem["type"], ParkDataItem[]>> = {};
    for (const item of suggestions) {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type]!.push(item);
    }
    return groups;
  }, [suggestions]);

  // Update dropdown position relative to viewport
  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!showDropdown) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showDropdown, updatePosition]);

  const handleSelect = (item: ParkDataItem) => {
    onChange(item.name);
    setShowDropdown(false);
    onSelect?.(item);
  };

  const showSuggestions = showDropdown && suggestions.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setDisplayLimit(PAGE_SIZE);
            setShowDropdown(true);
            updatePosition();
          }}
          onFocus={() => {
            updatePosition();
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none
                     border border-white/10 focus:border-[var(--color-gold)]
                     transition-colors duration-200"
          style={{
            backgroundColor: "var(--color-bg-deep)",
            color: "var(--color-text-primary)",
          }}
          autoFocus={autoFocus}
        />
        {/* Search icon */}
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
          style={{ color: "var(--color-text-dim)" }}
        >
          {"\u{1F50D}"}
        </span>
      </div>

      {/* Status hint */}
      {loading && (
        <p
          className="text-[10px] mt-1"
          style={{ color: "var(--color-text-dim)" }}
        >
          Loading park data...
        </p>
      )}
      {!loading && items.length > 0 && value.length === 0 && (
        <p
          className="text-[10px] mt-1"
          style={{ color: "var(--color-text-dim)" }}
        >
          Search by name, type (ride, show, dining, shop), park, or land
        </p>
      )}

      {/* Portal-based dropdown (renders outside modal to avoid overflow clipping) */}
      {showSuggestions &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed max-h-80 overflow-y-auto rounded-lg border border-white/10 shadow-xl"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              backgroundColor: "var(--color-bg-card)",
              zIndex: 9999,
            }}
          >
            {(
              Object.entries(grouped) as [ParkDataItem["type"], ParkDataItem[]][]
            ).map(([type, typeItems]) => (
              <div key={type}>
                <div
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider sticky top-0"
                  style={{
                    backgroundColor: "var(--color-bg-card)",
                    color: "var(--color-text-dim)",
                  }}
                >
                  {TYPE_ICONS[type]} {TYPE_LABELS[type]}
                </div>
                {typeItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 cursor-pointer
                               transition-colors flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="text-[10px] truncate"
                        style={{ color: "var(--color-text-dim)" }}
                      >
                        {item.park} &middot; {item.land}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ))}
            {/* More button + count */}
            <div
              className="sticky bottom-0 border-t border-white/10 px-3 py-1.5 flex items-center justify-between"
              style={{ backgroundColor: "var(--color-bg-card)" }}
            >
              <span
                className="text-[10px]"
                style={{ color: "var(--color-text-dim)" }}
              >
                Showing {suggestions.length} of {allMatches.length}
              </span>
              {hasMore && (
                <button
                  onClick={() => setDisplayLimit((prev) => prev + PAGE_SIZE)}
                  className="text-xs font-medium px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer transition-colors"
                  style={{ color: "var(--color-gold)" }}
                >
                  More ({allMatches.length - suggestions.length} remaining)
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export { PARK_DATA_TYPE_TO_TAG };
