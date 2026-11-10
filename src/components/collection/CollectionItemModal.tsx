"use client";

// ==================== COLLECTION ITEM MODAL ====================
// Add or edit one collection item (dland-wishes docs/collections-design.md §7):
// photos, name, category, Have / Want / Trade (and Gone when editing), the
// ticket for a Want, "Also for sale" for a Trade, then "More details" (open
// when editing): the category's fields in order, how I got it, how it left
// for Gone, how many, tags, a link and notes. Delete asks first. The rules are
// shared with Pal (@shared/collection-editor); saving keeps what the form
// doesn't show (hidden fields' values, the trip and shops it came from).

import { useEffect, useMemo, useState } from "react";
import PhotoPicker from "@/components/PhotoPicker";
import PriorityPicker from "@/components/PriorityPicker";
import { ACCENT, Chips, DateInput, Dialog, FieldInput, INPUT_CLASS, INPUT_STYLE, Label } from "./CollectionFormParts";
import { deleteCollectionItem, newCollectionItemId, saveCollectionItem } from "@/lib/collection-store";
import { useAppStore } from "@/lib/store";
import type { CollectionItem, CollectionSettings, PhotoSet } from "@/lib/db";
import { collectionFormFields, enabledCollectionCategories, resolveCollectionCategory } from "@shared/collections";
import {
  COLLECTION_ACQUIRED_HOW, COLLECTION_GONE_HOW, collectionDraftFromItem, collectionDraftProblem, collectionEditorStates,
  collectionItemFromDraft, type CollectionDraftFields,
} from "@shared/collection-editor";
import { COLLECTION_TAB_LABELS } from "@shared/collection-view";
import type { Priority } from "@shared/types/common";
import type { CollectionFieldDef, CollectionState } from "@shared/types/collection";

interface Props {
  visible: boolean;
  settings: CollectionSettings;
  /** The item to edit, or undefined to add one. */
  item?: CollectionItem;
  defaultCategory: string;
  defaultState: CollectionState;
  onClose: () => void;
}

type SetField = <K extends keyof CollectionDraftFields>(key: K, value: CollectionDraftFields[K]) => void;

/** The categories offered: those switched on, plus the item's own if it's off. */
function categoryOptions(settings: CollectionSettings, current: string) {
  const on = enabledCollectionCategories(settings);
  const own = on.some((c) => c.id === current) ? undefined : resolveCollectionCategory(settings, current);
  return [...on, ...(own ? [own] : [])];
}

export default function CollectionItemModal({ visible, settings, item, defaultCategory, defaultState, onClose }: Props) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const [draft, setDraft] = useState<CollectionDraftFields>(() => collectionDraftFromItem(item, defaultCategory, defaultState));
  const [photoSets, setPhotoSets] = useState<PhotoSet[]>(item?.photoSets ?? []);
  const [problem, setProblem] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(collectionDraftFromItem(item, defaultCategory, defaultState));
    setPhotoSets(item?.photoSets ?? []);
    setProblem("");
    setConfirmDelete(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const set: SetField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const fields = useMemo(() => collectionFormFields(settings, draft.category), [settings, draft.category]);
  const categories = useMemo(() => categoryOptions(settings, draft.category), [settings, draft.category]);
  const category = categories.find((c) => c.id === draft.category);
  const states = collectionEditorStates(!!category?.trades, draft.state, !item);

  const save = async () => {
    const why = collectionDraftProblem(draft, fields, photoSets.length > 0);
    if (why) { setProblem(why); return; }
    try {
      const now = Date.now();
      await saveCollectionItem(collectionItemFromDraft(draft, fields, photoSets, item, newCollectionItemId(now), currentUserId, now));
      onClose();
    } catch (e) {
      console.error("[CollectionItemModal] saving failed:", e);
      setProblem("The item wasn't saved. Please try again.");
    }
  };
  const remove = async () => {
    if (!item) return;
    try { await deleteCollectionItem(item.id); onClose(); } catch (e) {
      console.error("[CollectionItemModal] deleting failed:", e);
      setProblem("The item is still in your collection. Please try again.");
    }
  };

  return (
    <Dialog visible={visible} label={item ? "Edit collection item" : "Add to collection"} onClose={onClose}>
      <h2 className="text-xl font-bold mb-5" style={{ color: ACCENT }}>{item ? "Edit item" : "Add to collection"}</h2>
      <div className="flex flex-col gap-4">
        <div><Label>Photos</Label><PhotoPicker photoSets={photoSets} onChangeMultiRes={setPhotoSets} /></div>
        <div>
          <Label htmlFor="collection-name">Name</Label>
          <input id="collection-name" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Figment 50th"
            autoFocus={!item} className={INPUT_CLASS} style={INPUT_STYLE} />
        </div>
        <div>
          <Label>Category</Label>
          <Chips label="Category" clearable={false} value={draft.category} onChange={(v) => v && set("category", v)}
            options={categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
        </div>
        <Chips label="Have, want or trade" clearable={false} value={draft.state} onChange={(v) => v && set("state", v)}
          options={states.map((s) => ({ value: s, label: COLLECTION_TAB_LABELS[s] }))} />
        {draft.state === "want" && (
          <div><Label>How much do you want it? (E = grail)</Label>
            <PriorityPicker value={draft.priority ?? "A"} onChange={(p) => set("priority", p as Priority)} /></div>
        )}
        {draft.state === "trade" && (
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--color-text-primary)" }}>
            <input type="checkbox" checked={draft.forSale} onChange={(e) => set("forSale", e.target.checked)} className="w-4 h-4" style={{ accentColor: ACCENT }} />
            Also for sale
          </label>
        )}
        <MoreDetails draft={draft} set={set} fields={fields} startOpen={!!item} />
      </div>
      {problem && <p role="alert" className="mt-4 text-sm" style={{ color: "var(--color-error)" }}>{problem}</p>}
      <Actions isEdit={!!item} confirmDelete={confirmDelete} onAskDelete={() => setConfirmDelete(true)}
        onKeep={() => setConfirmDelete(false)} onDelete={remove} onCancel={onClose} onSave={save} />
    </Dialog>
  );
}

// ==================== SECTIONS ====================

function MoreDetails({ draft, set, fields, startOpen }: {
  draft: CollectionDraftFields; set: SetField; fields: CollectionFieldDef[]; startOpen: boolean;
}) {
  const text = (key: "quantity" | "tags" | "externalUrl" | "pricePaid" | "goneNotes", label: string, placeholder = "") => (
    <div>
      <Label htmlFor={`collection-${key}`}>{label}</Label>
      <input id={`collection-${key}`} value={draft[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
        className={INPUT_CLASS} style={INPUT_STYLE} />
    </div>
  );
  return (
    <details open={startOpen} className="pt-2" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
      <summary className="cursor-pointer text-sm font-semibold py-2" style={{ color: "var(--color-text-primary)" }}>More details</summary>
      <div className="flex flex-col gap-4 mt-2">
        {fields.map((def) => (
          <FieldInput key={def.id} def={def} value={draft.details[def.id]} onChange={(v) => set("details", { ...draft.details, [def.id]: v })} />
        ))}
        <SectionTitle>How I got it</SectionTitle>
        <DateInput label="When I got it" value={draft.acquiredDate} onChange={(v) => set("acquiredDate", v)} />
        <Chips label="How I got it" options={COLLECTION_ACQUIRED_HOW} value={draft.acquiredHow} onChange={(v) => set("acquiredHow", v)} />
        {text("pricePaid", "Price paid", "$")}
        {draft.state === "gone" && (
          <>
            <SectionTitle>How it left</SectionTitle>
            <DateInput label="When it left" value={draft.goneDate} onChange={(v) => set("goneDate", v)} />
            <Chips label="How it left" options={COLLECTION_GONE_HOW} value={draft.goneHow} onChange={(v) => set("goneHow", v)} />
            {text("goneNotes", "Notes on where it went")}
          </>
        )}
        <SectionTitle>Also</SectionTitle>
        {text("quantity", "How many", "1")}
        {text("tags", "Tags (comma separated)", "e.g. 50th, Epcot")}
        {text("externalUrl", "Link", "https://")}
        <div>
          <Label htmlFor="collection-notes">Notes</Label>
          <textarea id="collection-notes" value={draft.notes} onChange={(e) => set("notes", e.target.value)} rows={3}
            className={INPUT_CLASS} style={INPUT_STYLE} />
        </div>
      </div>
    </details>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <div className="text-xs font-bold uppercase tracking-wide pt-1" style={{ color: ACCENT }}>{children}</div>;
}

function Actions({ isEdit, confirmDelete, onAskDelete, onKeep, onDelete, onCancel, onSave }: {
  isEdit: boolean; confirmDelete: boolean; onAskDelete: () => void; onKeep: () => void;
  onDelete: () => void; onCancel: () => void; onSave: () => void;
}) {
  const button = "px-4 py-2 rounded-full text-sm font-semibold cursor-pointer";
  if (confirmDelete) {
    return (
      <div className="mt-6 flex items-center justify-end gap-2">
        <span className="mr-auto text-sm" style={{ color: "var(--color-text-secondary)" }}>Delete this item from your collection?</span>
        <button type="button" onClick={onKeep} className={button} style={{ color: "var(--color-text-secondary)" }}>Keep it</button>
        <button type="button" onClick={onDelete} className={button} style={{ backgroundColor: "var(--color-error)", color: "var(--color-bg-deep)" }}>Delete</button>
      </div>
    );
  }
  return (
    <div className="mt-6 flex items-center gap-2">
      {isEdit && (
        <button type="button" onClick={onAskDelete} className={button} style={{ color: "var(--color-error)" }}>Delete</button>
      )}
      <button type="button" onClick={onCancel} className={`${button} ml-auto`} style={{ color: "var(--color-text-secondary)" }}>Cancel</button>
      <button type="button" onClick={onSave} className={button} style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>Save</button>
    </div>
  );
}
