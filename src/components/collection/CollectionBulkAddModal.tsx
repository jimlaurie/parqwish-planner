"use client";

// ==================== COLLECTION BULK ADD ====================
// "Add several" (dland-wishes docs/collections-design.md §7): drop or pick
// many photos, then name them in a list (each starts as its file's name). One
// category and one Have / Want / Trade for all of them; each becomes an item
// through the shared editor rules (@shared/collection-editor), saved in one
// write. Photos are compressed to the usual three sizes as they're added.

import { useEffect, useState } from "react";
import { ACCENT, Chips, Dialog, INPUT_CLASS, INPUT_STYLE, Label } from "./CollectionFormParts";
import { newCollectionItemId, saveCollectionItems } from "@/lib/collection-store";
import { compressImageMultiRes } from "@/lib/image-utils";
import { useAppStore } from "@/lib/store";
import type { CollectionSettings, PhotoSet } from "@/lib/db";
import { collectionFormFields, enabledCollectionCategories } from "@shared/collections";
import { collectionDraftFromItem, collectionEditorStates, collectionItemFromDraft } from "@shared/collection-editor";
import { COLLECTION_TAB_LABELS } from "@shared/collection-view";
import type { CollectionState } from "@shared/types/collection";

interface Props {
  visible: boolean;
  settings: CollectionSettings;
  defaultCategory: string;
  defaultState: CollectionState;
  onClose: () => void;
}

interface Row { key: string; name: string; photo: PhotoSet }

/** "figment-50th_pin.JPG" → "figment 50th pin": a starting name from the file. */
export function nameFromFile(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export default function CollectionBulkAddModal({ visible, settings, defaultCategory, defaultState, onClose }: Props) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const [rows, setRows] = useState<Row[]>([]);
  const [category, setCategory] = useState(defaultCategory);
  const [state, setState] = useState<CollectionState>(defaultState === "gone" ? "have" : defaultState);
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const categories = enabledCollectionCategories(settings);
  const trades = !!categories.find((c) => c.id === category)?.trades;
  const states = collectionEditorStates(trades, state, true);

  useEffect(() => {
    if (!visible) return;
    setRows([]); setProblem(""); setBusy("");
    setCategory(defaultCategory);
    setState(defaultState === "gone" ? "have" : defaultState);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    for (let i = 0; i < images.length; i++) {
      setBusy(`Preparing ${i + 1} of ${images.length}…`);
      try {
        const photo = await compressImageMultiRes(images[i]);
        setRows((r) => [...r, { key: `${Date.now()}-${i}-${images[i].name}`, name: nameFromFile(images[i].name), photo }]);
      } catch (e) {
        console.error("[CollectionBulkAddModal] couldn't read", images[i].name, e);
        setProblem(`Couldn't read ${images[i].name}; the others were added.`);
      }
    }
    setBusy("");
  };

  const save = async () => {
    const fields = collectionFormFields(settings, category);
    const now = Date.now();
    try {
      const items = rows.map((row, i) => collectionItemFromDraft(
        { ...collectionDraftFromItem(undefined, category, state), name: row.name },
        fields, [row.photo], undefined, newCollectionItemId(now + i), currentUserId, now + i));
      await saveCollectionItems(items);
      onClose();
    } catch (e) {
      console.error("[CollectionBulkAddModal] saving failed:", e);
      setProblem("Nothing was added. Please try again.");
    }
  };

  return (
    <Dialog visible={visible} label="Add several to your collection" onClose={onClose} wide>
      <h2 className="text-xl font-bold mb-1" style={{ color: ACCENT }}>Add several</h2>
      <p className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>Drop photos here or pick them, then name each one.</p>
      <div className="flex flex-col gap-4">
        <div><Label>Category</Label>
          <Chips label="Category" clearable={false} value={category} onChange={(v) => v && setCategory(v)}
            options={categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))} /></div>
        <Chips label="Have, want or trade" clearable={false} value={state} onChange={(v) => v && setState(v)}
          options={states.map((s) => ({ value: s, label: COLLECTION_TAB_LABELS[s] }))} />
        <DropZone onFiles={addFiles} busy={busy} />
        <RowList rows={rows} onRename={(key, name) => setRows((r) => r.map((x) => (x.key === key ? { ...x, name } : x)))}
          onRemove={(key) => setRows((r) => r.filter((x) => x.key !== key))} />
      </div>
      {problem && <p role="alert" className="mt-4 text-sm" style={{ color: "var(--color-error)" }}>{problem}</p>}
      <div className="mt-6 flex items-center gap-2">
        <button type="button" onClick={onClose} className="ml-auto px-4 py-2 rounded-full text-sm font-semibold cursor-pointer"
          style={{ color: "var(--color-text-secondary)" }}>Cancel</button>
        <button type="button" onClick={save} disabled={rows.length === 0 || !!busy}
          className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
          {rows.length ? `Add ${rows.length} item${rows.length === 1 ? "" : "s"}` : "Add"}
        </button>
      </div>
    </Dialog>
  );
}

// ==================== PIECES ====================

function DropZone({ onFiles, busy }: { onFiles: (files: File[]) => void; busy: string }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)); }}
      className="flex flex-col items-center justify-center gap-1 px-4 py-6 rounded-xl text-sm cursor-pointer text-center"
      style={{
        border: `2px dashed ${over ? ACCENT : "var(--color-border-strong)"}`,
        backgroundColor: over ? `color-mix(in srgb, ${ACCENT} 8%, transparent)` : "var(--color-surface-sunken)",
        color: "var(--color-text-secondary)",
      }}>
      <span aria-hidden="true" className="text-2xl">📷</span>
      <span>{busy || "Drop photos, or click to pick them"}</span>
      <input type="file" accept="image/*" multiple className="sr-only" aria-label="Pick photos"
        onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </label>
  );
}

function RowList({ rows, onRename, onRemove }: {
  rows: Row[]; onRename: (key: string, name: string) => void; onRemove: (key: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2" aria-label="Items to add">
      {rows.map((row, i) => (
        <li key={row.key} className="flex items-center gap-3">
          {/* The user's own photo as a data URL, so next/image adds nothing */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.photo.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
          <input value={row.name} onChange={(e) => onRename(row.key, e.target.value)} aria-label={`Name of item ${i + 1}`}
            className={INPUT_CLASS} style={INPUT_STYLE} />
          <button type="button" onClick={() => onRemove(row.key)} aria-label={`Remove item ${i + 1}`}
            className="px-2 py-1 text-sm cursor-pointer" style={{ color: "var(--color-text-dim)" }}>✕</button>
        </li>
      ))}
    </ul>
  );
}
