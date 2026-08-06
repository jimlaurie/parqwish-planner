"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { PACKING_TABS } from "@/lib/constants";
import type { PackingItem } from "@/lib/db";
import type { EnsembleWithItems, EnsembleFormData } from "@/hooks/use-ensembles";

const ACCENT = "var(--color-accent-prepare)";

// ==================== TYPES ====================

interface EnsembleBuilderModalProps {
  visible: boolean;
  ensemble?: EnsembleWithItems | null;
  allPackingItems: PackingItem[];
  initialItemIds?: string[];
  onClose: () => void;
  onSave: (data: EnsembleFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

// ==================== COMPONENT ====================

export default function EnsembleBuilderModal({
  visible,
  ensemble,
  allPackingItems,
  initialItemIds,
  onClose,
  onSave,
  onDelete,
}: EnsembleBuilderModalProps) {
  const isEditMode = !!ensemble;
  const focusRef = useFocusTrap(visible, onClose);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load existing ensemble in edit mode
  useEffect(() => {
    if (visible && ensemble) {
      setName(ensemble.name);
      setDescription(ensemble.description ?? "");
      setSelectedItemIds([...ensemble.itemIds]);
    } else if (visible && !ensemble) {
      setName("");
      setDescription("");
      setSelectedItemIds(initialItemIds ?? []);
    }
    setSearchQuery("");
    setFilterType(null);
    setShowDeleteConfirm(false);
  }, [visible, ensemble]);

  // Filter available items
  const filteredItems = useMemo(() => {
    let items = allPackingItems;
    if (filterType) {
      items = items.filter((item) => item.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [allPackingItems, filterType, searchQuery]);

  // Items already in the ensemble
  const selectedItems = useMemo(
    () =>
      selectedItemIds
        .map((id) => allPackingItems.find((item) => item.id === id))
        .filter((item): item is PackingItem => !!item),
    [selectedItemIds, allPackingItems]
  );

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const removeItem = (itemId: string) => {
    setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
  };

  const canSave = name.trim().length > 0 && selectedItemIds.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        itemIds: selectedItemIds,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ensemble || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(ensemble.id);
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <motion.div
        ref={focusRef}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--color-bg-card)", willChange: "transform, opacity" }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-label={isEditMode ? "Edit Ensemble" : "New Ensemble"}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-white/10"
        >
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--color-heading)" }}
          >
            {isEditMode ? "Edit Ensemble" : "New Ensemble"}
          </h2>
          <button
            onClick={onClose}
            className="text-xl cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "var(--color-text-primary)" }}
            aria-label="Close modal"
          >
            {"\u2715"}
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {/* Name + Description */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Ensemble Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Day 1 Park Outfit"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none
                         border border-white/10 focus:border-white/25 transition-colors"
              style={{
                backgroundColor: "var(--color-bg-deep)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none
                         border border-white/10 focus:border-white/25 transition-colors"
              style={{
                backgroundColor: "var(--color-bg-deep)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* Selected Items */}
          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Items in Ensemble ({selectedItemIds.length})
            </label>

            {selectedItems.length === 0 ? (
              <p
                className="text-xs py-3 text-center rounded-lg"
                style={{
                  color: "var(--color-text-dim)",
                  backgroundColor: "var(--color-bg-deep)",
                }}
              >
                No items selected yet. Pick items from the catalog below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence>
                  {selectedItems.map((item) => {
                    const tab = PACKING_TABS.find((t) => t.id === item.type);
                    return (
                      <motion.span
                        key={item.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${ACCENT}20`,
                          color: ACCENT,
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        {tab?.icon} {item.name}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer"
                          aria-label={`Remove ${item.name} from ensemble`}
                        >
                          {"\u2715"}
                        </button>
                      </motion.span>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="border-white/8" />

          {/* Item Picker */}
          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Pick Items from Catalog
            </label>

            {/* Search + type filter */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none
                           border border-white/10 focus:border-white/25 transition-colors"
                style={{
                  backgroundColor: "var(--color-bg-deep)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            {/* Type filter chips */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <button
                onClick={() => setFilterType(null)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer
                           transition-colors"
                style={{
                  backgroundColor: !filterType ? `color-mix(in srgb, ${ACCENT} 19%, transparent)` : "var(--color-surface-raised)",
                  color: !filterType ? ACCENT : "var(--color-text-dim)",
                }}
              >
                All
              </button>
              {PACKING_TABS.filter((t) => t.id !== "dining").map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(filterType === tab.id ? null : tab.id)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer
                             transition-colors"
                  style={{
                    backgroundColor: filterType === tab.id ? `color-mix(in srgb, ${ACCENT} 19%, transparent)` : "var(--color-surface-raised)",
                    color: filterType === tab.id ? ACCENT : "var(--color-text-dim)",
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Item list */}
            <div
              className="max-h-48 overflow-y-auto rounded-lg"
              style={{ backgroundColor: "var(--color-bg-deep)" }}
            >
              {filteredItems.length === 0 ? (
                <p
                  className="text-xs py-4 text-center"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  {allPackingItems.length === 0
                    ? "No catalog items yet. Create items in Prepare first."
                    : "No items match your search."}
                </p>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const tab = PACKING_TABS.find((t) => t.id === item.type);

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`${isSelected ? "Remove" : "Add"} ${item.name}`}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-left
                                 cursor-pointer transition-colors hover:bg-white/5"
                      style={{
                        backgroundColor: isSelected ? `${ACCENT}10` : "transparent",
                      }}
                    >
                      {/* Checkbox */}
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0"
                        style={{
                          border: `2px solid ${isSelected ? ACCENT : "var(--color-text-dim)"}`,
                          backgroundColor: isSelected ? ACCENT : "transparent",
                          color: isSelected ? "var(--color-bg-deep)" : "transparent",
                        }}
                      >
                        {isSelected ? "\u2713" : ""}
                      </span>

                      <span className="flex-shrink-0">{tab?.icon}</span>
                      <span
                        className="text-xs font-medium truncate flex-1"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {item.name}
                      </span>
                      <span
                        className="text-[10px] flex-shrink-0"
                        style={{ color: "var(--color-text-dim)" }}
                      >
                        {item.category}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t border-white/10"
        >
          <div>
            {isEditMode && onDelete && !showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs cursor-pointer transition-colors hover:opacity-80"
                style={{ color: "var(--color-error)" }}
              >
                Delete Ensemble
              </button>
            )}
            {showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--color-error)" }}>
                  Delete this ensemble?
                </span>
                <button
                  onClick={handleDelete}
                  className="text-xs font-bold cursor-pointer px-2 py-1 rounded"
                  style={{ backgroundColor: "var(--color-error)", color: "white" }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs cursor-pointer"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm cursor-pointer
                         transition-colors hover:bg-white/5"
              style={{ color: "var(--color-text-muted)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer
                         transition-all duration-150 hover:brightness-110
                         disabled:opacity-40 disabled:cursor-default"
              style={{
                backgroundColor: ACCENT,
                color: "var(--color-bg-deep)",
              }}
            >
              {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Ensemble"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
