"use client";

// ==================== TEMPLATE PICKER ====================
// "+ New Trip › From Template": lists the templates with what each holds, so
// they can be told apart. Picking one creates the trip straight away (today's
// date, the template's name) and the Home page opens it in the trip editor.

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type Trip } from "@/lib/db";
import { nameFromTemplate, templateSummary } from "@/lib/new-trip";

interface TemplatePickerModalProps {
  visible: boolean;
  templates: Trip[];
  onPick: (templateId: string) => void;
  onClose: () => void;
}

/** How many wishes and packing items each template holds, by template id. */
function useTemplateCounts(templateIds: string[]) {
  return useLiveQuery(async () => {
    const counts: Record<string, { wishes: number; packing: number }> = {};
    if (!templateIds.length) return counts;
    const [wishes, packing] = await Promise.all([
      db.tripWishSelections.where("tripId").anyOf(templateIds).toArray(),
      db.tripPackingSelections.where("tripId").anyOf(templateIds).toArray(),
    ]);
    for (const id of templateIds) counts[id] = { wishes: 0, packing: 0 };
    for (const s of wishes) counts[s.tripId].wishes++;
    for (const s of packing) counts[s.tripId].packing++;
    return counts;
  }, [templateIds.join("|")], {} as Record<string, { wishes: number; packing: number }>);
}

export default function TemplatePickerModal({ visible, templates, onPick, onClose }: TemplatePickerModalProps) {
  // The default template first, then by name.
  const sorted = useMemo(
    () => [...templates].sort((a, b) =>
      Number(!!b.isDefaultTemplate) - Number(!!a.isDefaultTemplate) || a.name.localeCompare(b.name)),
    [templates],
  );
  const counts = useTemplateCounts(sorted.map((t) => t.id));

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "var(--color-overlay)", willChange: "opacity" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl p-6 border border-white/10"
            style={{ backgroundColor: "var(--color-bg-card)", willChange: "transform, opacity" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-picker-title"
          >
            <h2 id="template-picker-title" className="text-xl font-bold mb-1" style={{ color: "var(--color-heading)" }}>
              {"\u{1F4CB}"} New Trip from a Template
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
              The trip starts today; you&rsquo;ll set its dates next.
            </p>

            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
              {sorted.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  autoFocus={i === 0}
                  onClick={() => onPick(t.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left cursor-pointer border transition-colors
                             hover:bg-[var(--color-surface-hover)] focus-visible:outline-2 focus-visible:outline-[var(--color-gold)]"
                  style={{ borderColor: t.isDefaultTemplate ? "var(--color-gold)" : "var(--color-border-subtle)" }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                      {nameFromTemplate(t.name)}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {templateSummary({ ...(counts[t.id] ?? { wishes: 0, packing: 0 }), hotels: t.hotels, flights: t.flights, notes: t.notes })}
                    </span>
                  </span>
                  {t.isDefaultTemplate && (
                    <span className="text-xs font-semibold shrink-0" style={{ color: "var(--color-gold)" }}>
                      {"★"} Default
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-white/5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
