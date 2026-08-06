"use client";

import { useEffect, useMemo, useState } from "react";
import { useParkData } from "@/hooks/use-park-data";
import { PARK_LABELS, getLandConfig, type LandConfigEntry } from "@/lib/park-data";

interface ParkLandSelectorProps {
  park: string;
  land: string;
  onParkChange: (park: string) => void;
  onLandChange: (land: string) => void;
}

const parkKeys = Object.keys(PARK_LABELS);

// Reverse lookup: display label (e.g. "Disneyland Resort") → park key (e.g. "disneyland_resort")
const labelToParkKey: Record<string, string> = {
  ...Object.fromEntries(Object.entries(PARK_LABELS).map(([key, label]) => [label, key])),
  // Backward compat: wishes stored before hotels consolidation used individual hotel names as park labels
  "Disney's Grand Californian Hotel": "hotels",
  "Disneyland Hotel": "hotels",
  "Pixar Place Hotel": "hotels",
};

export default function ParkLandSelector({
  park,
  land,
  onParkChange,
  onLandChange,
}: ParkLandSelectorProps) {
  const { items: parkData } = useParkData();
  const [landConfig, setLandConfig] = useState<Record<string, LandConfigEntry>>({});

  useEffect(() => {
    getLandConfig().then(setLandConfig);
  }, []);

  // Lands for selected park: prefer the canonical admin-managed list (landConfig),
  // falling back to lands derived from park data entities if no config entry exists.
  const landOptions = useMemo(() => {
    if (!park) return [];

    const parkKey = labelToParkKey[park];
    const configLands = parkKey ? landConfig[parkKey]?.lands : undefined;
    if (configLands && configLands.length > 0) {
      return configLands;
    }

    const lands = new Set<string>();
    for (const item of parkData) {
      if (item.park === park && item.land) {
        lands.add(item.land);
      }
    }
    return Array.from(lands).sort();
  }, [parkData, park, landConfig]);

  const selectStyle = {
    backgroundColor: "var(--color-bg-deep)",
    color: "var(--color-text-primary)",
  };

  return (
    <div className="flex gap-2">
      <select
        value={park}
        onChange={(e) => {
          onParkChange(e.target.value);
          onLandChange("");
        }}
        aria-label="Park"
        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none
                   border border-white/10 focus:border-[var(--color-gold)]
                   transition-colors duration-200 appearance-none cursor-pointer"
        style={selectStyle}
      >
        <option value="">Park...</option>
        {parkKeys.map((key) => (
          <option key={key} value={PARK_LABELS[key]}>
            {PARK_LABELS[key]}
          </option>
        ))}
      </select>

      <select
        value={land}
        onChange={(e) => onLandChange(e.target.value)}
        disabled={!park || landOptions.length === 0}
        aria-label="Land"
        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none
                   border border-white/10 focus:border-[var(--color-gold)]
                   transition-colors duration-200 appearance-none cursor-pointer
                   disabled:opacity-40"
        style={selectStyle}
      >
        <option value="">Land...</option>
        {landOptions.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
