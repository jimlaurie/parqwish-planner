"use client";

import { useState, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import SyncModal from "@/components/SyncModal";
import SyncPanel from "@/components/SyncPanel";
import db from "@/lib/db";
import type { SyncHistoryEntry } from "@/lib/db";
import type { ImportMode } from "@/lib/sync-types";
import {
  exportCatalog,
  importCatalog,
  exportTemplates,
  importTemplates,
  downloadJsonFile,
} from "@/lib/universal-sync";
import { clearParkDataCache, getParkData } from "@/lib/park-data";
import type { CatalogExportEnvelope, TemplateExportEnvelope } from "@/lib/universal-sync";

// ==================== CONSTANTS ====================

const ACCENT = "var(--color-accent-publish)";
const GOLD = "var(--color-gold)";
const PURPLE = "var(--color-accent-play)";
const GREEN = "var(--color-success)";

// ==================== HELPERS ====================

function generateId(): string {
  return `sh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeLabel(type: SyncHistoryEntry["type"]): string {
  if (type === "export") return "\u{1F4E4} Export";
  if (type === "import") return "\u{1F4E5} Import";
  return "\u{1F4C1} Archive";
}

function typeAccent(type: SyncHistoryEntry["type"]): string {
  if (type === "export") return GOLD;
  if (type === "import") return ACCENT;
  return GREEN;
}

// ==================== SECTION HEADER ====================

function SectionHeader({ icon, title, subtitle, accent }: {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: accent }}>
        <span>{icon}</span> {title}
      </h2>
      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
        {subtitle}
      </p>
    </div>
  );
}

// ==================== CATALOG SECTION ====================

function CatalogSection({ onComplete }: { onComplete: (entry: SyncHistoryEntry) => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<CatalogExportEnvelope | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Live counts for preview
  const wishCount = useLiveQuery(() => db.wishes.count(), []);
  const packingCount = useLiveQuery(() => db.packingItems.count(), []);
  const ensembleCount = useLiveQuery(() => db.ensembles.count(), []);
  const totalCount = (wishCount ?? 0) + (packingCount ?? 0) + (ensembleCount ?? 0);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError("");
    try {
      const envelope = await exportCatalog();
      downloadJsonFile(envelope as unknown as Record<string, unknown>, "Catalog");
      const count = envelope.wishes.length + envelope.packingItems.length + envelope.ensembles.length;
      setResult(`Exported ${count} items`);
      onComplete({
        id: generateId(),
        type: "export",
        date: new Date().toISOString(),
        name: "Catalog",
        categories: ["wishes", "outfits", "equipment", "sundries", "shopping", "dining"],
        itemCount: count,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [onComplete]);

  const handleFileSelect = useCallback(async (file: File) => {
    setError("");
    setImportFile(file);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.type !== "catalog") {
        throw new Error("Not a catalog export file");
      }
      setImportPreview(parsed as CatalogExportEnvelope);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse file");
      setImportFile(null);
      setImportPreview(null);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!importPreview) return;
    setIsImporting(true);
    setError("");
    try {
      const counts = await importCatalog(importPreview, importMode);
      const total = counts.wishes + counts.packingItems + counts.ensembles;
      setResult(`Imported ${total} items (${counts.wishes} wishes, ${counts.packingItems} packing, ${counts.ensembles} ensembles)`);
      onComplete({
        id: generateId(),
        type: "import",
        date: new Date().toISOString(),
        name: "Catalog",
        categories: ["wishes", "outfits", "equipment", "sundries", "shopping", "dining"],
        itemCount: total,
      });
      setImportFile(null);
      setImportPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }, [importPreview, importMode, onComplete]);

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <SectionHeader
        icon={"\u{1F4E6}"}
        title="Catalog"
        subtitle="Export or import your wish and packing item catalog, including ensembles. PWA-only."
        accent={PURPLE}
      />

      {error && (
        <div className="p-2 rounded-lg mb-3 text-xs" style={{ backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)", color: "var(--color-error)" }}>
          {error}
          <button onClick={() => setError("")} className="ml-2 underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {result && (
        <div className="p-2 rounded-lg mb-3 text-xs" style={{ backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)", color: GREEN }}>
          {"\u2705"} {result}
          <button onClick={() => setResult(null)} className="ml-2 underline cursor-pointer">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export */}
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            {"\u{1F4E4}"} Export
          </p>
          <div className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {wishCount ?? 0} wishes, {packingCount ?? 0} packing items, {ensembleCount ?? 0} ensembles
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting || totalCount === 0}
            className="w-full py-2.5 rounded-full text-sm font-semibold cursor-pointer
                       transition-all duration-200 hover:brightness-110
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: PURPLE, color: "white" }}
          >
            {isExporting ? "Exporting..." : "\u{1F4E4} Download Catalog"}
          </button>
        </div>

        {/* Import */}
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            {"\u{1F4E5}"} Import
          </p>

          {!importFile ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
                         transition-colors duration-200 hover:border-[var(--color-accent-play)]"
              style={{ borderColor: "var(--color-border-input)" }}
            >
              <span className="text-xl block mb-1">{"\u{1F4C2}"}</span>
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Select catalog .json
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between p-2 rounded-lg mb-2"
                   style={{ backgroundColor: "var(--color-surface-raised)" }}>
                <span className="text-xs truncate" style={{ color: "var(--color-text-primary)" }}>
                  {"\u{1F4C4}"} {importFile.name}
                </span>
                <button
                  onClick={() => {
                    setImportFile(null);
                    setImportPreview(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-xs cursor-pointer"
                  style={{ color: "var(--color-error)" }}
                >
                  Remove
                </button>
              </div>

              {importPreview && (
                <div className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                  {importPreview.wishes.length} wishes, {importPreview.packingItems.length} packing, {importPreview.ensembles.length} ensembles
                </div>
              )}

              {/* Import mode */}
              <div className="flex gap-1 p-1 rounded-xl mb-2"
                   style={{ backgroundColor: "var(--color-surface-raised)" }}>
                {(["merge", "replace"] as ImportMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setImportMode(m)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                    style={{
                      backgroundColor: importMode === m ? "color-mix(in srgb, var(--color-accent-play) 20%, transparent)" : "transparent",
                      color: importMode === m ? PURPLE : "var(--color-text-dim)",
                    }}
                  >
                    {m === "merge" ? "Merge" : "Replace"}
                  </button>
                ))}
              </div>

              <button
                onClick={handleImport}
                disabled={isImporting || !importPreview}
                className="w-full py-2.5 rounded-full text-sm font-semibold cursor-pointer
                           transition-all duration-200 hover:brightness-110
                           disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}
              >
                {isImporting ? "Importing..." : "\u{1F4E5} Import Catalog"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== TEMPLATE SECTION ====================

function TemplateSection({ onComplete }: { onComplete: (entry: SyncHistoryEntry) => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<TemplateExportEnvelope | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const templateCount = useLiveQuery(
    () => db.trips.where("isTemplate").equals(1).count(),
    []
  );

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError("");
    try {
      const envelope = await exportTemplates();
      downloadJsonFile(envelope as unknown as Record<string, unknown>, "Templates");
      setResult(`Exported ${envelope.templates.length} template(s)`);
      onComplete({
        id: generateId(),
        type: "export",
        date: new Date().toISOString(),
        name: "Templates",
        categories: [],
        itemCount: envelope.templates.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [onComplete]);

  const handleFileSelect = useCallback(async (file: File) => {
    setError("");
    setImportFile(file);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.type !== "template") {
        throw new Error("Not a template export file");
      }
      setImportPreview(parsed as TemplateExportEnvelope);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse file");
      setImportFile(null);
      setImportPreview(null);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!importPreview) return;
    setIsImporting(true);
    setError("");
    try {
      const counts = await importTemplates(importPreview, importMode);
      setResult(`Imported ${counts.templates} template(s), ${counts.wishSelections} wish selections, ${counts.packingSelections} packing selections`);
      onComplete({
        id: generateId(),
        type: "import",
        date: new Date().toISOString(),
        name: "Templates",
        categories: [],
        itemCount: counts.templates,
      });
      setImportFile(null);
      setImportPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }, [importPreview, importMode, onComplete]);

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <SectionHeader
        icon={"\u{1F4CB}"}
        title="Templates"
        subtitle="Export or import trip templates with their wish and packing selections. PWA-only."
        accent="var(--color-accent-prepare)"
      />

      {error && (
        <div className="p-2 rounded-lg mb-3 text-xs" style={{ backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)", color: "var(--color-error)" }}>
          {error}
          <button onClick={() => setError("")} className="ml-2 underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {result && (
        <div className="p-2 rounded-lg mb-3 text-xs" style={{ backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)", color: GREEN }}>
          {"\u2705"} {result}
          <button onClick={() => setResult(null)} className="ml-2 underline cursor-pointer">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export */}
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            {"\u{1F4E4}"} Export
          </p>
          <div className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {templateCount ?? 0} template{(templateCount ?? 0) !== 1 ? "s" : ""}
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting || (templateCount ?? 0) === 0}
            className="w-full py-2.5 rounded-full text-sm font-semibold cursor-pointer
                       transition-all duration-200 hover:brightness-110
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--color-accent-prepare)", color: "var(--color-bg-deep)" }}
          >
            {isExporting ? "Exporting..." : "\u{1F4E4} Download Templates"}
          </button>
        </div>

        {/* Import */}
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            {"\u{1F4E5}"} Import
          </p>

          {!importFile ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
                         transition-colors duration-200 hover:border-[var(--color-accent-prepare)]"
              style={{ borderColor: "var(--color-border-input)" }}
            >
              <span className="text-xl block mb-1">{"\u{1F4C2}"}</span>
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Select template .json
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between p-2 rounded-lg mb-2"
                   style={{ backgroundColor: "var(--color-surface-raised)" }}>
                <span className="text-xs truncate" style={{ color: "var(--color-text-primary)" }}>
                  {"\u{1F4C4}"} {importFile.name}
                </span>
                <button
                  onClick={() => {
                    setImportFile(null);
                    setImportPreview(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-xs cursor-pointer"
                  style={{ color: "var(--color-error)" }}
                >
                  Remove
                </button>
              </div>

              {importPreview && (
                <div className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                  {importPreview.templates.length} template{importPreview.templates.length !== 1 ? "s" : ""}
                </div>
              )}

              {/* Import mode */}
              <div className="flex gap-1 p-1 rounded-xl mb-2"
                   style={{ backgroundColor: "var(--color-surface-raised)" }}>
                {(["merge", "replace"] as ImportMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setImportMode(m)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                    style={{
                      backgroundColor: importMode === m ? "color-mix(in srgb, var(--color-accent-prepare) 20%, transparent)" : "transparent",
                      color: importMode === m ? "var(--color-accent-prepare)" : "var(--color-text-dim)",
                    }}
                  >
                    {m === "merge" ? "Merge" : "Replace"}
                  </button>
                ))}
              </div>

              <button
                onClick={handleImport}
                disabled={isImporting || !importPreview}
                className="w-full py-2.5 rounded-full text-sm font-semibold cursor-pointer
                           transition-all duration-200 hover:brightness-110
                           disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}
              >
                {isImporting ? "Importing..." : "\u{1F4E5} Import Templates"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== PARK DATA SECTION ====================

function ParkDataSection() {
  const [status, setStatus] = useState<"idle" | "refreshing" | "done" | "error">("idle");
  const [count, setCount] = useState<number | null>(null);

  const handleRefresh = useCallback(async () => {
    setStatus("refreshing");
    try {
      clearParkDataCache();
      const items = await getParkData();
      setCount(items.length);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, []);

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <SectionHeader
        icon="🗂️"
        title="Park Data"
        subtitle="Rides, shows, dining, shops, and places are cached locally for 24 hours."
        accent={PURPLE}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleRefresh}
          disabled={status === "refreshing"}
          className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
          style={{
            backgroundColor: status === "refreshing" ? "var(--color-surface-raised)" : `color-mix(in srgb, ${PURPLE} 15%, transparent)`,
            color: status === "refreshing" ? "var(--color-text-dim)" : PURPLE,
            border: `1px solid ${PURPLE}`,
            opacity: status === "refreshing" ? 0.6 : 1,
          }}
        >
          {status === "refreshing" ? "Refreshing…" : "↺ Refresh Park Data"}
        </button>
        {status === "done" && count !== null && (
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            ✓ {count.toLocaleString()} items loaded
          </span>
        )}
        {status === "error" && (
          <span className="text-xs" style={{ color: "var(--color-error)" }}>
            Refresh failed — check your connection
          </span>
        )}
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function PlayPage() {
  // Load transfer history (most recent first)
  const history = useLiveQuery(
    () => db.syncHistory.orderBy("date").reverse().toArray(),
    []
  );

  // Save a new history entry
  const addHistoryEntry = useCallback(async (entry: SyncHistoryEntry) => {
    await db.syncHistory.add(entry);
  }, []);

  // Save history from SyncModal callback
  const handleTripTransferComplete = useCallback(
    async (entry: {
      type: "export" | "import" | "archive";
      name: string;
      code?: string;
      categories: string[];
      dateRange?: { startDate: string; endDate: string };
      itemCount: number;
    }) => {
      await db.syncHistory.add({
        id: generateId(),
        type: entry.type,
        date: new Date().toISOString(),
        name: entry.name,
        code: entry.code,
        categories: entry.categories,
        dateRange: entry.dateRange,
        itemCount: entry.itemCount,
      });
    },
    []
  );

  const handleClearHistory = useCallback(async () => {
    await db.syncHistory.clear();
  }, []);

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Page Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--color-heading)" }}
          >
            Play
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Transfer data between devices, manage your catalog, and handle templates.
          </p>
        </div>

        {/* ==================== CLOUD SYNC SECTION ==================== */}
        <div className="mb-8">
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-accent-play)", borderLeft: "3px solid var(--color-accent-play)", paddingLeft: 8 }}
          >
            Cloud Sync
          </h2>
          <SyncPanel />
        </div>

        {/* ==================== TRIP DATA SECTION ==================== */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <SectionHeader
            icon={"\u{1F504}"}
            title="Trip Data"
            subtitle="Export, import, or archive trip data for device-to-device transfer."
            accent={ACCENT}
          />
          <SyncModal
            visible={true}
            onClose={() => {}}
            inline={true}
            onTransferComplete={handleTripTransferComplete}
          />
        </div>

        {/* ==================== CATALOG SECTION ==================== */}
        <CatalogSection onComplete={addHistoryEntry} />

        {/* ==================== TEMPLATE SECTION ==================== */}
        <TemplateSection onComplete={addHistoryEntry} />

        {/* ==================== PARK DATA ==================== */}
        <ParkDataSection />

        {/* ==================== TRANSFER HISTORY ==================== */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--color-heading)" }}
            >
              Transfer History
            </h2>
            {history && history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-xs cursor-pointer px-3 py-1 rounded-full"
                style={{
                  color: "var(--color-text-dim)",
                  backgroundColor: "var(--color-surface-raised)",
                }}
              >
                Clear All
              </button>
            )}
          </div>

          {!history || history.length === 0 ? (
            <div
              className="text-center py-8 rounded-2xl"
              style={{
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <span className="text-3xl block mb-2">{"\u{1F4CB}"}</span>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-dim)" }}
              >
                No transfers yet. Export or import data to see history here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    backgroundColor: "var(--color-bg-card)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  {/* Type badge */}
                  <div
                    className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                    style={{
                      backgroundColor: `${typeAccent(entry.type)}20`,
                      color: typeAccent(entry.type),
                    }}
                  >
                    {typeLabel(entry.type)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {entry.name}
                      </span>
                      {entry.code && (
                        <span
                          className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--color-gold) 15%, transparent)",
                            color: GOLD,
                          }}
                        >
                          {entry.code}
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: "var(--color-text-dim)" }}
                    >
                      {formatHistoryDate(entry.date)}
                      {" \u00B7 "}
                      {entry.itemCount} item{entry.itemCount !== 1 ? "s" : ""}
                      {entry.dateRange && (
                        <>
                          {" \u00B7 "}
                          {entry.dateRange.startDate} to {entry.dateRange.endDate}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
