"use client";

// ==================== COLLECTION FORM PARTS ====================
// The pieces the collection dialogs share (CollectionItemModal,
// CollectionBulkAddModal): the dialog frame, labels, text inputs, single-choice
// chips, an input for each of the four field types (text, number with its
// unit, yes/no, a choice list) and a date row. Styled like WishFormModal, with
// colours from the theme tokens only.

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CollectionFieldDef } from "@shared/types/collection";

export const ACCENT = "var(--color-gold)";

export const INPUT_CLASS = "w-full rounded-lg px-3 py-2.5 text-sm outline-none border border-white/10 focus:border-[var(--color-gold)] transition-colors duration-200";
export const INPUT_STYLE = { backgroundColor: "var(--color-bg-deep)", color: "var(--color-text-primary)" };

// ==================== DIALOG ====================

export function Dialog({ visible, label, onClose, wide, children }: {
  visible: boolean; label: string; onClose: () => void; wide?: boolean; children: ReactNode;
}) {
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
          style={{ backgroundColor: "var(--color-overlay)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={label}
            className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded-2xl p-6 border border-white/10`}
            style={{ backgroundColor: "var(--color-bg-card)" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==================== FIELDS ====================

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
      {children}
    </label>
  );
}

/** Pick one; tapping the picked one again clears it when `clearable`. */
export function Chips<T extends string>({ options, value, onChange, clearable = true, label }: {
  options: { value: T; label: string }[]; value: T | undefined; onChange: (v: T | undefined) => void;
  clearable?: boolean; label?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on}
            onClick={() => onChange(on && clearable ? undefined : o.value)}
            className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: on ? ACCENT : "var(--color-surface-raised)",
              color: on ? "var(--color-bg-deep)" : "var(--color-text-primary)",
              border: `1px solid ${on ? ACCENT : "var(--color-border-default)"}`,
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** One of the category's fields, by its type. `value` is what's typed (or true/false for yes/no). */
export function FieldInput({ def, value, onChange }: {
  def: CollectionFieldDef; value: string | boolean | undefined; onChange: (v: string | boolean) => void;
}) {
  const id = `collection-field-${def.id}`;
  if (def.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-text-primary)" }}>
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4" style={{ accentColor: ACCENT }} />
        {def.name}
      </label>
    );
  }
  if (def.type === "choice") {
    return (
      <div>
        <Label>{def.name}</Label>
        <Chips label={def.name} options={(def.choices ?? []).map((c) => ({ value: c, label: c }))}
          value={typeof value === "string" && value ? value : undefined} onChange={(v) => onChange(v ?? "")} />
      </div>
    );
  }
  return (
    <div>
      <Label htmlFor={id}>{def.unit ? `${def.name} (${def.unit})` : def.name}</Label>
      <input id={id} type="text" inputMode={def.type === "number" ? "decimal" : undefined}
        value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS} style={INPUT_STYLE} />
    </div>
  );
}

/** A calendar day ("YYYY-MM-DD", as the browser's date input gives it), or blank. */
export function DateInput({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  const id = `collection-date-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input id={id} type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}
        className={INPUT_CLASS} style={{ ...INPUT_STYLE, colorScheme: "light dark" }} />
    </div>
  );
}
