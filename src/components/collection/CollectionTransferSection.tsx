"use client";

// ==================== COLLECTION TRANSFER SECTION ====================
// Play's Collection export and import (dland-wishes docs/collections-design.md
// §8b): download the collection, or one category of it, as a zip with full
// photos; import one made here or on Pal, choosing whether duplicates (same
// item, or the same name in the same category) are skipped or updated.
// Shown only while Collections are available (lib/feature-flags.ts).

import { useRef, useState } from "react";
import { useCollection } from "@/hooks/use-collection";
import { exportCollectionZip, importCollectionZip, readCollectionZip, type CollectionZipFile } from "@/lib/collection-transfer";
import type { SyncHistoryEntry } from "@/lib/db";
import { enabledCollectionCategories } from "@shared/collections";
import type { CollectionDuplicateMode } from "@shared/collection-zip";

const ACCENT = "var(--color-gold)";
const ALL = "";

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function message(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function CollectionTransferSection({ onComplete }: { onComplete: (entry: SyncHistoryEntry) => void }) {
  const { settings, items } = useCollection();
  const [category, setCategory] = useState(ALL);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  if (!settings) return null;

  const categories = enabledCollectionCategories(settings);
  const count = category ? items.filter((i) => i.category === category).length : items.length;
  const run = async (task: () => Promise<string>, fallback: string) => {
    setBusy(true); setError(""); setResult("");
    try { setResult(await task()); } catch (err) {
      console.error("[CollectionTransferSection]", err);
      setError(message(err, fallback));
    } finally { setBusy(false); }
  };
  const exportZip = () => run(async () => {
    const done = await exportCollectionZip(category ? { categoryId: category } : {});
    onComplete({ id: newId(), type: "export", date: new Date().toISOString(), name: "Collection", categories: ["collection"], itemCount: done.items });
    return `Exported ${done.items} ${done.items === 1 ? "item" : "items"} and ${done.photos} ${done.photos === 1 ? "photo" : "photos"}`;
  }, "The export didn't work. Please try again.");

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-subtle)" }}>
      <div className="mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: ACCENT }}><span aria-hidden="true">📌</span> Collection</h2>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Move your collection to Pal or another browser, or keep a backup: one zip with every item and its full-size photos.
        </p>
      </div>
      {error && <p role="alert" className="p-2 rounded-lg mb-3 text-xs" style={{ color: "var(--color-error)", backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)" }}>{error}</p>}
      {result && <p role="status" className="p-2 rounded-lg mb-3 text-xs" style={{ color: "var(--color-success)", backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)" }}>✅ {result}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Export</p>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="What to export"
            className="w-full mb-2 rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-subtle)" }}>
            <option value={ALL}>Everything ({items.length} {items.length === 1 ? "item" : "items"})</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button type="button" onClick={exportZip} disabled={busy || count === 0}
            className="w-full py-2.5 rounded-full text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
            {busy ? "Working…" : `Download ${count} ${count === 1 ? "item" : "items"}`}
          </button>
        </div>
        <ImportPanel busy={busy} run={run} onComplete={onComplete} />
      </div>
    </div>
  );
}

// ==================== IMPORT ====================

function ImportPanel({ busy, run, onComplete }: {
  busy: boolean; run: (task: () => Promise<string>, fallback: string) => Promise<void>; onComplete: (entry: SyncHistoryEntry) => void;
}) {
  const [file, setFile] = useState<{ name: string; zip: CollectionZipFile } | null>(null);
  const [mode, setMode] = useState<CollectionDuplicateMode>("skip");
  const input = useRef<HTMLInputElement>(null);
  const clear = () => { setFile(null); if (input.current) input.current.value = ""; };
  const choose = (picked: File) => run(async () => {
    const zip = await readCollectionZip(picked);
    setFile({ name: picked.name, zip });
    return "";
  }, "That file couldn't be opened.");
  const importZip = () => file && run(async () => {
    const done = await importCollectionZip(file.zip, mode);
    onComplete({ id: newId(), type: "import", date: new Date().toISOString(), name: "Collection", categories: ["collection"], itemCount: done.added + done.updated });
    clear();
    const missing = done.photosMissing ? `; ${done.photosMissing} ${done.photosMissing === 1 ? "photo" : "photos"} couldn't be read` : "";
    return `Added ${done.added}, updated ${done.updated}, skipped ${done.skipped}${missing}`;
  }, "The import didn't work. Nothing was changed.");

  return (
    <div>
      <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Import</p>
      <input ref={input} type="file" accept=".zip,application/zip" className="hidden" aria-label="Collection zip"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) choose(f); }} />
      {!file ? (
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="w-full border-2 border-dashed rounded-xl p-4 text-center cursor-pointer text-xs font-semibold"
          style={{ borderColor: "var(--color-border-input)", color: "var(--color-text-primary)" }}>
          📂 Choose a collection .zip
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between p-2 rounded-lg mb-2" style={{ backgroundColor: "var(--color-surface-raised)" }}>
            <span className="text-xs truncate" style={{ color: "var(--color-text-primary)" }}>{file.name}</span>
            <button type="button" onClick={clear} className="text-xs cursor-pointer" style={{ color: "var(--color-error)" }}>Remove</button>
          </div>
          <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {file.zip.manifest.items.length} items and {file.zip.photoCount} photos, from {file.zip.manifest.app} on{" "}
            {new Date(file.zip.manifest.exportedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })}
          </p>
          <fieldset className="mb-2">
            <legend className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>Items you already have:</legend>
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "var(--color-surface-raised)" }}>
              {(["skip", "update"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: mode === m ? `color-mix(in srgb, ${ACCENT} 20%, transparent)` : "transparent", color: mode === m ? ACCENT : "var(--color-text-dim)" }}>
                  {m === "skip" ? "Keep mine" : "Update from the file"}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="button" onClick={importZip} disabled={busy}
            className="w-full py-2.5 rounded-full text-sm font-semibold cursor-pointer disabled:opacity-40"
            style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
            {busy ? "Importing…" : "Import collection"}
          </button>
        </div>
      )}
    </div>
  );
}
