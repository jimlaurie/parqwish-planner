"use client";

// ==================== UNDO TOAST HOST ====================
// Renders the current toast from lib/undo-toast. Mounted once in the (app)
// layout; pages trigger it via showUndoToast().

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { dismissUndoToast, useUndoToast } from "@/lib/undo-toast";

export default function UndoToastHost() {
  const toast = useUndoToast();
  const [undoing, setUndoing] = useState(false);

  const handleUndo = async () => {
    if (!toast || undoing) return;
    setUndoing(true);
    try {
      await toast.onUndo();
    } catch (err) {
      console.error("[UndoToast] undo failed:", err);
    } finally {
      setUndoing(false);
      dismissUndoToast(toast.id);
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto flex items-center gap-4 rounded-full pl-5 pr-2 py-2 shadow-lg max-w-full"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border-strong)",
            }}
          >
            <span className="text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
              {toast.message}
            </span>
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoing}
              className="shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold cursor-pointer
                         transition-colors duration-150 hover:bg-white/10 disabled:opacity-50"
              style={{ color: "var(--color-gold)" }}
            >
              {undoing ? "Undoing…" : "Undo"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
