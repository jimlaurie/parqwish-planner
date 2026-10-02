"use client";

// ==================== PACKING CATALOG PANEL ====================
// Prepare's right-hand column on wide screens, mirroring Plan's park-catalog
// panel: everything in your own packing catalog for the categories chosen
// on the left (and their sub-categories), with a thumbnail, and a one-click
// "+ Pack" / "✓ Packing ×" toggle for this trip. Ensembles that contain
// items of those categories can be added in one go.

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type PackingItem, type PackingType } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { useEnsembles } from "@/hooks/use-ensembles";
import { PACKING_TABS, TICKET_COLORS } from "@/lib/constants";
import { matchesSubcategory, packingThumbnail, type SubcategoryFilter } from "@/lib/packing-subcategories";

const ACCENT = "var(--color-accent-prepare)";

interface PackingCatalogPanelProps {
  types: PackingType[];
  subcategories: SubcategoryFilter;
  onAdd: (itemId: string) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}

/** Every catalog item of the given types, flagged if it's on this trip. */
function usePackingCatalog(types: PackingType[]) {
  const { currentTripId } = useAppStore();
  const key = types.join(",");
  return useLiveQuery(async () => {
    if (!currentTripId) return [];
    const [items, selections] = await Promise.all([
      db.packingItems.where("type").anyOf(types).toArray(),
      db.tripPackingSelections.where("tripId").equals(currentTripId).toArray(),
    ]);
    const onTrip = new Set(selections.map((s) => s.itemId));
    return items.map((item) => ({ item, onTrip: onTrip.has(item.id) }));
  }, [currentTripId, key]); // `key` stands in for `types` (a new array each render)
}

export default function PackingCatalogPanel({ types, subcategories, onAdd, onRemove }: PackingCatalogPanelProps) {
  const rows = usePackingCatalog(types);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? [])
      .filter(({ item }) => matchesSubcategory(item, subcategories))
      .filter(({ item }) => !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q))
      .sort((a, b) => Number(a.onTrip) - Number(b.onTrip) || a.item.name.localeCompare(b.item.name));
  }, [rows, subcategories, search]);

  const run = async (id: string, action: (id: string) => Promise<void>) => {
    setPendingId(id);
    try { await action(id); } finally { setPendingId(null); }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 text-sm font-semibold mb-2 shrink-0" style={{ color: ACCENT }}>
        <span>🧳 Add from your Catalog</span>
        <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>({rows?.length ?? 0})</span>
      </div>
      <div
        className="rounded-xl border flex flex-col flex-1 min-h-0"
        style={{ backgroundColor: "var(--color-bg-card)", borderColor: "var(--color-border-subtle)" }}
      >
        <div className="p-3 shrink-0 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your catalog…"
            aria-label="Search your packing catalog"
            className="w-full text-sm rounded-full px-4 py-2 outline-none"
            style={{ backgroundColor: "var(--color-surface-sunken)", border: "1px solid var(--color-border-input)", color: "var(--color-text-primary)" }}
          />
          <EnsembleChips types={types} />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-1.5">
          {rows === undefined && <p className="text-xs text-center py-6" style={{ color: "var(--color-text-dim)" }}>Loading catalog…</p>}
          {rows !== undefined && visible.length === 0 && (
            <p className="text-xs text-center py-6 px-4" style={{ color: "var(--color-text-dim)" }}>
              {search ? "No matches." : "Nothing in your catalog for these categories yet. Items you add with + Add New are saved here for future trips."}
            </p>
          )}
          {visible.map(({ item, onTrip }) => (
            <CatalogRow
              key={item.id}
              item={item}
              onTrip={onTrip}
              pending={pendingId === item.id}
              onAdd={() => run(item.id, onAdd)}
              onRemove={() => run(item.id, onRemove)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== ROW ====================

export function PackingThumb({ item, size = 40 }: { item: PackingItem; size?: number }) {
  const src = packingThumbnail(item);
  const icon = PACKING_TABS.find((t) => t.id === item.type)?.icon;
  return (
    <div
      className="shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size, backgroundColor: "var(--color-surface-sunken)", border: "1px solid var(--color-border-subtle)" }}
    >
      {src
        // eslint-disable-next-line @next/next/no-img-element -- local data URI thumbnails
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : <span aria-hidden="true" style={{ fontSize: size * 0.45, opacity: 0.6 }}>{icon}</span>}
    </div>
  );
}

function CatalogRow({ item, onTrip, pending, onAdd, onRemove }: {
  item: PackingItem; onTrip: boolean; pending: boolean; onAdd: () => void; onRemove: () => void;
}) {
  const ticket = TICKET_COLORS[item.priority as keyof typeof TICKET_COLORS];
  return (
    <div
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
      style={{
        backgroundColor: onTrip ? `color-mix(in srgb, ${ACCENT} 8%, transparent)` : "var(--color-surface-sunken)",
        borderLeft: onTrip ? `3px solid ${ACCENT}` : "3px solid transparent",
      }}
    >
      <PackingThumb item={item} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: onTrip ? ACCENT : "var(--color-text-primary)" }}>{item.name}</p>
        <p className="text-[10px] truncate" style={{ color: "var(--color-text-dim)" }}>
          {item.category}
          {ticket && <span className="ml-1.5 font-bold" style={{ color: ticket.border }}>· {item.priority}</span>}
        </p>
      </div>
      {onTrip ? (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${ACCENT} 18%, transparent)`, color: ACCENT }}>
            ✓ Packing
          </span>
          <button
            onClick={onRemove}
            disabled={pending}
            aria-label={`Remove ${item.name} from this trip`}
            title="Remove from this trip"
            className="flex items-center justify-center w-5 h-5 rounded-full text-[11px] cursor-pointer opacity-50 hover:opacity-100 disabled:cursor-not-allowed"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)", color: "var(--color-error)" }}
          >
            {pending ? "…" : "×"}
          </button>
        </div>
      ) : (
        <button
          onClick={onAdd}
          disabled={pending}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 cursor-pointer hover:brightness-110 active:scale-95 disabled:cursor-not-allowed"
          style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)", opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "Adding…" : "+ Pack"}
        </button>
      )}
    </div>
  );
}

// ==================== ENSEMBLES ====================

function EnsembleChips({ types }: { types: PackingType[] }) {
  const { ensembles, addEnsembleToTrip } = useEnsembles();
  const { currentTripId } = useAppStore();
  const [adding, setAdding] = useState<string | null>(null);
  const relevant = ensembles.filter((e) => e.items.some((i) => types.includes(i.type)));
  if (relevant.length === 0 || !currentTripId) return null;

  const add = async (id: string) => {
    setAdding(id);
    try { await addEnsembleToTrip(id, currentTripId); } finally { setAdding(null); }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
      <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--color-text-dim)" }}>Ensembles</span>
      {relevant.map((e) => (
        <button
          key={e.id}
          onClick={() => add(e.id)}
          disabled={adding === e.id}
          title={`Add everything in “${e.name}” to this trip`}
          className="text-[11px] px-2.5 py-1 rounded-full cursor-pointer hover:brightness-110 disabled:opacity-60"
          style={{ color: ACCENT, border: `1px solid color-mix(in srgb, ${ACCENT} 45%, transparent)` }}
        >
          {adding === e.id ? "Adding…" : `+ ${e.name}`}
        </button>
      ))}
    </div>
  );
}
