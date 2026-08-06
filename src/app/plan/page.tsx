"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { useTrips } from "@/hooks/use-trips";
import { useTripWishes } from "@/hooks/use-trip-wishes";
import { useUsers } from "@/hooks/use-users";
import { WISH_TAGS } from "@/lib/constants";
import SidebarLayout from "@/components/SidebarLayout";
import PlanHeader from "@/components/PlanHeader";
import WishCard from "@/components/WishCard";
import WishFormModal from "@/components/WishFormModal";
import WishCatalogPickerModal from "@/components/WishCatalogPickerModal";
import CatalogBrowser from "@/components/CatalogBrowser";
import EmptyState from "@/components/EmptyState";
import UserPanel from "@/components/UserPanel";
import { auth } from "@/lib/auth";
import { resolveOwnerBadge } from "@/lib/owner-badge";

const ACCENT = "var(--color-accent-plan)";

export default function PlanPage() {
  const router = useRouter();
  const {
    _hasHydrated,
    currentTripId,
    showAddWishModal,
    setShowAddWishModal,
    editingWishId,
    setEditingWishId,
    showWishCatalogPicker,
    setShowWishCatalogPicker,
    wishFilters,
    toggleFilterTag,
    clearFilterTags,
    setShowCompleted,
    setSearchQuery,
  } = useAppStore();
  const { currentTrip } = useTrips();
  const { userMap, users } = useUsers();
  // Badges matter for a solo-family account collaborating with others too,
  // not just accounts with multiple local Trip Users — see owner-badge.ts.
  const showUserBadges = users.length > 1 || Object.keys(currentTrip?.members ?? {}).length > 1;
  const myUid = auth.currentUser?.uid;
  const {
    wishes,
    stats,
    addWish,
    updateWish,
    toggleCompleted,
    unselectWish,
    deleteWishForever,
    selectExistingWish,
    getWishById,
    loading,
  } = useTripWishes();

  // Multi-group add popover state
  const [showGroupPicker, setShowGroupPicker] = useState(false);

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

  const handleAddNew = useCallback(() => {
    const activeFilters = wishFilters.selectedTags;
    if (activeFilters.length > 1) {
      setShowGroupPicker(true);
    } else {
      setShowAddWishModal(true);
    }
  }, [wishFilters.selectedTags, setShowAddWishModal]);

  const handleGroupSelected = useCallback(
    (_tagId: string) => {
      setShowGroupPicker(false);
      // Pre-select the tag so the form opens with it
      setShowAddWishModal(true);
    },
    [setShowAddWishModal]
  );

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
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading wishes...</p>
      </div>
    );
  }

  // ==================== SIDEBAR ====================

  const sidebar = (
    <div className="flex flex-col h-full py-4">
      <h2
        className="px-4 text-lg font-bold mb-2"
        style={{ color: "var(--color-heading)" }}
      >
        Plan
      </h2>
      <p
        className="px-4 text-xs mb-4"
        style={{ color: "var(--color-text-dim)" }}
      >
        Filter wishes by type
      </p>

      {/* Search */}
      <div className="px-3 mb-3">
        <input
          type="text"
          value={wishFilters.searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search wishes..."
          aria-label="Search wishes"
          className="w-full px-3 py-2 rounded-lg text-xs outline-none
                     border border-white/10 focus:border-white/25
                     transition-colors duration-200"
          style={{
            backgroundColor: "var(--color-bg-card)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>

      {/* Tag filters */}
      <nav className="flex flex-col gap-0.5 px-2">
        {WISH_TAGS.map((tag) => {
          const isActive = wishFilters.selectedTags.includes(tag.id);
          const count = stats.byTag[tag.id] ?? 0;

          return (
            <button
              key={tag.id}
              onClick={() => toggleFilterTag(tag.id)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
                         transition-all duration-200 cursor-pointer text-left"
              style={{
                color: isActive ? ACCENT : "var(--color-text-muted)",
                backgroundColor: isActive ? `${ACCENT}15` : "transparent",
                borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
              }}
            >
              <span>{tag.icon}</span>
              <span className="flex-1">{tag.label}</span>
              {count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: isActive ? `color-mix(in srgb, ${ACCENT} 12%, transparent)` : "var(--color-surface-raised)",
                    color: isActive ? ACCENT : "var(--color-text-dim)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Filter controls */}
      <div className="px-4 mt-4 flex flex-col gap-2">
        {wishFilters.selectedTags.length > 0 && (
          <button
            onClick={clearFilterTags}
            className="text-xs cursor-pointer transition-colors hover:opacity-80"
            style={{ color: "var(--color-text-muted)" }}
          >
            Clear filters
          </button>
        )}
        <button
          onClick={() => setShowCompleted(!wishFilters.showCompleted)}
          role="switch"
          aria-checked={wishFilters.showCompleted}
          className="text-xs cursor-pointer transition-colors hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          {wishFilters.showCompleted ? "\u2705 Hide completed" : "\u25FB Show completed"}
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
        {/* Header */}
        <PlanHeader trip={currentTrip} stats={stats} />

        {/* Park Catalog Browser */}
        <CatalogBrowser />

        {/* Wish List */}
        {!loading && wishes.length === 0 && stats.total === 0 && (
          <EmptyState
            icon={"\u2B50"}
            title="No wishes yet"
            description="Start collecting ideas for your trip. Add rides, restaurants, shows, and anything else you want to experience."
            actionLabel="+ Add Wish"
            onAction={() => setShowAddWishModal(true)}
          />
        )}

        {!loading && wishes.length === 0 && stats.total > 0 && (
          <EmptyState
            icon={"\u{1F50D}"}
            title="No matches"
            description="No wishes match your current filters. Try adjusting your search or tag selection."
          />
        )}

        {wishes.length > 0 && (
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {wishes.map((wish) => {
                const owner = showUserBadges
                  ? resolveOwnerBadge(wish, { userMap, members: currentTrip?.members, myUid })
                  : undefined;
                return (
                  <WishCard
                    key={wish.id}
                    wish={wish}
                    onToggleCompleted={toggleCompleted}
                    onEdit={setEditingWishId}
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
              Tap any wish to edit
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
            onClick={() => setShowWishCatalogPicker(true)}
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
                {wishFilters.selectedTags.map((tagId) => {
                  const tag = WISH_TAGS.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <button
                      key={tagId}
                      onClick={() => handleGroupSelected(tagId)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm
                                 cursor-pointer hover:bg-white/5 transition-colors text-left"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      <span>{tag.icon}</span>
                      <span>{tag.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Wish Modal */}
      <WishFormModal
        visible={showAddWishModal}
        onClose={() => setShowAddWishModal(false)}
        onSave={async (data) => {
          await addWish(data);
          setShowAddWishModal(false);
        }}
      />

      {/* Edit Wish Modal */}
      <WishFormModal
        visible={!!editingWishId}
        wishId={editingWishId ?? undefined}
        getWishById={getWishById}
        onClose={() => setEditingWishId(null)}
        onSave={async (data) => {
          if (editingWishId) {
            await updateWish(editingWishId, data);
            setEditingWishId(null);
          }
        }}
        onUnselectFromTrip={async () => {
          if (editingWishId) {
            await unselectWish(editingWishId);
            setEditingWishId(null);
          }
        }}
        onDeleteForever={async () => {
          if (editingWishId) {
            await deleteWishForever(editingWishId);
            setEditingWishId(null);
          }
        }}
      />

      {/* Wish Catalog Picker Modal */}
      <WishCatalogPickerModal
        visible={showWishCatalogPicker}
        onClose={() => setShowWishCatalogPicker(false)}
        onSelectWish={selectExistingWish}
      />
    </SidebarLayout>
  );
}
