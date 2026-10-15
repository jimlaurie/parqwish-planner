"use client";

// ==================== CATALOG PICKER ====================
// The "Park catalog" side of the Preview "Add to Day" modal: pick any ride,
// show, restaurant, shop, or place without first adding it on the Plan page,
// or pin a brand-new Place on the map. Selection-only — the modal decides
// what to do with the result (add to the trip's plan, then to the timeline).
// Every tab can hide items by status (closed, seasonal; CatalogStatusFilter).

import { useMemo, useState } from "react";
import { useParkData } from "@/hooks/use-park-data";
import CatalogStatusFilter, { useCatalogStatusFilter } from "@/components/CatalogStatusFilter";
import type { ParkDataItem } from "@/lib/park-data";
import type { PickedPoint } from "./PlacePickerMap";
import NewPlaceForm from "./NewPlaceForm";

const ACCENT = "var(--color-accent-preview)";


export type CatalogSelection =
  | { kind: "catalog"; item: ParkDataItem }
  | { kind: "newPlace"; name: string; point: PickedPoint };

type CatalogTab = ParkDataItem["type"];

const TABS: { id: CatalogTab; label: string; icon: string }[] = [
  { id: "ride", label: "Rides", icon: "🎢" },
  { id: "show", label: "Shows", icon: "🎭" },
  { id: "dining", label: "Dining", icon: "🍽️" },
  { id: "shop", label: "Shops", icon: "🛍️" },
  { id: "place", label: "Places", icon: "📍" },
];

const MAX_RESULTS = 60;

interface CatalogPickerProps {
  /** Park-data ids already on the trip's plan, shown as "In plan". */
  plannedParkDataIds: Set<string>;
  onSelectionChange: (selection: CatalogSelection | null) => void;
}

export default function CatalogPicker({ plannedParkDataIds, onSelectionChange }: CatalogPickerProps) {
  const { items, loading } = useParkData();
  const [tab, setTab] = useState<CatalogTab>("ride");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pinning, setPinning] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [point, setPoint] = useState<PickedPoint | null>(null);
  const { isShown } = useCatalogStatusFilter();

  const tabItems = useMemo(() => items.filter((i) => i.type === tab), [items, tab]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tabItems
      .filter(isShown)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.land.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tabItems, query, isShown]);

  const resetSelection = () => {
    setSelectedId(null);
    setPinning(false);
    onSelectionChange(null);
  };

  const pickItem = (item: ParkDataItem) => {
    const next = selectedId === item.id ? null : item.id;
    setSelectedId(next);
    setPinning(false);
    onSelectionChange(next ? { kind: "catalog", item } : null);
  };

  const updateNewPlace = (name: string, pinned: PickedPoint | null) => {
    setPlaceName(name);
    setPoint(pinned);
    onSelectionChange(name.trim() && pinned ? { kind: "newPlace", name: name.trim(), point: pinned } : null);
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--color-border-subtle)" }} role="tablist">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => { setTab(t.id); setQuery(""); resetSelection(); }}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium"
              style={{ color: active ? ACCENT : "var(--color-text-dim)", borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent" }}
            >
              <span aria-hidden="true" className="text-base">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="px-3 pt-2 shrink-0">
        {tab === "place" && (
          <button
            onClick={() => { setSelectedId(null); setPinning((v) => !v); onSelectionChange(null); setPoint(null); setPlaceName(""); }}
            aria-expanded={pinning}
            className="w-full mb-2 px-3 py-2 rounded-lg text-xs font-semibold text-left"
            style={{
              color: ACCENT,
              backgroundColor: `color-mix(in srgb, ${ACCENT} ${pinning ? 18 : 8}%, transparent)`,
              border: `1px dashed color-mix(in srgb, ${ACCENT} 50%, transparent)`,
            }}
          >
            {pinning ? "▾" : "+"} Pin a new place on the map
          </button>
        )}
        {!pinning && (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${TABS.find((t) => t.id === tab)?.label.toLowerCase()}…`}
            aria-label="Search the park catalog"
            className="w-full text-sm rounded-lg px-3 py-1.5 outline-none mb-1"
            style={{ backgroundColor: "var(--color-surface-sunken)", border: "1px solid var(--color-border-input)", color: "var(--color-text-primary)" }}
          />
        )}
        {!pinning && (
          <div className="mb-1">
            <CatalogStatusFilter items={tabItems} accent={ACCENT} onChange={resetSelection} />
          </div>
        )}
      </div>

      {pinning ? (
        <NewPlaceForm name={placeName} point={point} onChange={updateNewPlace} />
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-1 min-h-0 space-y-1">
          {loading && <p className="text-xs py-6 text-center" style={{ color: "var(--color-text-dim)" }}>Loading catalog…</p>}
          {!loading && results.length === 0 && (
            <p className="text-xs py-6 text-center" style={{ color: "var(--color-text-dim)" }}>No matches</p>
          )}
          {results.slice(0, MAX_RESULTS).map((item) => (
            <CatalogRow
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              planned={plannedParkDataIds.has(item.id)}
              onPick={() => pickItem(item)}
            />
          ))}
          {results.length > MAX_RESULTS && (
            <p className="text-[10px] py-2 text-center" style={{ color: "var(--color-text-dim)" }}>
              Showing {MAX_RESULTS} of {results.length} — search to narrow it down
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CatalogRow({ item, selected, planned, onPick }: { item: ParkDataItem; selected: boolean; planned: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      aria-pressed={selected}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-100"
      style={{
        backgroundColor: selected ? `color-mix(in srgb, ${ACCENT} 15%, transparent)` : "var(--color-surface-sunken)",
        border: selected ? `1px solid color-mix(in srgb, ${ACCENT} 40%, transparent)` : "1px solid transparent",
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: selected ? ACCENT : "var(--color-text-secondary)" }}>
          {item.name}
        </p>
        <p className="text-[10px] truncate" style={{ color: "var(--color-text-dim)" }}>
          {item.land} · {item.park}
          {item.status && item.status !== "operating" && <span style={{ color: "var(--color-error)" }}> · {item.status}</span>}
        </p>
      </div>
      {planned && !selected && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ color: "var(--color-text-dim)", border: "1px solid var(--color-border-subtle)" }}>
          In plan
        </span>
      )}
      {selected && <span className="text-sm shrink-0" style={{ color: ACCENT }}>✓</span>}
    </button>
  );
}
