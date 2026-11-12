"use client";

// ==================== COLLECTION CATEGORY PICKER ====================
// "What do you collect?" (dland-wishes docs/collections-design.md §3a): every
// built-in category as a chip, then the user's own, plus "+ Your own". Opens
// by itself on the first visit to the Collection page, and from the
// sidebar's "Edit categories". Done saves through applyCollectionCategoryChoice
// (@shared/collections); Not now only marks the first visit done, so picking
// none is fine. The Planner has no category limit (§8a).

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DialogOverlay from "@/components/DialogOverlay";
import { updateCollectionSettings } from "@/lib/collection-store";
import type { CollectionSettings } from "@/lib/db";
import {
  applyCollectionCategoryChoice,
  finishCollectionFirstRun,
  newUserCollectionCategoryId,
  resolveCollectionCategory,
  type ResolvedCollectionCategory,
} from "@shared/collections";
import { BUILT_IN_COLLECTION_CATEGORIES } from "@shared/constants/collections";
import type { UserCollectionCategory } from "@shared/types/collection";

const ACCENT = "var(--color-gold)";

type NewCategory = Omit<UserCollectionCategory, "deletedAt">;

interface Props {
  visible: boolean;
  settings: CollectionSettings;
  onClose: () => void;
}

/** The chips: built-ins in their usual order, then the user's own (saved, then new). */
function pickerCategories(settings: CollectionSettings, added: NewCategory[]): ResolvedCollectionCategory[] {
  const saved = [
    ...BUILT_IN_COLLECTION_CATEGORIES.map((c) => c.id),
    ...settings.userCategories.filter((c) => !c.deletedAt).map((c) => c.id),
  ].map((id) => resolveCollectionCategory(settings, id)!);
  return [...saved, ...added.map((c) => ({ ...c, icon: c.icon || "⭐", builtIn: false, enabled: false }))];
}

export default function CollectionCategoryPicker({ visible, settings, onClose }: Props) {
  const [chosen, setChosen] = useState<string[]>(settings.enabled);
  const [added, setAdded] = useState<NewCategory[]>([]);
  const [error, setError] = useState("");
  const categories = useMemo(() => pickerCategories(settings, added), [settings, added]);
  const firstVisit = !settings.firstRunDone;

  useEffect(() => {
    if (!visible) return;
    setChosen(settings.enabled);
    setAdded([]);
    setError("");
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (rule: (s: CollectionSettings) => CollectionSettings) => {
    try {
      await updateCollectionSettings(rule);
      onClose();
    } catch (e) {
      console.error("[CollectionCategoryPicker] saving failed:", e);
      setError("Your categories weren't saved. Please try again.");
    }
  };
  const done = () => save((s) => applyCollectionCategoryChoice(s, chosen, added, Date.now()));
  const notNow = () => save((s) => finishCollectionFirstRun(s, Date.now()));

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") notNow(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const toggle = (id: string) =>
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const addOwn = (name: string, icon: string) => {
    const category: NewCategory = { id: newUserCollectionCategoryId(), name, icon: icon || undefined, layout: "shelf", trades: false };
    setAdded((a) => [...a, category]);
    setChosen((c) => [...c, category.id]);
  };

  return (
    <AnimatePresence>
      {visible && (
        <DialogOverlay
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "var(--color-overlay)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={notNow}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="collection-picker-title"
            className="w-full max-w-xl rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-strong)" }}
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="collection-picker-title" className="text-lg font-bold" style={{ color: "var(--color-heading)" }}>
              What do you collect?
            </h2>
            <p className="mt-1 mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {firstVisit
                ? "Pick any you collect. You can change them any time."
                : "Switching a category off hides it and its items. Nothing is deleted."}
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <CategoryChip key={cat.id} category={cat} selected={chosen.includes(cat.id)} onClick={() => toggle(cat.id)} />
              ))}
            </div>
            <OwnCategoryForm onAdd={addOwn} />
            {error && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={notNow} className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ color: "var(--color-text-secondary)" }}>
                {firstVisit ? "Not now" : "Cancel"}
              </button>
              <button onClick={done} className="px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
                Done
              </button>
            </div>
          </motion.div>
        </DialogOverlay>
      )}
    </AnimatePresence>
  );
}

function CategoryChip({ category, selected, onClick }: { category: ResolvedCollectionCategory; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={selected} onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors"
      style={{
        backgroundColor: selected ? ACCENT : "var(--color-surface-raised)",
        color: selected ? "var(--color-bg-deep)" : "var(--color-text-primary)",
        border: `1px solid ${selected ? ACCENT : "var(--color-border-default)"}`,
      }}
    >
      <span aria-hidden="true">{category.icon}</span>
      {category.name}
      {selected && <span aria-hidden="true">✓</span>}
    </button>
  );
}

function OwnCategoryForm({ onAdd }: { onAdd: (name: string, icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), icon.trim());
    setName(""); setIcon(""); setOpen(false);
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer"
        style={{ color: ACCENT, border: `1px dashed ${ACCENT}` }}>
        + Your own
      </button>
    );
  }
  const input = { backgroundColor: "var(--color-surface-sunken)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-input)" };
  return (
    <div className="mt-3 flex items-center gap-2">
      <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="⭐" aria-label="Icon (an emoji)" maxLength={8}
        className="w-14 px-2 py-2 rounded-lg text-center text-sm outline-none" style={input} />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Starbucks mugs" aria-label="Category name" autoFocus
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={input} />
      <button type="button" onClick={submit} disabled={!name.trim()} className="px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40"
        style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
        Add
      </button>
    </div>
  );
}
