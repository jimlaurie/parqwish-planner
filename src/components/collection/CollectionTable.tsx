"use client";

// ==================== COLLECTION TABLE ====================
// The Collection page's list view (dland-wishes docs/collections-design.md
// §3b, §7): one row per item in the category's current tab, a column for
// every field shown in its form (built-in and the user's own) plus the date,
// sorted by clicking a column (ascending, descending, then back to the tab's
// own order) and filtered above (CollectionFilterBar, shared with the
// Gallery view). A row opens its item. The sort and filter rules are shared
// with Pal (@shared/collection-table).

import { useMemo, useState } from "react";
import { CollectionOwnerDot, CollectionPhoto, type CollectionTileOwner } from "./CollectionTile";
import { ACCENT } from "./CollectionFormParts";
import { TICKET_COLORS } from "@/lib/constants";
import type { CollectionItem } from "@/lib/db";
import { collectionItemDate } from "@shared/collection-view";
import { collectionCellText, nextCollectionSort, sortCollectionItems, type CollectionSort } from "@shared/collection-table";
import { CollectionFilterBar, CollectionFilterCount, useCollectionFilters } from "./CollectionFilterBar";
import type { CollectionFieldDef, CollectionState } from "@shared/types/collection";

interface Props {
  /** The items in the tab, in the tab's own order. */
  items: CollectionItem[];
  fields: CollectionFieldDef[];
  icon: string;
  tab: CollectionState;
  onOpen: (item: CollectionItem) => void;
  /** Each item's owner for its dot, while the collection has several owners. */
  ownerOf?: (item: CollectionItem) => CollectionTileOwner | undefined;
}

export default function CollectionTable({ items, fields, icon, tab, onOpen, ownerOf }: Props) {
  const [sort, setSort] = useState<CollectionSort | null>(null);
  const filtering = useCollectionFilters(items);
  const rows = useMemo(
    () => (sort ? sortCollectionItems(filtering.kept, sort, fields) : filtering.kept),
    [filtering.kept, sort, fields],
  );

  return (
    <div>
      <CollectionFilterBar fields={fields} filtering={filtering} />
      <CollectionFilterCount filtering={filtering} total={items.length} />
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>No items match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--color-border-subtle)" }}>
          <table className="w-full text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
            <TableHead fields={fields} sort={sort} dateLabel={tab === "gone" ? "Went" : "Date"} onSort={(key) => setSort((s) => nextCollectionSort(s, key))} />
            <tbody>
              {rows.map((item) => <Row key={item.id} item={item} fields={fields} icon={icon} owner={ownerOf?.(item)} onOpen={() => onOpen(item)} />)}
            </tbody>
          </table>
        </div>
      )}
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

function Row({ item, fields, icon, owner, onOpen }: {
  item: CollectionItem; fields: CollectionFieldDef[]; icon: string; owner?: CollectionTileOwner; onOpen: () => void;
}) {
  const ticket = item.state === "want" && item.priority ? TICKET_COLORS[item.priority] : undefined;
  return (
    <tr onClick={onOpen} data-testid="collection-row" className="cursor-pointer hover:brightness-110"
      style={{ backgroundColor: "var(--color-bg-card)", borderTop: "1px solid var(--color-border-subtle)" }}>
      <td className="px-3 py-1.5">
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} className="flex items-center gap-2.5 text-left cursor-pointer min-w-40">
          <CollectionPhoto item={item} icon={icon} className="w-9 h-9 rounded-md shrink-0 text-lg" />
          <CollectionOwnerDot owner={owner} className="shrink-0" />
          <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.name || "Unnamed"}</span>
          {owner && <span className="sr-only">{owner.color ? `${owner.name}'s` : "shared"}</span>}
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
