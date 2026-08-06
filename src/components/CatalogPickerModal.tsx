"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { PackingType, PackingItem } from "@/lib/db";
import { useCatalogItems } from "@/hooks/use-packing-items";
import { useEnsembles } from "@/hooks/use-ensembles";
import { useAppStore } from "@/lib/store";
import { TICKET_COLORS, PACKING_TABS } from "@/lib/constants";

interface CatalogPickerModalProps {
  visible: boolean;
  activeTab: PackingType;
  onClose: () => void;
  onSelectItem: (itemId: string) => Promise<void>;
}

const ACCENT = "var(--color-accent-prepare)";

export default function CatalogPickerModal({
  visible,
  activeTab,
  onClose,
  onSelectItem,
}: CatalogPickerModalProps) {
  const focusRef = useFocusTrap(visible, onClose);
  const { items, loading } = useCatalogItems(activeTab);
  const { ensembles, addEnsembleToTrip } = useEnsembles();
  const { currentTripId } = useAppStore();
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addingEnsembleId, setAddingEnsembleId] = useState<string | null>(null);

  const tabInfo = PACKING_TABS.find((t) => t.id === activeTab);
  const showPhoto = activeTab === "outfit" || activeTab === "shopping" || activeTab === "dining";

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, PackingItem[]> = {};
    for (const item of filteredItems) {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [filteredItems]);

  const handleAdd = async (itemId: string) => {
    setAddingId(itemId);
    try {
      await onSelectItem(itemId);
    } finally {
      setAddingId(null);
    }
  };

  // Ensembles that contain items of the current type
  const relevantEnsembles = useMemo(() => {
    return ensembles.filter((e) =>
      e.items.some((item) => item.type === activeTab)
    );
  }, [ensembles, activeTab]);

  const handleAddEnsemble = async (ensembleId: string) => {
    if (!currentTripId) return;
    setAddingEnsembleId(ensembleId);
    try {
      await addEnsembleToTrip(ensembleId, currentTripId);
    } finally {
      setAddingEnsembleId(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSearch("");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "var(--color-overlay)", willChange: "opacity" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={focusRef}
            className="w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl
                       border border-white/10 overflow-hidden"
            style={{ backgroundColor: "var(--color-bg-card)", willChange: "transform, opacity" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2
                className="text-xl font-bold mb-3"
                style={{ color: ACCENT }}
              >
                {tabInfo?.icon ?? "\u{1F4E6}"} Add from Catalog
              </h2>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none
                           border border-white/10 focus:border-[var(--color-accent-prepare)]
                           transition-colors duration-200"
                style={{
                  backgroundColor: "var(--color-bg-deep)",
                  color: "var(--color-text-primary)",
                }}
                autoFocus
              />
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {loading && (
                <p
                  className="text-sm text-center py-8"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Loading...
                </p>
              )}

              {!loading && filteredItems.length === 0 && items.length === 0 && (
                <div className="text-center py-8">
                  <span className="text-3xl block mb-2">{"\u{1F4E6}"}</span>
                  <p
                    className="text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    No items in your catalog yet.
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    Items you create will appear here for future trips.
                  </p>
                </div>
              )}

              {!loading && filteredItems.length === 0 && items.length > 0 && (
                <div className="text-center py-8">
                  <span className="text-3xl block mb-2">{"\u2705"}</span>
                  <p
                    className="text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {search.trim()
                      ? "No matches found."
                      : "All catalog items are already added to this trip."}
                  </p>
                </div>
              )}

              {/* Ensembles section */}
              {relevantEnsembles.length > 0 && !search.trim() && (
                <div className="mb-5">
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    {"\uD83E\uDDF3"} Ensembles
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {relevantEnsembles.map((ensemble) => {
                      const isAdding = addingEnsembleId === ensemble.id;
                      const typeCount = ensemble.items.filter(
                        (item) => item.type === activeTab
                      ).length;
                      return (
                        <div
                          key={ensemble.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg
                                     transition-colors duration-150 hover:bg-white/5"
                          style={{ borderLeft: `3px solid ${ACCENT}` }}
                        >
                          <div
                            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${ACCENT}20` }}
                          >
                            {"\uD83E\uDDF3"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {ensemble.name}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: "var(--color-text-dim)" }}
                            >
                              {ensemble.items.length} items ({typeCount} {PACKING_TABS.find((t) => t.id === activeTab)?.label.toLowerCase()})
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddEnsemble(ensemble.id)}
                            disabled={isAdding}
                            className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                       cursor-pointer transition-all duration-150 hover:brightness-110
                                       disabled:opacity-40"
                            style={{
                              backgroundColor: ACCENT,
                              color: "var(--color-bg-deep)",
                            }}
                          >
                            {isAdding ? "..." : "+ All"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <hr className="mt-4 border-white/5" />
                </div>
              )}

              {Object.entries(grouped).map(([category, categoryItems]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    {category}
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {categoryItems.map((item) => {
                      const priorityColor =
                        TICKET_COLORS[item.priority] ?? TICKET_COLORS.C;
                      const isAdding = addingId === item.id;
                      return (
                        <motion.div
                          key={item.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg
                                     transition-colors duration-150 hover:bg-white/5"
                          style={{
                            borderLeft: `3px solid ${priorityColor.border}`,
                          }}
                          layout
                          exit={{ opacity: 0, x: -20 }}
                        >
                          {/* Photo thumbnail */}
                          {showPhoto && (item.photoSets?.[0] || item.photos?.[0]) && (
                            <img
                              src={item.photoSets?.[0]?.thumbnail ?? item.photos![0]}
                              alt=""
                              className="flex-shrink-0 w-8 h-8 rounded object-cover"
                            />
                          )}

                          {/* Item info */}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              style={{
                                color: "var(--color-text-primary)",
                              }}
                            >
                              {item.name}
                            </p>
                            {item.notes && (
                              <p
                                className="text-xs truncate"
                                style={{
                                  color: "var(--color-text-dim)",
                                }}
                              >
                                {item.notes}
                              </p>
                            )}
                          </div>

                          {/* Priority badge */}
                          <div
                            className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center
                                       text-[10px] font-bold"
                            style={{
                              backgroundColor: priorityColor.bg,
                              color: priorityColor.border,
                            }}
                          >
                            {item.priority}
                          </div>

                          {/* Add button */}
                          <button
                            onClick={() => handleAdd(item.id)}
                            disabled={isAdding}
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                                       cursor-pointer transition-all duration-150 hover:brightness-110
                                       disabled:opacity-40"
                            style={{
                              backgroundColor: ACCENT,
                              color: "var(--color-bg-deep)",
                            }}
                          >
                            <span className="text-sm font-bold">+</span>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Close button */}
            <div className="px-6 py-4 border-t border-white/5">
              <button
                onClick={() => {
                  setSearch("");
                  onClose();
                }}
                className="w-full px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer
                           transition-colors duration-200 hover:bg-white/5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
