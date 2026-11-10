"use client";

// ==================== COLLECTION TABLE ====================
// The Collection page's list view (dland-wishes docs/collections-design.md
// §3b, §7): one row per item in the category's current tab, a column for
// every field shown in its form (built-in and the user's own) plus the date,
// sorted by clicking a column (ascending, descending, then back to the tab's
// own order) and filtered above: names and tags by search, choice and yes/no
// fields by value, numbers by a range. A row opens its item. The sort and
// filter rules are shared with Pal (@shared/collection-table).

import { useMemo, useState } from "react";
import { CollectionPhoto } from "./CollectionTile";
import { ACCENT } from "./CollectionFormParts";
import { TICKET_COLORS } from "@/lib/constants";
import type { CollectionItem } from "@/lib/db";
import { collectionItemDate } from "@shared/collection-view";
import {
  activeCollectionFilters, collectionCellText, filterCollectionItems, nextCollectionSort, sortCollectionItems,
  type CollectionFieldFilter, type CollectionSort,
} from "@shared/collection-table";
import type { CollectionFieldDef, CollectionState } from "@shared/types/collection";

interface Props {
  /** The items in the tab, in the tab's own order. */
  items: CollectionItem[];
  fields: CollectionFieldDef[];
  icon: string;
  tab: CollectionState;
  onOpen: (item: CollectionItem) => void;
}

type Filters = Record<string, CollectionFieldFilter>;

const CONTROL_CLASS = "rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-gold)]";
const CONTROL_STYLE = { backgroundColor: "var(--color-bg-card)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-subtle)" };

export default function CollectionTable({ items, fields, icon, tab, onOpen }: Props) {
  const [sort, setSort] = useState<CollectionSort | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const kept = filterCollectionItems(items, filters, query);
    return sort ? sortCollectionItems(kept, sort, fields) : kept;
  }, [items, filters, query, sort, fields]);
  const clear = () => { setFilters({}); setQuery(""); };
  const filtering = activeCollectionFilters(filters) > 0 || query.trim() !== "";

  return (
    <div>
      <FilterBar fields={fields} filters={filters} query={query} onFilters={setFilters} onQuery={setQuery} />
      <div className="flex items-center gap-3 mb-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        <span aria-live="polite">{filtering ? `${rows.length} of ${items.length} items` : `${items.length} ${items.length === 1 ? "item" : "items"}`}</span>
        {filtering && <button type="button" onClick={clear} className="font-semibold cursor-pointer" style={{ color: ACCENT }}>Clear filters</button>}
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>No items match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--color-border-subtle)" }}>
          <table className="w-full text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
            <TableHead fields={fields} sort={sort} dateLabel={tab === "gone" ? "Went" : "Date"} onSort={(key) => setSort((s) => nextCollectionSort(s, key))} />
            <tbody>
              {rows.map((item) => <Row key={item.id} item={item} fields={fields} icon={icon} onOpen={() => onOpen(item)} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== FILTERS ====================

function FilterBar({ fields, filters, query, onFilters, onQuery }: {
  fields: CollectionFieldDef[]; filters: Filters; query: string;
  onFilters: (f: Filters) => void; onQuery: (q: string) => void;
}) {
  const set = (id: string, filter: CollectionFieldFilter | undefined) => {
    const next = { ...filters };
    if (filter) next[id] = filter; else delete next[id];
    onFilters(next);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="Filter items">
      <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search names and tags"
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

// ==================== TABLE ====================

function TableHead({ fields, sort, dateLabel, onSort }: {
  fields: CollectionFieldDef[]; sort: CollectionSort | null; dateLabel: string; onSort: (key: string) => void;
}) {
  const columns = [{ key: "name", label: "Name" }, ...fields.map((f) => ({ key: f.id, label: f.name, numeric: f.type === "number" })), { key: "date", label: dateLabel }];
  return (
    <thead style={{ backgroundColor: "var(--color-surface-raised)" }}>
      <tr>
        {columns.map((col) => {
          const dir = sort?.key === col.key ? sort.dir : undefined;
          return (
            <th key={col.key} scope="col" aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
              className={`px-3 py-2 font-semibold whitespace-nowrap ${"numeric" in col && col.numeric ? "text-right" : "text-left"}`}>
              <button type="button" onClick={() => onSort(col.key)} className="inline-flex items-center gap-1 cursor-pointer"
                style={{ color: dir ? ACCENT : "var(--color-text-secondary)" }}>
                {col.label}<span aria-hidden="true" className="text-[10px] w-2">{dir === "asc" ? "▲" : dir === "desc" ? "▼" : ""}</span>
              </button>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function Row({ item, fields, icon, onOpen }: { item: CollectionItem; fields: CollectionFieldDef[]; icon: string; onOpen: () => void }) {
  const ticket = item.state === "want" && item.priority ? TICKET_COLORS[item.priority] : undefined;
  return (
    <tr onClick={onOpen} data-testid="collection-row" className="cursor-pointer hover:brightness-110"
      style={{ backgroundColor: "var(--color-bg-card)", borderTop: "1px solid var(--color-border-subtle)" }}>
      <td className="px-3 py-1.5">
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} className="flex items-center gap-2.5 text-left cursor-pointer min-w-40">
          <CollectionPhoto item={item} icon={icon} className="w-9 h-9 rounded-md shrink-0 text-lg" />
          <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.name || "Unnamed"}</span>
          {ticket && (
            <span className="px-1 rounded text-[11px] font-extrabold" style={{ backgroundColor: ticket.bg, border: `1px solid ${ticket.border}`, color: ticket.border }}>
              {item.priority}
            </span>
          )}
          {(item.quantity ?? 1) > 1 && <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>×{item.quantity}</span>}
        </button>
      </td>
      {fields.map((def) => (
        <td key={def.id} className={`px-3 py-1.5 whitespace-nowrap ${def.type === "number" ? "text-right" : ""}`} style={{ color: "var(--color-text-primary)" }}>
          {collectionCellText(def, item.details?.[def.id])}
        </td>
      ))}
      <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{collectionItemDate(item)}</td>
    </tr>
  );
}
