"use client";

// ==================== COLLECTION PAGE ====================
// The memorabilia collection (dland-wishes docs/collections-design.md §7):
// the categories switched on in the sidebar with their counts (Uncategorised
// too while it holds items), Have / Want / Trade tabs (Trade where the
// category trades, Gone once there's history), and the items in the
// category's layout. The category picker opens by itself on the first visit
// and from the invitation; the sidebar's "Categories" manages them and their
// fields (CollectionCategoriesModal); "+ Add" and "Add several" add items, and a tile
// opens its item (CollectionItemModal, CollectionBulkAddModal). Grid shows the
// category's own layout, List a sortable, filterable table of every field
// (CollectionTable); the choice is remembered. The rules are shared with Pal
// (@shared/collection-view). Hidden until Collections ship (lib/feature-flags.ts).

import { useEffect, useMemo, useRef, useState } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import CollectionCategoryPicker from "@/components/collection/CollectionCategoryPicker";
import CollectionTile, { type CollectionTileOwner } from "@/components/collection/CollectionTile";
import CollectionItemModal from "@/components/collection/CollectionItemModal";
import CollectionBulkAddModal from "@/components/collection/CollectionBulkAddModal";
import CollectionCategoriesModal from "@/components/collection/CollectionCategoriesModal";
import CollectionTable from "@/components/collection/CollectionTable";
import { useCollection } from "@/hooks/use-collection";
import { useUsers } from "@/hooks/use-users";
import { COLLECTIONS_AVAILABLE } from "@/lib/feature-flags";
import { useAppStore } from "@/lib/store";
import { useCollectionRestore } from "@/lib/collection-cloud";
import type { CollectionItem, CollectionSettings } from "@/lib/db";
import { collectionFormFields, type ResolvedCollectionCategory } from "@shared/collections";
import {
  COLLECTION_TAB_LABELS, collectionItemDate, collectionItemSummary, collectionStateCounts, collectionTabs,
  countCollectionItemsByCategory, emptyCollectionTabText, itemsForView, pickCollectionCategory, pickCollectionTab,
  viewCategories, visibleCollectionItems,
} from "@shared/collection-view";
import {
  COLLECTION_SHARED_OWNER, collectionOwnerChips, collectionOwnerOf, filterCollectionByOwner, orderCollectionTripUsers,
  pickCollectionOwnerFilter, type CollectionOwnerChip, type CollectionTripUser,
} from "@shared/collection-owners";
import type { CollectionLayout, CollectionState } from "@shared/types/collection";

const ACCENT = "var(--color-gold)";

/** Grid classes per layout: board is dense, shelf larger cards, list one row each. */
const GRID: Record<CollectionLayout, string> = {
  board: "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3",
  shelf: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
  list: "flex flex-col gap-2",
};

type OwnerOf = (item: CollectionItem) => CollectionTileOwner | undefined;

/** Each item's owner for its dot, only while the person filter shows (several owners). */
function ownerLookup(chips: CollectionOwnerChip[], users: CollectionTripUser[]): OwnerOf {
  if (!chips.length) return () => undefined;
  const byId = new Map(users.map((u) => [u.id, u]));
  return (item) => {
    const id = collectionOwnerOf(item);
    if (id === COLLECTION_SHARED_OWNER) return { name: "Shared" };
    const user = byId.get(id);
    return user ? { name: user.name, color: user.color } : undefined;
  };
}

export default function CollectionPage() {
  if (!COLLECTIONS_AVAILABLE) {
    return <p className="px-6 py-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>Collections aren&apos;t available yet.</p>;
  }
  return <Collection />;
}

function Collection() {
  const { settings, items: storedItems } = useCollection();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shownCategory, setShownCategory] = useState<string>();
  const [shownTab, setShownTab] = useState<CollectionState>();
  const [shownOwner, setShownOwner] = useState<string>();
  const currentUserId = useAppStore((s) => s.currentUserId);
  const { users: tripUsers } = useUsers();
  const [editor, setEditor] = useState<{ open: boolean; item?: CollectionItem }>({ open: false });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { collectionView, setCollectionView } = useAppStore();

  // The first visit opens the picker by itself, and closes it again if Cloud
  // Sync brings settings whose first visit was done on another device
  const firstVisit = settings ? !settings.firstRunDone : false;
  const autoOpened = useRef(false);
  useEffect(() => {
    if (firstVisit) { autoOpened.current = true; setPickerOpen(true); }
    else if (autoOpened.current) { autoOpened.current = false; setPickerOpen(false); }
  }, [firstVisit]);

  const allItems = useMemo(() => (settings ? itemsForView(settings, storedItems) : []), [settings, storedItems]);
  // The person filter (Everyone by default) shows once the items have two or more owners
  const users = useMemo(() => orderCollectionTripUsers(tripUsers.map((u) => ({ id: u.id, name: u.name, color: u.color }))), [tripUsers]);
  const ownerChips = useMemo(() => collectionOwnerChips(allItems, users), [allItems, users]);
  const owner = pickCollectionOwnerFilter(ownerChips, shownOwner);
  const items = useMemo(() => filterCollectionByOwner(allItems, owner), [allItems, owner]);
  const ownerOf = useMemo(() => ownerLookup(ownerChips, users), [ownerChips, users]);
  const categories = useMemo(() => (settings ? viewCategories(settings, storedItems) : []), [settings, storedItems]);
  const categoryId = pickCollectionCategory(categories.map((c) => c.id), shownCategory);
  const category = categories.find((c) => c.id === categoryId);
  const counts = useMemo(() => collectionStateCounts(items, categoryId ?? ""), [items, categoryId]);
  const tabs = category ? collectionTabs(category.trades, counts) : [];
  const tab = pickCollectionTab(tabs, shownTab);

  if (!settings) return null;

  const sidebar = (
    <CategorySidebar categories={categories} items={items} selected={categoryId} onSelect={setShownCategory}
      onEdit={() => setCategoriesOpen(true)} />
  );

  return (
    <SidebarLayout sidebar={sidebar} sidebarWidth={220}>
      <div className="px-6 py-8 max-w-5xl">
        <RestoreNote />
        {category ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h1 className="text-xl font-bold mr-auto" style={{ color: "var(--color-heading)" }}>
                <span aria-hidden="true">{category.icon}</span> {category.name}
              </h1>
              <ViewSwitch view={collectionView} onChange={setCollectionView} />
              <button onClick={() => setBulkOpen(true)} className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ color: ACCENT, border: `1px solid ${ACCENT}` }}>Add several</button>
              <button onClick={() => setEditor({ open: true })} className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>+ Add</button>
            </div>
            <OwnerFilter chips={ownerChips} selected={owner} onSelect={setShownOwner} />
            <StateTabs tabs={tabs} counts={counts} selected={tab} onSelect={setShownTab} />
            <ItemGrid settings={settings} items={items} category={category} tab={tab} view={collectionView} ownerOf={ownerOf}
              onOpen={(shown) => setEditor({ open: true, item: storedItems.find((i) => i.id === shown.id) ?? shown })} />
            <CollectionItemModal visible={editor.open} settings={settings} item={editor.item} defaultCategory={category.id}
              defaultState={tab} users={users} defaultOwner={currentUserId ?? undefined}
              onClose={() => setEditor((e) => ({ ...e, open: false }))} />
            <CollectionBulkAddModal visible={bulkOpen} settings={settings} defaultCategory={category.id} defaultState={tab}
              onClose={() => setBulkOpen(false)} />
          </>
        ) : (
          <Invitation onChoose={() => { autoOpened.current = false; setPickerOpen(true); }} />
        )}
      </div>
      <CollectionCategoryPicker visible={pickerOpen} settings={settings} onClose={() => setPickerOpen(false)} />
      <CollectionCategoriesModal visible={categoriesOpen} settings={settings} items={storedItems} onClose={() => setCategoriesOpen(false)} />
    </SidebarLayout>
  );
}

// ==================== PIECES ====================

function CategorySidebar({ categories, items, selected, onSelect, onEdit }: {
  categories: ResolvedCollectionCategory[]; items: CollectionItem[]; selected: string | undefined;
  onSelect: (id: string) => void; onEdit: () => void;
}) {
  const counts = useMemo(() => countCollectionItemsByCategory(items), [items]);
  return (
    <div className="flex flex-col h-full py-4">
      <h2 className="px-4 text-lg font-bold mb-4" style={{ color: "var(--color-heading)" }}>Collection</h2>
      <nav className="flex flex-col gap-0.5 px-2" aria-label="Collection categories">
        {categories.map((cat) => {
          const on = cat.id === selected;
          return (
            <button key={cat.id} onClick={() => onSelect(cat.id)} aria-current={on ? "page" : undefined}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              style={{
                color: on ? ACCENT : "var(--color-text-muted)",
                backgroundColor: on ? `color-mix(in srgb, ${ACCENT} 9%, transparent)` : "transparent",
                borderLeft: on ? `3px solid ${ACCENT}` : "3px solid transparent",
              }}>
              <span aria-hidden="true">{cat.icon}</span>
              <span className="flex-1">{cat.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: "var(--color-surface-raised)", color: on ? ACCENT : "var(--color-text-dim)" }}>
                {counts[cat.id] ?? 0}
              </span>
            </button>
          );
        })}
      </nav>
      <button onClick={onEdit} className="mx-4 mt-4 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer"
        style={{ color: ACCENT, border: `1px dashed ${ACCENT}` }}>
        Categories
      </button>
    </div>
  );
}

/** The person filter: Everyone, each Trip User who owns items, Shared. Hidden for one owner. */
function OwnerFilter({ chips, selected, onSelect }: { chips: CollectionOwnerChip[]; selected: string; onSelect: (id: string) => void }) {
  if (!chips.length) return null;
  return (
    <div role="group" aria-label="Whose items" className="flex flex-wrap gap-2 mb-3">
      {chips.map((chip) => {
        const on = chip.id === selected;
        return (
          <button key={chip.id} type="button" onClick={() => onSelect(chip.id)} aria-pressed={on}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors"
            style={{
              color: on ? "var(--color-bg-deep)" : "var(--color-text-primary)",
              backgroundColor: on ? ACCENT : "var(--color-surface-raised)",
              border: `1px solid ${on ? ACCENT : "var(--color-border-default)"}`,
            }}>
            {chip.color && <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chip.color }} />}
            {chip.label} <span style={{ opacity: 0.7 }}>{chip.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function StateTabs({ tabs, counts, selected, onSelect }: {
  tabs: CollectionState[]; counts: Record<CollectionState, number>; selected: CollectionState; onSelect: (s: CollectionState) => void;
}) {
  return (
    <div role="tablist" aria-label="Have, want or trade" className="flex gap-1 mb-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
      {tabs.map((s) => {
        const on = s === selected;
        return (
          <button key={s} role="tab" aria-selected={on} onClick={() => onSelect(s)}
            className="px-4 py-2 text-sm font-semibold cursor-pointer -mb-px"
            style={{ color: on ? ACCENT : "var(--color-text-secondary)", borderBottom: `2px solid ${on ? ACCENT : "transparent"}` }}>
            {COLLECTION_TAB_LABELS[s]} <span style={{ color: "var(--color-text-dim)" }}>{counts[s]}</span>
          </button>
        );
      })}
    </div>
  );
}

function ViewSwitch({ view, onChange }: { view: "tiles" | "table"; onChange: (v: "tiles" | "table") => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden" role="group" aria-label="View" style={{ border: "1px solid var(--color-border-subtle)" }}>
      {(["tiles", "table"] as const).map((v) => (
        <button key={v} onClick={() => onChange(v)} aria-pressed={view === v} title={v === "tiles" ? "Grid view" : "List view"}
          className="px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors duration-150"
          style={{
            backgroundColor: view === v ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent",
            color: view === v ? ACCENT : "var(--color-text-dim)",
          }}>
          <span aria-hidden="true">{v === "tiles" ? "▦" : "☰"}</span> {v === "tiles" ? "Grid" : "List"}
        </button>
      ))}
    </div>
  );
}

function ItemGrid({ settings, items, category, tab, view, ownerOf, onOpen }: {
  settings: CollectionSettings; items: CollectionItem[]; category: ResolvedCollectionCategory; tab: CollectionState;
  view: "tiles" | "table"; ownerOf: OwnerOf; onOpen: (item: CollectionItem) => void;
}) {
  const shown = useMemo(() => visibleCollectionItems(items, category.id, tab), [items, category.id, tab]);
  const fields = useMemo(() => collectionFormFields(settings, category.id), [settings, category.id]);
  if (shown.length === 0) {
    return <p className="mt-8 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>{emptyCollectionTabText(tab, category.name)}</p>;
  }
  if (view === "table") {
    return <CollectionTable key={category.id} items={shown} fields={fields} icon={category.icon} tab={tab} onOpen={onOpen} ownerOf={ownerOf} />;
  }
  return (
    <div className={GRID[category.layout]}>
      {shown.map((item) => (
        <CollectionTile key={item.id} item={item} layout={category.layout} icon={category.icon}
          summary={collectionItemSummary(item, fields)} date={collectionItemDate(item)} owner={ownerOf(item)} onOpen={() => onOpen(item)} />
      ))}
    </div>
  );
}

/** The first download's progress, while a large collection comes down from Cloud Sync. */
function RestoreNote() {
  const restore = useCollectionRestore();
  if (!restore) return null;
  return (
    <p role="status" className="mb-4 px-4 py-2.5 rounded-xl text-sm" style={{ color: "var(--color-text-secondary)", backgroundColor: "var(--color-surface-raised)" }}>
      Restoring your collection… {restore.done.toLocaleString("en-US")} of {restore.total.toLocaleString("en-US")}
    </p>
  );
}

function Invitation({ onChoose }: { onChoose: () => void }) {
  return (
    <div className="mt-12 flex flex-col items-center text-center max-w-md mx-auto">
      <div className="text-5xl mb-3" aria-hidden="true">📌</div>
      <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-heading)" }}>Start a collection</h1>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Keep track of the pins, popcorn buckets, ears and more that you have, want or would trade.
      </p>
      <button onClick={onChoose} className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
        style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
        Choose what you collect
      </button>
    </div>
  );
}
