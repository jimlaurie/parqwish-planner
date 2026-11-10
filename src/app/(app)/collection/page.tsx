"use client";

// ==================== COLLECTION PAGE ====================
// The memorabilia collection (dland-wishes docs/collections-design.md §7):
// the categories switched on in the sidebar with their counts (Uncategorised
// too while it holds items), Have / Want / Trade tabs (Trade where the
// category trades, Gone once there's history), and the items in the
// category's layout. The category picker opens by itself on the first visit
// and from "Edit categories"; "+ Add" and "Add several" add items, and a tile
// opens its item (CollectionItemModal, CollectionBulkAddModal). The rules are shared with Pal
// (@shared/collection-view). Hidden until Collections ship (lib/feature-flags.ts).

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import CollectionCategoryPicker from "@/components/collection/CollectionCategoryPicker";
import CollectionTile from "@/components/collection/CollectionTile";
import CollectionItemModal from "@/components/collection/CollectionItemModal";
import CollectionBulkAddModal from "@/components/collection/CollectionBulkAddModal";
import { useCollection } from "@/hooks/use-collection";
import { COLLECTIONS_AVAILABLE } from "@/lib/feature-flags";
import type { CollectionItem, CollectionSettings } from "@/lib/db";
import { collectionFormFields, type ResolvedCollectionCategory } from "@shared/collections";
import {
  COLLECTION_TAB_LABELS, collectionItemDate, collectionItemSummary, collectionStateCounts, collectionTabs,
  countCollectionItemsByCategory, emptyCollectionTabText, itemsForView, pickCollectionCategory, pickCollectionTab,
  viewCategories, visibleCollectionItems,
} from "@shared/collection-view";
import type { CollectionLayout, CollectionState } from "@shared/types/collection";

const ACCENT = "var(--color-gold)";

/** Grid classes per layout: board is dense, shelf larger cards, list one row each. */
const GRID: Record<CollectionLayout, string> = {
  board: "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3",
  shelf: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
  list: "flex flex-col gap-2",
};

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
  const [editor, setEditor] = useState<{ open: boolean; item?: CollectionItem }>({ open: false });
  const [bulkOpen, setBulkOpen] = useState(false);

  // The first visit opens the picker by itself
  const firstVisit = settings ? !settings.firstRunDone : false;
  useEffect(() => { if (firstVisit) setPickerOpen(true); }, [firstVisit]);

  const items = useMemo(() => (settings ? itemsForView(settings, storedItems) : []), [settings, storedItems]);
  const categories = useMemo(() => (settings ? viewCategories(settings, storedItems) : []), [settings, storedItems]);
  const categoryId = pickCollectionCategory(categories.map((c) => c.id), shownCategory);
  const category = categories.find((c) => c.id === categoryId);
  const counts = useMemo(() => collectionStateCounts(items, categoryId ?? ""), [items, categoryId]);
  const tabs = category ? collectionTabs(category.trades, counts) : [];
  const tab = pickCollectionTab(tabs, shownTab);

  if (!settings) return null;

  const sidebar = (
    <CategorySidebar categories={categories} items={items} selected={categoryId} onSelect={setShownCategory}
      onEdit={() => setPickerOpen(true)} />
  );

  return (
    <SidebarLayout sidebar={sidebar} sidebarWidth={220}>
      <div className="px-6 py-8 max-w-5xl">
        {category ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <h1 className="text-xl font-bold mr-auto" style={{ color: "var(--color-heading)" }}>
                <span aria-hidden="true">{category.icon}</span> {category.name}
              </h1>
              <button onClick={() => setBulkOpen(true)} className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ color: ACCENT, border: `1px solid ${ACCENT}` }}>Add several</button>
              <button onClick={() => setEditor({ open: true })} className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>+ Add</button>
            </div>
            <StateTabs tabs={tabs} counts={counts} selected={tab} onSelect={setShownTab} />
            <ItemGrid settings={settings} items={items} category={category} tab={tab}
              onOpen={(shown) => setEditor({ open: true, item: storedItems.find((i) => i.id === shown.id) ?? shown })} />
            <CollectionItemModal visible={editor.open} settings={settings} item={editor.item} defaultCategory={category.id}
              defaultState={tab} onClose={() => setEditor((e) => ({ ...e, open: false }))} />
            <CollectionBulkAddModal visible={bulkOpen} settings={settings} defaultCategory={category.id} defaultState={tab}
              onClose={() => setBulkOpen(false)} />
          </>
        ) : (
          <Invitation onChoose={() => setPickerOpen(true)} />
        )}
      </div>
      <CollectionCategoryPicker visible={pickerOpen} settings={settings} onClose={() => setPickerOpen(false)} />
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
        Edit categories
      </button>
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

function ItemGrid({ settings, items, category, tab, onOpen }: {
  settings: CollectionSettings; items: CollectionItem[]; category: ResolvedCollectionCategory; tab: CollectionState;
  onOpen: (item: CollectionItem) => void;
}) {
  const shown = useMemo(() => visibleCollectionItems(items, category.id, tab), [items, category.id, tab]);
  const fields = useMemo(() => collectionFormFields(settings, category.id), [settings, category.id]);
  if (shown.length === 0) {
    return <p className="mt-8 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>{emptyCollectionTabText(tab, category.name)}</p>;
  }
  return (
    <div className={GRID[category.layout]}>
      {shown.map((item) => (
        <CollectionTile key={item.id} item={item} layout={category.layout} icon={category.icon}
          summary={collectionItemSummary(item, fields)} date={collectionItemDate(item)} onOpen={() => onOpen(item)} />
      ))}
    </div>
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
