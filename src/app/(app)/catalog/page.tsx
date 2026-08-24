"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { useCatalog } from "@/hooks/use-catalog";
import { useEnsembles } from "@/hooks/use-ensembles";
import { useTrips } from "@/hooks/use-trips";
import { auth, isSyncEnabled } from "@/lib/auth";
import { pushWish, deleteWishRemote } from "@/lib/wish-sync";
import { getFirstThumbnail } from "@/lib/image-utils";
import { useAppStore } from "@/lib/store";
import SidebarLayout from "@/components/SidebarLayout";
import WishCard from "@/components/WishCard";
import PackingCard from "@/components/PackingCard";
import CatalogGridCard from "@/components/CatalogGridCard";
import CatalogContextMenu from "@/components/CatalogContextMenu";
import UserPanel from "@/components/UserPanel";
import EnsembleCard from "@/components/EnsembleCard";
import EnsembleDropTarget from "@/components/EnsembleDropTarget";
import UserFilterBar from "@/components/UserFilterBar";
import ActiveUserChip from "@/components/ActiveUserChip";
import WishFormModal from "@/components/WishFormModal";
import PackingFormModal from "@/components/PackingFormModal";
import EnsembleBuilderModal from "@/components/EnsembleBuilderModal";
import BulkAddToDayModal from "@/components/play/BulkAddToDayModal";
import type { WishFormData } from "@/components/WishFormModal";
import type { PackingFormData } from "@/hooks/use-packing-items";
import type { PackingType } from "@/lib/db";
import type { Wish } from "@shared/types/wish";
import type { WishWithStatus } from "@/hooks/use-trip-wishes";
import type { PackingItemWithStatus } from "@/hooks/use-packing-items";
import { addDayItemsBatch, type AddDayItemParams } from "@/hooks/use-day-items";
import type { DayItemType } from "@shared/types/day-item";
import { PACKING_TABS, PRIORITY_SORT_ORDER } from "@/lib/constants";
import db from "@/lib/db";

// ==================== TYPES ====================

type CatalogTab = "wishes" | "ensembles" | PackingType;

interface TabConfig {
  id: CatalogTab;
  label: string;
  icon: string;
  accent: string;
}

const CATALOG_TABS: TabConfig[] = [
  { id: "outfit", label: "Outfits", icon: "\uD83D\uDC57", accent: "var(--color-accent-prepare)" },
  { id: "equipment", label: "Equipment", icon: "\uD83C\uDF92", accent: "var(--color-accent-prepare)" },
  { id: "sundry", label: "Sundries", icon: "\uD83E\uDDF4", accent: "var(--color-accent-prepare)" },
  { id: "shopping", label: "Shopping", icon: "\uD83D\uDECD\uFE0F", accent: "var(--color-accent-prepare)" },
  { id: "dining", label: "Dining", icon: "\uD83C\uDF7D\uFE0F", accent: "var(--color-accent-prepare)" },
  { id: "wishes", label: "Wishes", icon: "\u2B50", accent: "var(--color-gold)" },
];

// Tabs that use visual grid layout instead of list
const GRID_TABS = new Set<string>(["outfit", "equipment", "sundry", "shopping"]);

type CatalogSortOption = "priority" | "newest" | "oldest";

const SORT_OPTIONS: { id: CatalogSortOption; label: string }[] = [
  { id: "priority", label: "Priority" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
];

function sortCatalogItems<T extends { priority: string; createdAt: number }>(
  items: T[],
  sortBy: CatalogSortOption
): T[] {
  if (sortBy === "newest") return [...items].sort((a, b) => b.createdAt - a.createdAt);
  if (sortBy === "oldest") return [...items].sort((a, b) => a.createdAt - b.createdAt);
  return [...items].sort(
    (a, b) => (PRIORITY_SORT_ORDER[a.priority] ?? 99) - (PRIORITY_SORT_ORDER[b.priority] ?? 99)
  );
}

// ==================== COMPONENT ====================

export default function CatalogPage() {
  const {
    wishes,
    getPackingByType,
    deleteWishForever,
    deletePackingItemForever,
    loading,
  } = useCatalog();

  const {
    ensembles,
    allPackingItems,
    createEnsemble,
    updateEnsemble,
    deleteEnsemble,
    addItemToEnsemble,
    addEnsembleToTrip,
  } = useEnsembles();

  const { currentTripId, currentUserId, activeUserFilter, selectedPlayDate } = useAppStore();
  const { currentTrip } = useTrips();

  const [activeTab, setActiveTab] = useState<CatalogTab>("outfit");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<CatalogSortOption>("priority");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showWishForm, setShowWishForm] = useState(false);
  const [editingWishId, setEditingWishId] = useState<string | null>(null);
  const [showPackingForm, setShowPackingForm] = useState(false);
  const [editingPackingId, setEditingPackingId] = useState<string | null>(null);
  const [showEnsembleBuilder, setShowEnsembleBuilder] = useState(false);
  const [editingEnsembleId, setEditingEnsembleId] = useState<string | null>(null);
  const [preSelectedItemIds, setPreSelectedItemIds] = useState<string[]>([]);
  const [selectedEnsembleId, setSelectedEnsembleId] = useState<string | null>(null);

  // Trip name popover state
  const [tripPopoverId, setTripPopoverId] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    itemId: string;
  } | null>(null);

  // Drag state
  const [activeDragItem, setActiveDragItem] = useState<PackingItemWithStatus | null>(null);

  const isWishesTab = activeTab === "wishes";
  const isEnsemblesTab = activeTab === "ensembles";
  const isGridTab = GRID_TABS.has(activeTab);
  const tabConfig = isEnsemblesTab
    ? { id: "ensembles" as const, label: "Ensembles", icon: "\uD83E\uDDF3", accent: "var(--color-accent-prepare)" }
    : CATALOG_TABS.find((t) => t.id === activeTab)!;
  const accent = tabConfig.accent;

  // ==================== DND SETUP ====================

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current;
      if (data?.catalogItem) {
        setActiveDragItem(data.catalogItem as PackingItemWithStatus);
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragItem(null);
      const { over, active } = event;
      if (!over) return;

      const overId = over.id as string;
      if (!overId.startsWith("ensemble__")) return;

      const ensembleId = overId.replace("ensemble__", "");
      const activeId = (active.id as string).replace("catalog__", "");

      addItemToEnsemble(ensembleId, activeId);
    },
    [addItemToEnsemble]
  );

  // ==================== FILTERED ITEMS ====================

  const filteredWishes = useMemo(() => {
    const q = search.toLowerCase().trim();
    let items = wishes;
    if (activeUserFilter) {
      const filterSet = new Set(activeUserFilter);
      items = items.filter((w) => filterSet.has(w.userId ?? "user_primary"));
    }
    if (q) {
      items = items.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.tags.some((t) => t.toLowerCase().includes(q)) ||
          (w.notes && w.notes.toLowerCase().includes(q)) ||
          (w.park && w.park.toLowerCase().includes(q)) ||
          (w.land && w.land.toLowerCase().includes(q))
      );
    }
    return sortCatalogItems(items, sortBy);
  }, [wishes, search, activeUserFilter, sortBy]);

  const filteredPacking = useMemo(() => {
    if (isWishesTab || isEnsemblesTab) return [];
    const q = search.toLowerCase().trim();
    let items = getPackingByType(activeTab as PackingType);
    if (activeUserFilter) {
      const filterSet = new Set(activeUserFilter);
      items = items.filter((item) => filterSet.has(item.userId ?? "user_primary"));
    }
    if (q) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q))
      );
    }
    if (selectedEnsembleId && ensembles) {
      const ensemble = ensembles.find((e) => e.id === selectedEnsembleId);
      if (ensemble) {
        const memberIds = new Set(ensemble.items.map((i) => i.id));
        items = items.filter((item) => memberIds.has(item.id));
      }
    }
    return sortCatalogItems(items, sortBy);
  }, [isWishesTab, isEnsemblesTab, activeTab, getPackingByType, search, selectedEnsembleId, ensembles, activeUserFilter, sortBy]);

  // ==================== SELECT MODE / BULK ADD TO DAY ====================

  // Selection is scoped to the active tab — clear it on tab switch so a
  // batch never mixes wishes with packing items.
  useEffect(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [activeTab]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const currentTabItemIds = isWishesTab
    ? filteredWishes.map((w) => w.id)
    : filteredPacking.map((p) => p.id);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(currentTabItemIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTabItemIds.join(",")]);

  const handleDeselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkAddToDay = useCallback(
    async (date: string, scheduledTime: string | undefined) => {
      if (!currentTripId) return;
      const entries: AddDayItemParams[] = isWishesTab
        ? filteredWishes
            .filter((w) => selectedIds.has(w.id))
            .map((w) => ({
              title: w.title,
              itemType: "wish" as DayItemType,
              scheduledTime,
              park: w.park,
              land: w.land,
              notes: w.notes,
              priority: w.priority,
              tags: w.tags,
              photos: w.photos,
              sourceId: w.id,
              parkDataId: w.parkDataId,
            }))
        : filteredPacking
            .filter((item) => selectedIds.has(item.id))
            .map((item) => ({
              title: item.name,
              itemType: item.type as DayItemType,
              scheduledTime,
              notes: item.notes,
              priority: item.priority,
              photos: item.photos,
              sourceId: item.id,
            }));

      await addDayItemsBatch(currentTripId, date, currentUserId, entries);
      setSelectedIds(new Set());
      setSelectMode(false);
    },
    [currentTripId, currentUserId, isWishesTab, filteredWishes, filteredPacking, selectedIds]
  );

  const userFilteredEnsembles = useMemo(() => {
    if (!activeUserFilter) return ensembles;
    const filterSet = new Set(activeUserFilter);
    return ensembles.filter((e) => filterSet.has(e.userId ?? "user_primary"));
  }, [ensembles, activeUserFilter]);

  const filteredEnsembles = useMemo(() => {
    if (!isEnsemblesTab) return [];
    const q = search.toLowerCase().trim();
    if (!q) return userFilteredEnsembles;
    return userFilteredEnsembles.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        e.items.some((item) => item.name.toLowerCase().includes(q))
    );
  }, [isEnsemblesTab, userFilteredEnsembles, search]);

  // ==================== WISH HANDLERS ====================

  const handleAddWish = useCallback(() => {
    setEditingWishId(null);
    setShowWishForm(true);
  }, []);

  const handleEditWish = useCallback((id: string) => {
    setEditingWishId(id);
    setShowWishForm(true);
  }, []);

  const handleSaveWish = useCallback(
    async (data: WishFormData) => {
      const user = auth.currentUser;
      const syncActive = user && isSyncEnabled(user);

      if (editingWishId) {
        const updated = { ...data, updatedAt: Date.now() };
        await db.wishes.update(editingWishId, updated);
        if (syncActive) {
          const wish = await db.wishes.get(editingWishId);
          if (wish) pushWish(wish, user.uid).catch(() => {
            db.wishes.update(editingWishId, { pendingSync: 1 } as Partial<Wish>);
          });
        }
      } else {
        const id = `wish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const wish: Wish = { id, ...data, createdAt: Date.now(), updatedAt: Date.now(), userId: currentUserId };
        await db.wishes.add(wish);
        if (syncActive) {
          pushWish(wish, user.uid).catch(() => {
            db.wishes.update(id, { pendingSync: 1 } as Partial<Wish>);
          });
        }
      }
      setShowWishForm(false);
      setEditingWishId(null);
    },
    [editingWishId, currentUserId]
  );

  const handleDeleteWish = useCallback(async () => {
    if (editingWishId) {
      const user = auth.currentUser;
      await deleteWishForever(editingWishId);
      if (user && isSyncEnabled(user)) {
        deleteWishRemote(editingWishId, user.uid).catch(() => {});
      }
      setShowWishForm(false);
      setEditingWishId(null);
    }
  }, [editingWishId, deleteWishForever]);

  // ==================== PACKING HANDLERS ====================

  const handleAddPacking = useCallback(() => {
    setEditingPackingId(null);
    setShowPackingForm(true);
  }, []);

  const handleEditPacking = useCallback((id: string) => {
    setEditingPackingId(id);
    setShowPackingForm(true);
  }, []);

  const handleSavePacking = useCallback(
    async (data: PackingFormData) => {
      const packingType = activeTab as PackingType;
      const tabDef = PACKING_TABS.find((t) => t.id === packingType);

      if (editingPackingId) {
        await db.packingItems.update(editingPackingId, {
          ...data,
          updatedAt: Date.now(),
        });
      } else {
        const id = `${tabDef?.idPrefix ?? "item_"}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.packingItems.add({
          id,
          type: packingType,
          ...data,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          userId: currentUserId,
        });
      }
      setShowPackingForm(false);
      setEditingPackingId(null);
    },
    [activeTab, editingPackingId, currentUserId]
  );

  const handleDeletePacking = useCallback(async () => {
    if (editingPackingId) {
      await deletePackingItemForever(editingPackingId);
      setShowPackingForm(false);
      setEditingPackingId(null);
    }
  }, [editingPackingId, deletePackingItemForever]);

  // ==================== ENSEMBLE HANDLERS ====================

  const handleAddEnsemble = useCallback(() => {
    setEditingEnsembleId(null);
    setPreSelectedItemIds([]);
    setShowEnsembleBuilder(true);
  }, []);

  const handleEditEnsemble = useCallback((id: string) => {
    setEditingEnsembleId(id);
    setPreSelectedItemIds([]);
    setShowEnsembleBuilder(true);
  }, []);

  const editingEnsemble = editingEnsembleId
    ? ensembles.find((e) => e.id === editingEnsembleId) ?? null
    : null;

  const handleAddEnsembleToTrip = useCallback(
    async (ensembleId: string) => {
      if (!currentTripId) return;
      const added = await addEnsembleToTrip(ensembleId, currentTripId);
      if (added !== undefined && added > 0) {
        // Could show toast/notification here
      }
    },
    [currentTripId, addEnsembleToTrip]
  );

  // ==================== CONTEXT MENU HANDLERS ====================

  const handleCardContextMenu = useCallback(
    (e: React.MouseEvent, item: PackingItemWithStatus) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        position: { x: e.clientX, y: e.clientY },
        itemId: item.id,
      });
    },
    []
  );

  const handleContextAddToEnsemble = useCallback(
    (ensembleId: string, itemId: string) => {
      addItemToEnsemble(ensembleId, itemId);
    },
    [addItemToEnsemble]
  );

  const handleContextCreateEnsemble = useCallback((itemId: string) => {
    setEditingEnsembleId(null);
    setPreSelectedItemIds([itemId]);
    setShowEnsembleBuilder(true);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // ==================== RENDER HELPERS ====================

  const wishCardsData: WishWithStatus[] = useMemo(
    () =>
      filteredWishes.map((w) => ({
        ...w,
        selectionId: "",
        completed: false,
        status: "idea" as const,
      })),
    [filteredWishes]
  );

  const packingCardsData: PackingItemWithStatus[] = useMemo(
    () =>
      filteredPacking.map((item) => ({
        ...item,
        selectionId: "",
        completed: false,
      })),
    [filteredPacking]
  );

  const itemCount = isWishesTab
    ? filteredWishes.length
    : isEnsemblesTab
      ? filteredEnsembles.length
      : filteredPacking.length;
  const totalCount = isWishesTab
    ? wishes.length
    : isEnsemblesTab
      ? userFilteredEnsembles.length
      : getPackingByType(activeTab as PackingType).length;

  // ==================== SIDEBAR ====================

  const sidebar = (
    <div className="flex flex-col h-full py-4">
      <h2
        className="px-4 text-lg font-bold mb-4"
        style={{ color: "var(--color-heading)" }}
      >
        Catalog
      </h2>
      <nav className="flex flex-col gap-0.5 px-2">
        {CATALOG_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count =
            tab.id === "wishes"
              ? wishes.length
              : getPackingByType(tab.id as PackingType).length;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch("");
                setSelectedEnsembleId(null);
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium
                         transition-all duration-200 cursor-pointer text-left"
              style={{
                color: isActive ? tab.accent : "var(--color-text-muted)",
                backgroundColor: isActive ? `${tab.accent}15` : "transparent",
                borderLeft: isActive ? `3px solid ${tab.accent}` : "3px solid transparent",
              }}
            >
              <span>{tab.icon}</span>
              <span className="flex-1">{tab.label}</span>
              {count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: isActive ? `color-mix(in srgb, ${tab.accent} 12%, transparent)` : "var(--color-surface-raised)",
                    color: isActive ? tab.accent : "var(--color-text-dim)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Ensembles tab */}
        <div className="mt-4 border-t border-white/5 pt-4">
          <button
            onClick={() => {
              setActiveTab("ensembles");
              setSearch("");
              setSelectedEnsembleId(null);
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium
                       transition-all duration-200 cursor-pointer text-left w-full"
            style={{
              color: isEnsemblesTab ? "var(--color-accent-prepare)" : "var(--color-text-muted)",
              backgroundColor: isEnsemblesTab ? "color-mix(in srgb, var(--color-accent-prepare) 9%, transparent)" : "transparent",
              borderLeft: isEnsemblesTab ? "3px solid var(--color-accent-prepare)" : "3px solid transparent",
            }}
          >
            <span>{"\uD83E\uDDF3"}</span>
            <span className="flex-1">Ensembles</span>
            {userFilteredEnsembles.length > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  backgroundColor: isEnsemblesTab ? "color-mix(in srgb, var(--color-accent-prepare) 12%, transparent)" : "var(--color-surface-raised)",
                  color: isEnsemblesTab ? "var(--color-accent-prepare)" : "var(--color-text-dim)",
                }}
              >
                {userFilteredEnsembles.length}
              </span>
            )}
          </button>
        </div>

        {/* Ensemble drop targets — visible on grid tabs when there are ensembles */}
        {isGridTab && ensembles.length > 0 && (
          <div className="mt-3 border-t border-white/5 pt-3">
            <div
              className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-dim)" }}
            >
              Drop to Ensemble
            </div>
            <div className="flex flex-col gap-0.5">
              {ensembles.map((ensemble) => (
                <EnsembleDropTarget
                  key={ensemble.id}
                  ensemble={ensemble}
                  onEdit={handleEditEnsemble}
                />
              ))}
            </div>
            <button
              onClick={handleAddEnsemble}
              className="flex items-center gap-2 px-3 py-1.5 mt-1 text-xs cursor-pointer
                         transition-colors hover:bg-white/5 rounded-lg w-full"
              style={{ color: "var(--color-accent-prepare)" }}
            >
              <span>+</span>
              <span className="font-medium">New Ensemble</span>
            </button>
          </div>
        )}
      </nav>

      {/* Group/Family filter */}
      <UserPanel />
    </div>
  );

  // ==================== RENDER ====================

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">{"\u{1F4E6}"}</div>
          <p style={{ color: "var(--color-text-muted)" }}>Loading catalog...</p>
        </div>
      </main>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SidebarLayout sidebar={sidebar} sidebarWidth={220}>
        <div className={`px-6 py-8 ${isGridTab ? "max-w-5xl" : "max-w-3xl"}`}>
          {/* Active user indicator */}
          <div className="mb-3 flex justify-end">
            <ActiveUserChip />
          </div>

          {/* Search + Add */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${tabConfig.label.toLowerCase()}...`}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none
                           border border-white/10 focus:border-white/25
                           transition-colors duration-200"
                style={{
                  backgroundColor: "var(--color-bg-card)",
                  color: "var(--color-text-primary)",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs cursor-pointer"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  {"\u2715"}
                </button>
              )}
            </div>
            <button
              onClick={
                isWishesTab
                  ? handleAddWish
                  : isEnsemblesTab
                    ? handleAddEnsemble
                    : handleAddPacking
              }
              className="px-4 py-2.5 rounded-xl text-sm font-semibold
                         transition-colors duration-200 cursor-pointer flex-shrink-0"
              style={{
                backgroundColor: `${accent}20`,
                color: accent,
              }}
            >
              + Add
            </button>
          </div>

          {/* Creator/owner filter — every tab */}
          <UserFilterBar />

          {/* Sort control + Select mode — wishes/packing tabs only (ensembles have their own ordering) */}
          {!isEnsemblesTab && (
            <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                  Sort
                </span>
                <div className="flex gap-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150"
                      style={{
                        backgroundColor: sortBy === opt.id ? `${accent}20` : "transparent",
                        color: sortBy === opt.id ? accent : "var(--color-text-dim)",
                        border: `1px solid ${sortBy === opt.id ? accent : "var(--color-border-subtle)"}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelectMode((v) => !v)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150"
                style={{
                  backgroundColor: selectMode ? `${accent}20` : "transparent",
                  color: selectMode ? accent : "var(--color-text-dim)",
                  border: `1px solid ${selectMode ? accent : "var(--color-border-subtle)"}`,
                }}
              >
                {selectMode ? "Cancel" : "Select"}
              </button>
            </div>
          )}

          {/* Bulk selection action bar */}
          {selectMode && !isEnsemblesTab && (
            <div className="mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "var(--color-surface-sunken)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-xs font-medium cursor-pointer underline"
                  style={{ color: accent }}
                >
                  Select All ({currentTabItemIds.length})
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleDeselectAll}
                    className="text-xs font-medium cursor-pointer underline"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
              {selectedIds.size > 0 && currentTripId && (
                <button
                  onClick={() => setShowBulkAddModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: `${accent}20`, color: accent }}
                >
                  Add {selectedIds.size} to Day
                </button>
              )}
            </div>
          )}

          {/* Count indicator */}
          <div className="mb-3 flex items-center justify-between">
            <span
              className="text-xs"
              style={{ color: "var(--color-text-dim)" }}
            >
              {search
                ? `${itemCount} of ${totalCount} ${tabConfig.label.toLowerCase()}`
                : `${totalCount} ${tabConfig.label.toLowerCase()}`}
            </span>
            {isGridTab && (
              <span
                className="text-[10px]"
                style={{ color: "var(--color-text-dim)" }}
              >
                Right-click to add to ensemble
              </span>
            )}
          </div>

          {/* Ensemble image filter row — grid tabs only */}
          {isGridTab && ensembles && ensembles.length > 0 && (
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {/* All */}
              <button
                onClick={() => setSelectedEnsembleId(null)}
                className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer transition-all duration-150"
                style={{ width: 72 }}
              >
                <div
                  className="w-full rounded-xl overflow-hidden transition-all duration-150"
                  style={{
                    aspectRatio: "1 / 1",
                    backgroundColor: "var(--color-surface-raised)",
                    border: selectedEnsembleId === null
                      ? "2px solid var(--color-accent-prepare)"
                      : "2px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span className="text-xl opacity-40">🗂️</span>
                </div>
                <span
                  className="text-[10px] font-medium text-center leading-tight"
                  style={{
                    color: selectedEnsembleId === null
                      ? "var(--color-accent-prepare)"
                      : "var(--color-text-muted)",
                  }}
                >
                  All
                </span>
              </button>

              {ensembles.map((ensemble) => {
                const tabItems = ensemble.items.filter((i) => i.type === activeTab);
                const isActive = selectedEnsembleId === ensemble.id;
                const previews = tabItems.slice(0, 4).map((i) => getFirstThumbnail(i));

                return (
                  <button
                    key={ensemble.id}
                    onClick={() => setSelectedEnsembleId(isActive ? null : ensemble.id)}
                    className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer transition-all duration-150"
                    style={{ width: 72 }}
                  >
                    {/* Thumbnail grid */}
                    <div
                      className="w-full rounded-xl overflow-hidden transition-all duration-150"
                      style={{
                        aspectRatio: "1 / 1",
                        border: isActive
                          ? "2px solid var(--color-accent-prepare)"
                          : "2px solid transparent",
                        backgroundColor: "var(--color-bg-deep)",
                        display: "grid",
                        gridTemplateColumns: previews.length > 1 ? "1fr 1fr" : "1fr",
                        gridTemplateRows: previews.length > 2 ? "1fr 1fr" : "1fr",
                      }}
                    >
                      {previews.length === 0 ? (
                        <div
                          className="flex items-center justify-center"
                          style={{
                            backgroundColor: "var(--color-surface-raised)",
                            gridColumn: "1 / -1",
                            gridRow: "1 / -1",
                          }}
                        >
                          <span className="text-xl opacity-30">🧳</span>
                        </div>
                      ) : (
                        previews.map((src, idx) => (
                          src ? (
                            <img
                              key={idx}
                              src={src}
                              alt=""
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <div
                              key={idx}
                              className="flex items-center justify-center"
                              style={{ backgroundColor: "var(--color-surface-raised)" }}
                            >
                              <span className="text-sm opacity-20">📦</span>
                            </div>
                          )
                        ))
                      )}
                    </div>
                    {/* Name + count */}
                    <div className="text-center">
                      <span
                        className="block text-[10px] font-medium leading-tight truncate w-full"
                        style={{
                          color: isActive
                            ? "var(--color-accent-prepare)"
                            : "var(--color-text-muted)",
                          maxWidth: 72,
                        }}
                      >
                        {ensemble.name}
                      </span>
                      {tabItems.length > 0 && (
                        <span
                          className="text-[9px]"
                          style={{ color: "var(--color-text-dim)" }}
                        >
                          {tabItems.length} item{tabItems.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Item Grid/List */}
          {isGridTab ? (
            // ==================== GRID VIEW (Outfits & Shopping) ====================
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {packingCardsData.length > 0 ? (
                  packingCardsData.map((item) => (
                    <CatalogGridCard
                      key={item.id}
                      item={item}
                      onEdit={handleEditPacking}
                      onContextMenu={handleCardContextMenu}
                      selectMode={selectMode}
                      selected={selectedIds.has(item.id)}
                      onToggleSelect={toggleSelectItem}
                    />
                  ))
                ) : (
                  <div className="col-span-full">
                    <EmptyCatalog
                      icon={tabConfig.icon}
                      label={tabConfig.label.toLowerCase()}
                      onAdd={handleAddPacking}
                      accent="var(--color-accent-prepare)"
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // ==================== LIST VIEW (all other tabs) ====================
            <div className="flex flex-col gap-2">
              <AnimatePresence mode="popLayout">
                {isEnsemblesTab ? (
                  filteredEnsembles.length > 0 ? (
                    filteredEnsembles.map((ensemble) => (
                      <EnsembleCard
                        key={ensemble.id}
                        ensemble={ensemble}
                        onEdit={handleEditEnsemble}
                        onAddToTrip={currentTripId ? handleAddEnsembleToTrip : undefined}
                      />
                    ))
                  ) : (
                    <EmptyCatalog
                      icon={"\uD83E\uDDF3"}
                      label="ensembles"
                      onAdd={handleAddEnsemble}
                      accent="var(--color-accent-prepare)"
                    />
                  )
                ) : isWishesTab ? (
                  wishCardsData.length > 0 ? (
                    wishCardsData.map((wish) => {
                      const catalogWish = filteredWishes.find((w) => w.id === wish.id);
                      const tripBadge = catalogWish && catalogWish.tripCount > 0 ? (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTripPopoverId(tripPopoverId === wish.id ? null : wish.id);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer transition-opacity hover:opacity-80"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--color-accent-publish) 12%, transparent)",
                              color: "var(--color-accent-publish)",
                            }}
                          >
                            {catalogWish.tripCount} trip{catalogWish.tripCount !== 1 ? "s" : ""}
                          </button>
                          {tripPopoverId === wish.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setTripPopoverId(null); }} />
                              <div
                                className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg p-2 min-w-[150px]"
                                style={{
                                  backgroundColor: "var(--color-bg-card)",
                                  border: "1px solid var(--color-border-subtle)",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <p className="text-[10px] px-1 mb-1 font-medium" style={{ color: "var(--color-text-dim)" }}>
                                  In {catalogWish.tripCount} trip{catalogWish.tripCount !== 1 ? "s" : ""}:
                                </p>
                                {catalogWish.tripNames.map((name, i) => (
                                  <p key={i} className="text-xs px-2 py-1 rounded" style={{ color: name ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                                    {name || "Unnamed trip"}
                                  </p>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ) : null;
                      return (
                        <WishCard
                          key={wish.id}
                          wish={wish}
                          onToggleCompleted={() => {}}
                          onEdit={handleEditWish}
                          showCheckbox={false}
                          headerExtra={tripBadge}
                          cardStyle={tripPopoverId === wish.id ? { zIndex: 10 } : undefined}
                          selectMode={selectMode}
                          selected={selectedIds.has(wish.id)}
                          onToggleSelect={toggleSelectItem}
                        />
                      );
                    })
                  ) : (
                    <EmptyCatalog
                      icon={"\u2B50"}
                      label="wishes"
                      onAdd={handleAddWish}
                      accent="var(--color-gold)"
                    />
                  )
                ) : packingCardsData.length > 0 ? (
                  packingCardsData.map((item) => {
                    const catalogItem = filteredPacking.find((p) => p.id === item.id);
                    const tripBadge = catalogItem && catalogItem.tripCount > 0 ? (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTripPopoverId(tripPopoverId === item.id ? null : item.id);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--color-accent-publish) 12%, transparent)",
                            color: "var(--color-accent-publish)",
                          }}
                        >
                          {catalogItem.tripCount} trip{catalogItem.tripCount !== 1 ? "s" : ""}
                        </button>
                        {tripPopoverId === item.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setTripPopoverId(null); }} />
                            <div
                              className="absolute right-0 top-full mt-1 z-50 rounded-lg shadow-lg p-2 min-w-[150px]"
                              style={{
                                backgroundColor: "var(--color-bg-card)",
                                border: "1px solid var(--color-border-subtle)",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-[10px] px-1 mb-1 font-medium" style={{ color: "var(--color-text-dim)" }}>
                                In {catalogItem.tripCount} trip{catalogItem.tripCount !== 1 ? "s" : ""}:
                              </p>
                              {catalogItem.tripNames.map((name, i) => (
                                <p key={i} className="text-xs px-2 py-1 rounded" style={{ color: name ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                                  {name || "Unnamed trip"}
                                </p>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : null;
                    return (
                      <PackingCard
                        key={item.id}
                        item={item}
                        onToggleCompleted={() => {}}
                        onEdit={handleEditPacking}
                        showCheckbox={false}
                        headerExtra={tripBadge}
                        cardStyle={tripPopoverId === item.id ? { zIndex: 10 } : undefined}
                        selectMode={selectMode}
                        selected={selectedIds.has(item.id)}
                        onToggleSelect={toggleSelectItem}
                      />
                    );
                  })
                ) : (
                  <EmptyCatalog
                    icon={tabConfig.icon}
                    label={tabConfig.label.toLowerCase()}
                    onAdd={handleAddPacking}
                    accent="var(--color-accent-prepare)"
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Wish Form Modal */}
        <WishFormModal
          visible={showWishForm}
          wishId={editingWishId ?? undefined}
          getWishById={(id) => db.wishes.get(id)}
          onClose={() => {
            setShowWishForm(false);
            setEditingWishId(null);
          }}
          onSave={handleSaveWish}
          onDeleteForever={editingWishId ? handleDeleteWish : undefined}
        />

        {/* Packing Form Modal */}
        {!isWishesTab && !isEnsemblesTab && (
          <PackingFormModal
            visible={showPackingForm}
            itemId={editingPackingId ?? undefined}
            activeTab={activeTab as PackingType}
            getItemById={(id) => db.packingItems.get(id)}
            onClose={() => {
              setShowPackingForm(false);
              setEditingPackingId(null);
            }}
            onSave={handleSavePacking}
            onDeleteForever={editingPackingId ? handleDeletePacking : undefined}
          />
        )}

        {/* Ensemble Builder Modal */}
        <EnsembleBuilderModal
          visible={showEnsembleBuilder}
          ensemble={editingEnsemble}
          allPackingItems={allPackingItems}
          initialItemIds={preSelectedItemIds}
          onClose={() => {
            setShowEnsembleBuilder(false);
            setEditingEnsembleId(null);
            setPreSelectedItemIds([]);
          }}
          onSave={async (data) => {
            if (editingEnsembleId) {
              await updateEnsemble(editingEnsembleId, data);
            } else {
              await createEnsemble(data);
            }
            setShowEnsembleBuilder(false);
            setEditingEnsembleId(null);
            setPreSelectedItemIds([]);
          }}
          onDelete={
            editingEnsembleId
              ? async (id) => {
                  await deleteEnsemble(id);
                  setShowEnsembleBuilder(false);
                  setEditingEnsembleId(null);
                }
              : undefined
          }
        />

        {/* Bulk Add to Day Modal */}
        {currentTrip && (
          <BulkAddToDayModal
            visible={showBulkAddModal}
            itemCount={selectedIds.size}
            tripStartDate={currentTrip.startDate}
            tripEndDate={currentTrip.endDate}
            defaultDate={selectedPlayDate}
            onConfirm={handleBulkAddToDay}
            onClose={() => setShowBulkAddModal(false)}
          />
        )}
      </SidebarLayout>

      {/* Drag Overlay — ghost preview of dragged card */}
      <DragOverlay>
        {activeDragItem && (
          <div
            className="rounded-xl shadow-2xl overflow-hidden opacity-80 pointer-events-none"
            style={{
              backgroundColor: "var(--color-bg-card)",
              width: 160,
            }}
          >
            <div className="px-3 py-2">
              <p
                className="text-xs font-semibold truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {activeDragItem.name}
              </p>
              <p
                className="text-[10px] truncate"
                style={{ color: "var(--color-text-dim)" }}
              >
                {activeDragItem.category}
              </p>
            </div>
          </div>
        )}
      </DragOverlay>

      {/* Context Menu */}
      {contextMenu && (
        <CatalogContextMenu
          visible={contextMenu.visible}
          position={contextMenu.position}
          itemId={contextMenu.itemId}
          ensembles={ensembles}
          onAddToEnsemble={handleContextAddToEnsemble}
          onCreateEnsemble={handleContextCreateEnsemble}
          onClose={closeContextMenu}
        />
      )}
    </DndContext>
  );
}

// ==================== EMPTY STATE ====================

function EmptyCatalog({
  icon,
  label,
  onAdd,
  accent,
}: {
  icon: string;
  label: string;
  onAdd: () => void;
  accent: string;
}) {
  return (
    <motion.div
      className="text-center py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <p
        className="text-sm mb-4"
        style={{ color: "var(--color-text-muted)" }}
      >
        No {label} in your catalog yet
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer
                   transition-colors duration-200"
        style={{
          backgroundColor: `${accent}20`,
          color: accent,
        }}
      >
        + Add your first {label === "wishes" ? "wish" : label === "ensembles" ? "ensemble" : "item"}
      </button>
    </motion.div>
  );
}
