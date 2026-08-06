"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EnsembleWithItems } from "@/hooks/use-ensembles";

// ==================== TYPES ====================

interface CatalogContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  itemId: string;
  ensembles: EnsembleWithItems[];
  onAddToEnsemble: (ensembleId: string, itemId: string) => void;
  onCreateEnsemble: (itemId: string) => void;
  onClose: () => void;
}

const ACCENT = "var(--color-accent-prepare)";

// ==================== COMPONENT ====================

export default function CatalogContextMenu({
  visible,
  position,
  itemId,
  ensembles,
  onAddToEnsemble,
  onCreateEnsemble,
  onClose,
}: CatalogContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, onClose]);

  // Clamp position to viewport
  const clampedX = Math.min(position.x, window.innerWidth - 240);
  const clampedY = Math.min(position.y, window.innerHeight - 300);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={menuRef}
          className="fixed z-[100] w-56 rounded-xl shadow-2xl overflow-hidden
                     border border-white/10"
          style={{
            left: clampedX,
            top: clampedY,
            backgroundColor: "var(--color-bg-card)",
          }}
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ duration: 0.12 }}
          role="menu"
          aria-label="Add to ensemble"
        >
          {/* Header */}
          <div
            className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide border-b"
            style={{
              color: "var(--color-text-dim)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            Add to Ensemble
          </div>

          {/* Ensemble list */}
          <div className="max-h-48 overflow-y-auto">
            {ensembles.length > 0 ? (
              ensembles.map((ensemble) => {
                const alreadyIn = ensemble.itemIds.includes(itemId);
                return (
                  <button
                    key={ensemble.id}
                    onClick={() => {
                      if (!alreadyIn) {
                        onAddToEnsemble(ensemble.id, itemId);
                      }
                      onClose();
                    }}
                    disabled={alreadyIn}
                    role="menuitem"
                    aria-label={alreadyIn ? `Already in ${ensemble.name}` : `Add to ${ensemble.name}`}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left
                               cursor-pointer transition-colors hover:bg-white/5
                               disabled:opacity-40 disabled:cursor-default"
                  >
                    <span className="text-sm flex-shrink-0">
                      {ensemble.coverPhoto ? (
                        <img
                          src={ensemble.coverPhoto}
                          alt=""
                          className="w-5 h-5 rounded object-cover"
                        />
                      ) : (
                        "\uD83E\uDDF3"
                      )}
                    </span>
                    <span
                      className="text-xs font-medium truncate flex-1"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {ensemble.name}
                    </span>
                    <span
                      className="text-[10px] flex-shrink-0"
                      style={{ color: "var(--color-text-dim)" }}
                    >
                      {alreadyIn ? "\u2713" : `${ensemble.items.length} items`}
                    </span>
                  </button>
                );
              })
            ) : (
              <div
                className="px-3 py-3 text-xs text-center"
                style={{ color: "var(--color-text-dim)" }}
              >
                No ensembles yet
              </div>
            )}
          </div>

          {/* Divider + New Ensemble */}
          <div style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
            <button
              onClick={() => {
                onCreateEnsemble(itemId);
                onClose();
              }}
              role="menuitem"
              aria-label="Create new ensemble"
              className="flex items-center gap-2 w-full px-3 py-2.5 text-left
                         cursor-pointer transition-colors hover:bg-white/5"
            >
              <span className="text-sm">+</span>
              <span
                className="text-xs font-semibold"
                style={{ color: ACCENT }}
              >
                New Ensemble...
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
