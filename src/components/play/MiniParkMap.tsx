"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { DayItemRecord } from "@/lib/db";

// ==================== CONSTANTS ====================

const ACCENT = "var(--color-accent-preview)";

// Brand data — hex literals required for LAND_COLORS (stored per-land, not themed)
const LAND_COLORS: Record<string, string> = {
  "Main Street U.S.A.": "#C4785B",
  Tomorrowland: "#5B8FCC",
  Fantasyland: "#B87BC4",
  Frontierland: "#C49E5B",
  Adventureland: "#5BAF6B",
  "New Orleans Square": "#7B6BAF",
  "Bayou Country": "#8B6F47",
  "Mickey's Toontown": "#E87B8A",
  "Star Wars: Galaxy's Edge": "#4A6B7B",
  Hub: "#FFD700",
  "Buena Vista Street": "#C4785B",
  "Hollywood Land": "#CC5B5B",
  "Avengers Campus": "#5B5BCC",
  "San Fransokyo Square": "#CC8855",
  "Cars Land": "#CC7B3B",
  "Pixar Pier": "#5BC4C4",
  "Paradise Gardens Park": "#6BAF5B",
  "Grizzly Peak": "#7B8B5B",
  "West Downtown Disney": "#B89B6B",
  "East Downtown Disney": "#C4A870",
  "Disneyland Hotel": "#6B7BAF",
  "Disney's Grand Californian Hotel": "#8B6F47",
  "Pixar Place Hotel": "#5BC4C4",
  "Esplanade": "#7BAF7B",
  "Parking": "#8B8B8B",
};

const ABBREVS: Record<string, string> = {
  "Main Street U.S.A.": "Main St.",
  "Mickey's Toontown": "Toontown",
  "Star Wars: Galaxy's Edge": "Galaxy's Edge",
  "New Orleans Square": "New Orleans Sq",
  "Paradise Gardens Park": "Paradise Gdns",
  "San Fransokyo Square": "San Fransokyo",
  "Buena Vista Street": "Buena Vista St",
  "Disney's Grand Californian Hotel": "Grand Californian",
  "West Downtown Disney": "West DTD",
  "East Downtown Disney": "East DTD",
  "Pixar Place Hotel": "Pixar Place",
  "Disneyland Hotel": "DL Hotel",
};

// ==================== LAND LAYOUTS ====================

interface LandRect {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MapLayout {
  viewBox: string;
  hub: { cx: number; cy: number; r: number; name: string } | null;
  lands: LandRect[];
}

const DISNEYLAND_MAP: MapLayout = {
  viewBox: "0 0 300 230",
  hub: { cx: 185, cy: 113, r: 30, name: "Hub" },
  lands: [
    { name: "Star Wars: Galaxy's Edge", x: 0, y: 0, w: 70, h: 50 },
    { name: "Bayou Country", x: 0, y: 58, w: 70, h: 50 },
    { name: "New Orleans Square", x: 0, y: 116, w: 70, h: 55 },
    { name: "Frontierland", x: 75, y: 0, w: 70, h: 105 },
    { name: "Adventureland", x: 75, y: 113, w: 70, h: 58 },
    { name: "Fantasyland", x: 150, y: 0, w: 70, h: 75 },
    { name: "Main Street U.S.A.", x: 150, y: 150, w: 70, h: 80 },
    { name: "Mickey's Toontown", x: 225, y: 0, w: 70, h: 50 },
    { name: "Tomorrowland", x: 225, y: 58, w: 70, h: 110 },
  ],
};

const DCA_MAP: MapLayout = {
  viewBox: "0 0 300 230",
  hub: null,
  lands: [
    { name: "Avengers Campus", x: 0, y: 0, w: 95, h: 65 },
    { name: "Hollywood Land", x: 0, y: 73, w: 95, h: 65 },
    { name: "Cars Land", x: 100, y: 0, w: 95, h: 65 },
    { name: "San Fransokyo Square", x: 100, y: 73, w: 95, h: 65 },
    { name: "Buena Vista Street", x: 100, y: 146, w: 95, h: 75 },
    { name: "Pixar Pier", x: 200, y: 0, w: 95, h: 65 },
    { name: "Paradise Gardens Park", x: 200, y: 73, w: 95, h: 65 },
    { name: "Grizzly Peak", x: 200, y: 146, w: 95, h: 65 },
  ],
};

const DOWNTOWN_MAP: MapLayout = {
  viewBox: "0 0 300 215",
  hub: null,
  lands: [
    // Row 1 — Downtown Disney (split West/East)
    { name: "West Downtown Disney", x: 5, y: 10, w: 140, h: 55 },
    { name: "East Downtown Disney", x: 155, y: 10, w: 140, h: 55 },
    // Row 2 — Hotels
    { name: "Disneyland Hotel", x: 5, y: 75, w: 85, h: 55 },
    { name: "Disney's Grand Californian Hotel", x: 100, y: 75, w: 120, h: 55 },
    { name: "Pixar Place Hotel", x: 230, y: 75, w: 65, h: 55 },
    // Row 3 — Entry areas
    { name: "Esplanade", x: 5, y: 140, w: 170, h: 60 },
    { name: "Parking", x: 185, y: 140, w: 110, h: 60 },
  ],
};

type ParkTab = "dl" | "dca" | "dtd";

const PARK_TABS: { id: ParkTab; label: string; map: MapLayout }[] = [
  { id: "dl", label: "🏰 DL", map: DISNEYLAND_MAP },
  { id: "dca", label: "🎡 DCA", map: DCA_MAP },
  { id: "dtd", label: "🏨 DLR", map: DOWNTOWN_MAP },
];

// ==================== COMPONENT ====================

interface MiniParkMapProps {
  items: DayItemRecord[];
}

export default function MiniParkMap({ items }: MiniParkMapProps) {
  const [activePark, setActivePark] = useState<ParkTab>("dl");
  const { highlightedLand, setHighlightedLand } = useAppStore();

  // Count items per land
  const landCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const land = item.land;
      if (land) {
        counts[land] = (counts[land] || 0) + 1;
      }
    }
    return counts;
  }, [items]);

  const currentMap = PARK_TABS.find((t) => t.id === activePark)!.map;

  const highlightedSet = useMemo(() => {
    if (!highlightedLand) return new Set<string>();
    if (Array.isArray(highlightedLand)) return new Set(highlightedLand);
    return new Set([highlightedLand]);
  }, [highlightedLand]);

  const handleLandClick = (landName: string) => {
    if (highlightedLand === landName) {
      setHighlightedLand(null);
    } else {
      setHighlightedLand(landName);
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Park Tabs */}
      <div className="flex">
        {PARK_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePark(tab.id)}
            className="flex-1 py-1.5 text-[11px] font-semibold cursor-pointer transition-all"
            style={{
              backgroundColor:
                activePark === tab.id
                  ? `color-mix(in srgb, ${ACCENT} 20%, transparent)`
                  : "transparent",
              color:
                activePark === tab.id ? ACCENT : "var(--color-text-dim)",
              borderBottom:
                activePark === tab.id
                  ? `2px solid ${ACCENT}`
                  : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SVG Map */}
      <div className="px-2 py-1.5">
        <svg
          viewBox={currentMap.viewBox}
          className="w-full"
          style={{ maxHeight: "180px" }}
        >
          {/* Land rectangles */}
          {currentMap.lands.map((land) => {
            const color = LAND_COLORS[land.name] || "#888";
            const count = landCounts[land.name] || 0;
            const isHighlighted = highlightedSet.has(land.name);
            const abbrev = ABBREVS[land.name] || land.name;

            return (
              <g
                key={land.name}
                onClick={() => handleLandClick(land.name)}
                style={{ cursor: "pointer" }}
              >
                {/* Land shape */}
                <rect
                  x={land.x}
                  y={land.y}
                  width={land.w}
                  height={land.h}
                  rx={4}
                  fill={color}
                  opacity={isHighlighted ? 0.9 : count > 0 ? 0.6 : 0.35}
                  style={{
                    stroke: isHighlighted
                      ? "var(--color-gold)"
                      : "var(--color-border-strong)",
                  }}
                  strokeWidth={isHighlighted ? 2 : 0.5}
                />

                {/* Land name */}
                <text
                  x={land.x + land.w / 2}
                  y={land.y + land.h / 2 + (count > 0 ? -2 : 2)}
                  textAnchor="middle"
                  fill="white"
                  fontSize={land.w > 80 ? 8 : 7}
                  fontWeight="600"
                  opacity={0.9}
                  style={{ pointerEvents: "none" }}
                >
                  {abbrev}
                </text>

                {/* Count badge */}
                {count > 0 && (
                  <>
                    <circle
                      cx={land.x + land.w / 2}
                      cy={land.y + land.h / 2 + 10}
                      r={7}
                      style={{ fill: "var(--color-success)" }}
                    />
                    <text
                      x={land.x + land.w / 2}
                      y={land.y + land.h / 2 + 13}
                      textAnchor="middle"
                      fill="white"
                      fontSize={8}
                      fontWeight="bold"
                      style={{ pointerEvents: "none" }}
                    >
                      {count}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Hub (Disneyland only) */}
          {currentMap.hub && (() => {
            const hubCount = landCounts[currentMap.hub.name] || 0;
            const { cx, cy, r } = currentMap.hub;
            const isHubHighlighted = highlightedSet.has(currentMap.hub.name);
            return (
              <g
                onClick={() => handleLandClick(currentMap.hub!.name)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  opacity={isHubHighlighted ? 0.9 : hubCount > 0 ? 0.6 : 0.35}
                  style={{
                    fill: "var(--color-gold)",
                    stroke: isHubHighlighted
                      ? "var(--color-gold)"
                      : "var(--color-border-strong)",
                  }}
                  strokeWidth={isHubHighlighted ? 2 : 1}
                />
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="bold"
                  style={{ pointerEvents: "none", fill: "var(--color-bg-deep)" }}
                >
                  HUB
                </text>
                {hubCount > 0 && (
                  <>
                    <circle
                      cx={cx + r - 4}
                      cy={cy - r + 4}
                      r={7}
                      style={{ fill: "var(--color-success)" }}
                    />
                    <text
                      x={cx + r - 4}
                      y={cy - r + 7}
                      textAnchor="middle"
                      fill="white"
                      fontSize={8}
                      fontWeight="bold"
                      style={{ pointerEvents: "none" }}
                    >
                      {hubCount}
                    </text>
                  </>
                )}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Selected land indicator */}
      {highlightedLand && (
        <div
          className="flex items-center justify-between px-3 py-1.5 text-[10px]"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-gold) 10%, transparent)",
            borderTop: "1px solid color-mix(in srgb, var(--color-gold) 20%, transparent)",
          }}
        >
          <span style={{ color: "var(--color-gold)" }}>
            Showing: {Array.isArray(highlightedLand) ? highlightedLand.join(", ") : highlightedLand}
          </span>
          <button
            onClick={() => setHighlightedLand(null)}
            className="cursor-pointer underline"
            style={{ color: "var(--color-text-dim)" }}
          >
            Show All
          </button>
        </div>
      )}
    </div>
  );
}
