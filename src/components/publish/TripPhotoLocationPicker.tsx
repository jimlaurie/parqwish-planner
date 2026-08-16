"use client";

// ==================== TRIP PHOTO LOCATION PICKER ====================
// Search across every location this app knows about — the static park-data
// catalog (rides/shows/dining/shops/places) AND this trip's own custom
// Places (place-tagged wishes with real GPS, created via mobile's "Create
// Place") — so a PhotoPass shot from "Space Mountain" or from a custom spot
// you added on-site both resolve the same way: type a name, pick a match,
// done. Modeled on ParkDataAutocomplete's dropdown/portal pattern.

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParkData } from "@/hooks/use-park-data";
import type { ParkDataItem } from "@/lib/park-data";
import db from "@/lib/db";

const TYPE_ICONS: Record<ParkDataItem["type"] | "custom", string> = {
  ride: "🎢", show: "🎭", dining: "🍽️", shop: "🛍️", place: "📍", custom: "⭐",
};

export interface LocationMatch {
  label: string;
  sublabel: string;
  latitude: number;
  longitude: number;
  linkedParkDataId?: string;
  linkedWishId?: string;
}

export default function TripPhotoLocationPicker({
  tripId,
  onSelect,
  placeholder = "Search rides, shows, dining, places…",
}: {
  tripId: string;
  onSelect: (match: LocationMatch) => void;
  placeholder?: string;
}) {
  const { items: catalogItems } = useParkData();
  const [customPlaces, setCustomPlaces] = useState<LocationMatch[]>([]);
  const [value, setValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const selections = await db.tripWishSelections.where("tripId").equals(tripId).toArray();
      const wishes = await db.wishes.bulkGet(selections.map((s) => s.wishId));
      if (cancelled) return;
      const places: LocationMatch[] = [];
      for (const w of wishes) {
        if (w && w.latitude != null && w.longitude != null) {
          places.push({ label: w.title, sublabel: "Your added place", latitude: w.latitude, longitude: w.longitude, linkedWishId: w.id });
        }
      }
      setCustomPlaces(places);
    })();
    return () => { cancelled = true; };
  }, [tripId]);

  const catalogMatches: LocationMatch[] = useMemo(
    () => catalogItems
      .filter((i) => i.latitude != null && i.longitude != null)
      .map((i) => ({
        label: `${TYPE_ICONS[i.type]} ${i.name}`,
        sublabel: `${i.park} · ${i.land}`,
        latitude: i.latitude!,
        longitude: i.longitude!,
        linkedParkDataId: i.id,
      })),
    [catalogItems]
  );

  const allLocations = useMemo(
    () => [...customPlaces.map((p) => ({ ...p, label: `${TYPE_ICONS.custom} ${p.label}` })), ...catalogMatches],
    [customPlaces, catalogMatches]
  );

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length === 0) return [];
    return allLocations.filter((l) => l.label.toLowerCase().includes(q) || l.sublabel.toLowerCase().includes(q)).slice(0, 40);
  }, [value, allLocations]);

  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (inputRef.current && !inputRef.current.contains(target) && dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (match: LocationMatch) => {
    setValue(match.label);
    setShowDropdown(false);
    onSelect(match);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value); setShowDropdown(true); updatePosition(); }}
        onFocus={() => { updatePosition(); setShowDropdown(true); }}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-xs outline-none border"
        style={{
          backgroundColor: "var(--color-bg-card)",
          color: "var(--color-text-primary)",
          borderColor: "var(--color-border-input)",
        }}
      />

      {showDropdown && matches.length > 0 && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed max-h-64 overflow-y-auto rounded-lg border shadow-xl"
            style={{
              top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width,
              backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border-subtle)",
              zIndex: 10001,
            }}
          >
            {matches.map((m, i) => (
              <button
                key={`${m.linkedParkDataId ?? m.linkedWishId}_${i}`}
                type="button"
                onClick={() => handleSelect(m)}
                className="w-full text-left px-3 py-2 hover:brightness-110 cursor-pointer transition-colors"
              >
                <p className="text-xs truncate" style={{ color: "var(--color-text-primary)" }}>{m.label}</p>
                <p className="text-[10px] truncate" style={{ color: "var(--color-text-dim)" }}>{m.sublabel}</p>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
