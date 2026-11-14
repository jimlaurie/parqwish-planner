"use client";

// ==================== COLLECTION FILTERS ====================
// The filters above the Collection page's List and Gallery views: names and
// tags by search, choice and yes/no fields by value, numbers by a range, with
// "3 of 12 items" and Clear filters. Each view keeps its own (they reset when
// the category changes, as the views are keyed by it). The rules are shared
// with Pal (@shared/collection-table).

import { useMemo, useState } from "react";
import { ACCENT } from "./CollectionFormParts";
import type { CollectionItem } from "@/lib/db";
import { activeCollectionFilters, filterCollectionItems, type CollectionFieldFilter } from "@shared/collection-table";
import type { CollectionFieldDef } from "@shared/types/collection";

type Filters = Record<string, CollectionFieldFilter>;

export interface CollectionFiltering {
  filters: Filters;
  setFilters: (f: Filters) => void;
  query: string;
  setQuery: (q: string) => void;
  /** The items that pass, in the order given. */
  kept: CollectionItem[];
  active: boolean;
  clear: () => void;
}

/** The filter state for one view of `items`. */
export function useCollectionFilters(items: CollectionItem[]): CollectionFiltering {
  const [filters, setFilters] = useState<Filters>({});
  const [query, setQuery] = useState("");
  const kept = useMemo(() => filterCollectionItems(items, filters, query), [items, filters, query]);
  const active = activeCollectionFilters(filters) > 0 || query.trim() !== "";
  return { filters, setFilters, query, setQuery, kept, active, clear: () => { setFilters({}); setQuery(""); } };
}

const CONTROL_CLASS = "rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-gold)]";
const CONTROL_STYLE = { backgroundColor: "var(--color-bg-card)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-subtle)" };

/** "12 items", or "3 of 12 items" and Clear filters while filtering. `noun` for what's counted. */
export function CollectionFilterCount({ filtering, total, shown, noun }: {
  filtering: CollectionFiltering; total: number; shown?: number; noun?: [string, string];
}) {
  const [one, many] = noun ?? ["item", "items"];
  const count = shown ?? filtering.kept.length;
  return (
    <div className="flex items-center gap-3 mb-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
      <span aria-live="polite">{filtering.active ? `${count} of ${total} ${many}` : `${total} ${total === 1 ? one : many}`}</span>
      {filtering.active && (
        <button type="button" onClick={filtering.clear} className="font-semibold cursor-pointer" style={{ color: ACCENT }}>Clear filters</button>
      )}
    </div>
  );
}

export function CollectionFilterBar({ fields, filtering }: { fields: CollectionFieldDef[]; filtering: CollectionFiltering }) {
  const { filters, setFilters, query, setQuery } = filtering;
  const set = (id: string, filter: CollectionFieldFilter | undefined) => {
    const next = { ...filters };
    if (filter) next[id] = filter; else delete next[id];
    setFilters(next);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="Filter items">
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names and tags"
        aria-label="Search names and tags" className={`${CONTROL_CLASS} w-56`} style={CONTROL_STYLE} />
      {fields.map((def) => {
        if (def.type === "choice") return <ChoiceFilter key={def.id} def={def} filter={filters[def.id]} onChange={(f) => set(def.id, f)} />;
        if (def.type === "boolean") return <YesNoFilter key={def.id} def={def} filter={filters[def.id]} onChange={(f) => set(def.id, f)} />;
        if (def.type === "number") return <RangeFilter key={def.id} def={def} filter={filters[def.id]} onChange={(f) => set(def.id, f)} />;
        return null;
      })}
    </div>
  );
}

const ANY = "__any";

function ChoiceFilter({ def, filter, onChange }: { def: CollectionFieldDef; filter?: CollectionFieldFilter; onChange: (f?: CollectionFieldFilter) => void }) {
  const value = filter?.type === "choice" ? filter.value : ANY;
  return (
    <select value={value} aria-label={`Filter by ${def.name}`} className={CONTROL_CLASS} style={CONTROL_STYLE}
      onChange={(e) => onChange(e.target.value === ANY ? undefined : { type: "choice", value: e.target.value })}>
      <option value={ANY}>{def.name}: any</option>
      {(def.choices ?? []).map((c) => <option key={c} value={c}>{def.name}: {c}</option>)}
      <option value="">{def.name}: left blank</option>
    </select>
  );
}

function YesNoFilter({ def, filter, onChange }: { def: CollectionFieldDef; filter?: CollectionFieldFilter; onChange: (f?: CollectionFieldFilter) => void }) {
  const value = filter?.type === "boolean" ? (filter.value ? "yes" : "no") : ANY;
  return (
    <select value={value} aria-label={`Filter by ${def.name}`} className={CONTROL_CLASS} style={CONTROL_STYLE}
      onChange={(e) => onChange(e.target.value === ANY ? undefined : { type: "boolean", value: e.target.value === "yes" })}>
      <option value={ANY}>{def.name}: any</option>
      <option value="yes">{def.name}: yes</option>
      <option value="no">{def.name}: no</option>
    </select>
  );
}

/** A number box's value, or undefined when it's empty or not a number. */
function parseEnd(text: string): number | undefined {
  const n = Number(text);
  return text.trim() === "" || !Number.isFinite(n) ? undefined : n;
}

function RangeFilter({ def, filter, onChange }: { def: CollectionFieldDef; filter?: CollectionFieldFilter; onChange: (f?: CollectionFieldFilter) => void }) {
  const range = filter?.type === "number" ? filter : { type: "number" as const };
  const update = (min: number | undefined, max: number | undefined) =>
    onChange(min === undefined && max === undefined ? undefined : { type: "number", min, max });
  const box = `${CONTROL_CLASS} w-20`;
  return (
    <div className="flex items-center gap-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
      <span>{def.name}{def.unit ? ` (${def.unit})` : ""}</span>
      <input type="number" inputMode="decimal" value={range.min ?? ""} placeholder="from" aria-label={`${def.name} from`}
        onChange={(e) => update(parseEnd(e.target.value), range.max)} className={box} style={CONTROL_STYLE} />
      <span aria-hidden="true">–</span>
      <input type="number" inputMode="decimal" value={range.max ?? ""} placeholder="to" aria-label={`${def.name} to`}
        onChange={(e) => update(range.min, parseEnd(e.target.value))} className={box} style={CONTROL_STYLE} />
    </div>
  );
}
