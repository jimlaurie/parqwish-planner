"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { useTrips } from "@/hooks/use-trips";
import { usePackingItems } from "@/hooks/use-packing-items";
import { useUsers } from "@/hooks/use-users";
import { PACKING_TABS } from "@/lib/constants";
import SidebarLayout from "@/components/SidebarLayout";
import PrepareHeader from "@/components/PrepareHeader";
import PackingCard from "@/components/PackingCard";
import PackingFormModal from "@/components/PackingFormModal";
import CatalogPickerModal from "@/components/CatalogPickerModal";
import EmptyState from "@/components/EmptyState";
import UserPanel from "@/components/UserPanel";
import { auth } from "@/lib/auth";
import { resolveOwnerBadge } from "@/lib/owner-badge";

const ACCENT = "var(--color-accent-prepare)";

export default function PreparePage() {
  const router = useRouter();
  const {
    _hasHydrated,
    currentTripId,
    activePackingTabs,
    togglePackingTab,
    setActivePackingTabs,
    showAddPackingModal,
    setShowAddPackingModal,
    editingPackingItemId,
    setEditingPackingItemId,
    packingShowCompleted,
    setPackingShowCompleted,
    showCatalogPicker,
    setShowCatalogPicker,
  } = useAppStore();
  const { currentTrip } = useTrips();
  const { userMap, users } = useUsers();
  // Badges matter for a solo-family account collaborating with others too,
  // not just accounts with multiple local Trip Users — see owner-badge.ts.
  const showUserBadges = users.length > 1 || Object.keys(currentTrip?.members ?? {}).length > 1;
  const myUid = auth.currentUser?.uid;
  const {
    items,
    stats,
    addItem,
    updateItem,
    toggleCompleted,
    unselectItem,
    deleteCatalogItem,
    selectExistingItem,
    getItemById,
    loading,
  } = usePackingItems();

  // Multi-group add popover state
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const primaryTab = activePackingTabs[0];
  const editingItemType = useMemo(() => {
    if (!editingPackingItemId) return primaryTab;
    const editItem = items.find((i) => i.id === editingPackingItemId);
    return editItem?.type ?? primaryTab;
  }, [editingPackingItemId, items, primaryTab]);

  // Redirect to home if no trip selected — delayed to avoid racing IndexedDB
  useEffect(() => {
    if (!_hasHydrated || currentTripId) return;
    const timer = setTimeout(() => {
      if (!useAppStore.getState().currentTripId) {
        router.push("/");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [_hasHydrated, currentTripId, router]);

  if (!currentTripId || !currentTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading trip...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading packing list...</p>
      </div>
    );
  }

  const selectedTabItemCount = activePackingTabs.reduce(
    (sum, tab) => sum + (stats.byType[tab]?.total ?? 0),
    0
  );

  const activeTabLabels =
    activePackingTabs.length === 1
      ? PACKING_TABS.find((t) => t.id === activePackingTabs[0])?.label.toLowerCase() ?? "items"
      : "items";

  const handleAddNew = () => {
    if (activePackingTabs.length > 1) {
      setShowGroupPicker(true);
    } else {
      setShowAddPackingModal(true);
    }
  };

  const handleGroupSelected = (tabId: string) => {
    setShowGroupPicker(false);
    // Set primary tab to the selected type for the form
    setActivePackingTabs([tabId as typeof primaryTab, ...activePackingTabs.filter(t => t !== tabId)]);
    setShowAddPackingModal(true);
  };

  // ==================== SIDEBAR ====================

  const sidebar = (
    <div className="flex flex-col h-full py-4">
      <h2
        className="px-4 text-lg font-bold mb-2"
        style={{ color: "var(--color-heading)" }}
      >
        Prepare
      </h2>
      <p
        className="px-4 text-xs mb-4"
        style={{ color: "var(--color-text-dim)" }}
      >
        Select categories to view
      </p>

      {/* Packing type tabs */}
      <nav className="flex flex-col gap-0.5 px-2">
        {PACKING_TABS.map((tab) => {
          const isActive = activePackingTabs.includes(tab.id);
          const total = stats.byType[tab.id]?.total ?? 0;
          const completed = stats.byType[tab.id]?.completed ?? 0;

          return (
            <button
              key={tab.id}
              onClick={() => togglePackingTab(tab.id)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium
                         transition-all duration-200 cursor-pointer text-left"
              style={{
                color: isActive ? ACCENT : "var(--color-text-muted)",
                backgroundColor: isActive ? `${ACCENT}15` : "transparent",
                borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
              }}
            >
              <span>{tab.icon}</span>
              <span className="flex-1">{tab.label}</span>
              {total > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: isActive ? `color-mix(in srgb, ${ACCENT} 12%, transparent)` : "var(--color-surface-raised)",
                    color: isActive ? ACCENT : "var(--color-text-dim)",
                  }}
                >
                  {completed}/{total}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick actions */}
      <div className="px-4 mt-4 flex flex-col gap-2">
        <button
          onClick={() => setActivePackingTabs(PACKING_TABS.map((t) => t.id))}
          className="text-xs cursor-pointer transition-colors hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          Select All
        </button>
        {activePackingTabs.length > 1 && (
          <button
            onClick={() => setActivePackingTabs([activePackingTabs[0]])}
            className="text-xs cursor-pointer transition-colors hover:opacity-80"
            style={{ color: "var(--color-text-muted)" }}
          >
            Clear
          </button>
        )}
        <button
          onClick={() => setPackingShowCompleted(!packingShowCompleted)}
          className="text-xs cursor-pointer transition-colors hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          {packingShowCompleted ? "\u2705 Hide completed" : "\u25FB Show completed"}
        </button>
      </div>

      {/* Group/Family filter */}
      <UserPanel />
    </div>
  );

  // ==================== RENDER ====================

  return (
    <SidebarLayout sidebar={sidebar} sidebarWidth={220}>
      <div className="px-6 py-8 max-w-2xl">
        {/* Header with progress */}
        <PrepareHeader trip={currentTrip} stats={stats} />

        {/* Item List */}
        {!loading && items.length === 0 && selectedTabItemCount === 0 && (
          <EmptyState
            icon={activePackingTabs.length === 1
              ? (PACKING_TABS.find((t) => t.id === activePackingTabs[0])?.icon ?? "\u{1F3D4}\uFE0F")
              : "\u{1F3D4}\uFE0F"}
            title={`No ${activeTabLabels} yet`}
            description={
              activePackingTabs.includes("shopping") && activePackingTabs.length === 1
                ? "Add things you want to buy on your trip \u2014 souvenirs, treats, and more."
                : `Start adding ${activeTabLabels} to pack for your trip.`
            }
            actionLabel="+ Add New"
            onAction={handleAddNew}
          />
        )}

        {!loading && items.length === 0 && selectedTabItemCount > 0 && (
          <EmptyState
            icon={"\u2705"}
            title="All packed!"
            description="Everything in this category is complete. Nice work!"
          />
        )}

        {items.length > 0 && (
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {items.map((item) => {
                const owner = showUserBadges
                  ? resolveOwnerBadge(item, { userMap, members: currentTrip?.members, myUid })
                  : undefined;
                return (
                  <PackingCard
                    key={item.id}
                    item={item}
                    onToggleCompleted={toggleCompleted}
                    onEdit={setEditingPackingItemId}
                    userName={owner?.name}
                    userColor={owner?.color}
                  />
                );
              })}
            </AnimatePresence>

            <p
              className="text-xs text-center mt-3"
              style={{ color: "var(--color-text-dim)" }}
            >
              Tap any item to edit
            </p>
          </div>
        )}

        {/* Inline Add Buttons */}
        <div className="flex gap-2 mt-4 justify-center relative">
          <button
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold
                       cursor-pointer transition-all duration-150 hover:brightness-110"
            style={{
              backgroundColor: ACCENT,
              color: "var(--color-bg-deep)",
            }}
          >
            + Add New
          </button>
          <button
            onClick={() => setShowCatalogPicker(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold
                       cursor-pointer transition-all duration-150 hover:brightness-110"
            style={{
              backgroundColor: "var(--color-bg-card)",
              color: ACCENT,
              border: `2px solid ${ACCENT}`,
            }}
          >
            From Catalog
          </button>

          {/* Group picker popover */}
          {showGroupPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowGroupPicker(false)}
              />
              <div
                className="absolute bottom-full left-0 mb-2 z-50 rounded-xl shadow-lg p-2 min-w-[160px]"
                style={{
                  backgroundColor: "var(--color-bg-card)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <p
                  className="text-xs px-2 py-1 mb-1"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  Add to which group?
                </p>
                {activePackingTabs.map((tabId) => {
                  const tab = PACKING_TABS.find((t) => t.id === tabId);
                  if (!tab) return null;
                  return (
                    <button
                      key={tabId}
                      onClick={() => handleGroupSelected(tabId)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm
                                 cursor-pointer hover:bg-white/5 transition-colors text-left"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      <PackingFormModal
        visible={showAddPackingModal}
        activeTab={primaryTab}
        onClose={() => setShowAddPackingModal(false)}
        onSave={async (data) => {
          await addItem(data, primaryTab);
          setShowAddPackingModal(false);
        }}
      />

      {/* Edit Item Modal */}
      <PackingFormModal
        visible={!!editingPackingItemId}
        itemId={editingPackingItemId ?? undefined}
        activeTab={editingItemType}
        getItemById={getItemById}
        onClose={() => setEditingPackingItemId(null)}
        onSave={async (data) => {
          if (editingPackingItemId) {
            await updateItem(editingPackingItemId, data);
            setEditingPackingItemId(null);
          }
        }}
        onUnselectFromTrip={async () => {
          if (editingPackingItemId) {
            await unselectItem(editingPackingItemId);
            setEditingPackingItemId(null);
          }
        }}
        onDeleteForever={async () => {
          if (editingPackingItemId) {
            await deleteCatalogItem(editingPackingItemId);
            setEditingPackingItemId(null);
          }
        }}
      />

      {/* Catalog Picker Modal */}
      <CatalogPickerModal
        visible={showCatalogPicker}
        activeTab={primaryTab}
        onClose={() => setShowCatalogPicker(false)}
        onSelectItem={selectExistingItem}
      />
    </SidebarLayout>
  );
}
