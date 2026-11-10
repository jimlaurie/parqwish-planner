"use client";

// ==================== COLLECTION CATEGORIES ====================
// The Collection page's Categories dialog (dland-wishes docs/collections-design.md
// §3a, §3b), the Planner's version of Pal's Settings › Collections: every
// category (those on first, in order; then the other built-ins; then the
// user's own) with an on/off box and ▲▼ for those on, "+ Add a category",
// and the selected category's settings beside the list
// (CollectionCategoryDetail), or the field being edited (CollectionFieldPanel).
// Switching a category off hides it and its items; nothing is deleted. The
// Planner has no category limit.

import { useState } from "react";
import { ACCENT, Dialog, INPUT_CLASS, INPUT_STYLE } from "./CollectionFormParts";
import CollectionCategoryDetail from "./CollectionCategoryDetail";
import CollectionFieldPanel from "./CollectionFieldPanel";
import { updateCollectionSettings } from "@/lib/collection-store";
import type { CollectionItem, CollectionSettings } from "@/lib/db";
import {
  addUserCollectionCategory, allCollectionCategories, newUserCollectionCategoryId, setCollectionCategoryEnabled,
  type ResolvedCollectionCategory,
} from "@shared/collections";
import { moveCollectionCategoryBy } from "@shared/collection-categories";
import type { CollectionFieldDef, CollectionSettings as Settings } from "@shared/types/collection";

interface Props {
  visible: boolean;
  settings: CollectionSettings;
  items: CollectionItem[];
  onClose: () => void;
}

type Panel = { kind: "category" } | { kind: "field"; field?: CollectionFieldDef };

export default function CollectionCategoriesModal({ visible, settings, items, onClose }: Props) {
  const categories = allCollectionCategories(settings);
  const [selected, setSelected] = useState<string>();
  const [panel, setPanel] = useState<Panel>({ kind: "category" });
  const [problem, setProblem] = useState("");
  const selectedId = categories.some((c) => c.id === selected) ? selected! : categories[0]?.id;

  const save = async (rule: (s: Settings) => Settings): Promise<boolean> => {
    setProblem("");
    try { await updateCollectionSettings(rule); return true; } catch (e) {
      console.error("[CollectionCategoriesModal] saving failed:", e);
      setProblem(e instanceof Error ? e.message.replace("[collections] ", "") : "Please try again.");
      return false;
    }
  };
  const select = (id: string) => { setSelected(id); setPanel({ kind: "category" }); };
  const addCategory = async (name: string, icon: string) => {
    const id = newUserCollectionCategoryId();
    if (await save((s) => addUserCollectionCategory(s, { id, name, icon: icon || undefined, layout: "shelf", trades: false }, Date.now()))) select(id);
  };

  return (
    <Dialog visible={visible} label="Collection categories" onClose={onClose} wide>
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-bold mr-auto" style={{ color: ACCENT }}>Categories</h2>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer"
          style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>Done</button>
      </div>
      <p className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Switching a category off hides it and its items. Nothing is deleted.</p>
      {problem && <p role="alert" className="mb-3 text-sm" style={{ color: "var(--color-error)" }}>{problem}</p>}
      <div className="flex flex-col sm:flex-row gap-6">
        <CategoryList categories={categories} enabled={settings.enabled} selected={selectedId} onSelect={select} onAdd={addCategory}
          onToggle={(id, on) => save((s) => setCollectionCategoryEnabled(s, id, on, Date.now()))}
          onMove={(id, d) => save((s) => moveCollectionCategoryBy(s, id, d, Date.now()))} />
        <div className="flex-1 min-w-0">
          {selectedId && panel.kind === "category" && (
            <CollectionCategoryDetail settings={settings} categoryId={selectedId} items={items}
              onEditField={(field) => setPanel({ kind: "field", field })} onDeleted={() => setSelected(undefined)} />
          )}
          {selectedId && panel.kind === "field" && (
            <CollectionFieldPanel key={panel.field?.id ?? "new"} categoryId={selectedId} field={panel.field} items={items}
              onDone={() => setPanel({ kind: "category" })} />
          )}
        </div>
      </div>
    </Dialog>
  );
}

// ==================== LIST ====================

function CategoryList({ categories, enabled, selected, onSelect, onToggle, onMove, onAdd }: {
  categories: ResolvedCollectionCategory[]; enabled: string[]; selected: string | undefined;
  onSelect: (id: string) => void; onToggle: (id: string, on: boolean) => void;
  onMove: (id: string, delta: -1 | 1) => void; onAdd: (name: string, icon: string) => void;
}) {
  const lastOn = enabled.length - 1;
  return (
    <div className="sm:w-64 shrink-0">
      <ul className="flex flex-col gap-0.5" aria-label="Categories">
        {categories.map((cat, i) => {
          const on = cat.id === selected;
          const arrow = "px-1 text-xs cursor-pointer disabled:opacity-30 disabled:cursor-default";
          return (
            <li key={cat.id} className="flex items-center gap-1 rounded-lg px-1"
              style={{ backgroundColor: on ? `color-mix(in srgb, ${ACCENT} 12%, transparent)` : "transparent" }}>
              <input type="checkbox" checked={cat.enabled} onChange={(e) => onToggle(cat.id, e.target.checked)}
                aria-label={`Collect ${cat.name}`} className="w-4 h-4 shrink-0" style={{ accentColor: ACCENT }} />
              <button type="button" onClick={() => onSelect(cat.id)} aria-current={on ? "true" : undefined}
                className="flex-1 text-left px-2 py-1.5 text-sm cursor-pointer truncate" style={{ color: on ? ACCENT : "var(--color-text-primary)" }}>
                <span aria-hidden="true">{cat.icon}</span> {cat.name}
              </button>
              {cat.enabled && (
                <>
                  <button type="button" onClick={() => onMove(cat.id, -1)} disabled={i === 0} aria-label={`Move ${cat.name} up`}
                    className={arrow} style={{ color: "var(--color-text-secondary)" }}>▲</button>
                  <button type="button" onClick={() => onMove(cat.id, 1)} disabled={i === lastOn} aria-label={`Move ${cat.name} down`}
                    className={arrow} style={{ color: "var(--color-text-secondary)" }}>▼</button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <AddCategory onAdd={onAdd} />
    </div>
  );
}

function AddCategory({ onAdd }: { onAdd: (name: string, icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const submit = () => { if (!name.trim()) return; onAdd(name.trim(), icon.trim()); setName(""); setIcon(""); setOpen(false); };
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm font-semibold cursor-pointer" style={{ color: ACCENT }}>+ Add a category</button>;
  }
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="w-14 shrink-0">
        <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="⭐" aria-label="Icon (an emoji)" maxLength={8}
          className={`${INPUT_CLASS} text-center`} style={INPUT_STYLE} />
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Starbucks mugs" aria-label="Category name" autoFocus
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }} className={INPUT_CLASS} style={INPUT_STYLE} />
      <button type="button" onClick={submit} disabled={!name.trim()} className="text-sm font-semibold cursor-pointer disabled:opacity-40" style={{ color: ACCENT }}>Add</button>
    </div>
  );
}
