"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Wish } from "@/lib/db";
import { useCatalogWishes } from "@/hooks/use-trip-wishes";
import { TICKET_COLORS, getTagIcon } from "@/lib/constants";

interface WishCatalogPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectWish: (wishId: string) => Promise<void>;
}

const ACCENT = "var(--color-gold)";

export default function WishCatalogPickerModal({
  visible,
  onClose,
  onSelectWish,
}: WishCatalogPickerModalProps) {
  const { items, loading } = useCatalogWishes();
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        (item.notes?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search]);

  // Group by first tag or "Other"
  const grouped = useMemo(() => {
    const groups: Record<string, Wish[]> = {};
    for (const item of filteredItems) {
      const cat = item.tags[0] ?? "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [filteredItems]);

  const handleAdd = async (wishId: string) => {
    setAddingId(wishId);
    try {
      await onSelectWish(wishId);
    } finally {
      setAddingId(null);
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
                {"\u2B50"} Add from Catalog
              </h2>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search wishes..."
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none
                           border border-white/10 focus:border-[var(--color-gold)]
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
                  <span className="text-3xl block mb-2">{"\u2B50"}</span>
                  <p
                    className="text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    No wishes in your catalog yet.
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    Wishes you create will appear here for future trips.
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
                      : "All catalog wishes are already added to this trip."}
                  </p>
                </div>
              )}

              {Object.entries(grouped).map(([tagId, groupItems]) => (
                <div key={tagId} className="mb-4 last:mb-0">
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    {getTagIcon(tagId)} {tagId}
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {groupItems.map((item) => {
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
                          {/* Item info */}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              style={{
                                color: "var(--color-text-primary)",
                              }}
                            >
                              {item.title}
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

                          {/* Tag icons */}
                          <div className="flex gap-0.5 flex-shrink-0">
                            {item.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs">
                                {getTagIcon(tag)}
                              </span>
                            ))}
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
