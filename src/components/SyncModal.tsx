"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useTrips } from "@/hooks/use-trips";
import { useUsers } from "@/hooks/use-users";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/db";
import type { SyncCategory, SyncEnvelopeV2, ImportMode } from "@/lib/sync-types";
import { CATEGORY_META, ALL_CATEGORIES } from "@/lib/sync-types";
import {
  getDateRange,
  getExportPreview,
  buildExportEnvelope,
  downloadExportFile,
  parseImportFile,
  verifyImportCode,
  executeImport,
  remapPayloadDates,
  importPhotoZip,
} from "@/lib/universal-sync";
import type { ImportPreview, PhotoImportResult } from "@/lib/universal-sync";

// ==================== TYPES ====================

type TabMode = "export" | "import" | "photos" | "archive";

interface SyncModalProps {
  visible: boolean;
  onClose: () => void;
  /** Render inline (no overlay/backdrop) for use on dedicated pages. */
  inline?: boolean;
  /** Callback when an export/import/archive completes, with history entry data. */
  onTransferComplete?: (entry: {
    type: "export" | "import" | "archive";
    name: string;
    code?: string;
    categories: string[];
    dateRange?: { startDate: string; endDate: string };
    itemCount: number;
  }) => void;
}

const ACCENT = "var(--color-accent-publish)";
const GOLD = "var(--color-gold)";

// ==================== DATE HELPERS ====================

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ==================== COMPONENT ====================

export default function SyncModal({ visible, onClose, inline, onTransferComplete }: SyncModalProps) {
  const focusRef = useFocusTrap(visible && !inline, onClose);
  const { currentTrip, createTrip } = useTrips();
  const { users, userMap, addUser, upsertFromMobile } = useUsers();
  const { currentUserId } = useAppStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabMode>("export");

  // ==================== EXPORT STATE ====================
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<SyncCategory[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [previewCounts, setPreviewCounts] = useState<Record<string, number>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportCode, setExportCode] = useState<string | null>(null);

  // ==================== IMPORT STATE ====================
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importEnvelope, setImportEnvelope] = useState<SyncEnvelopeV2 | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [importUserId, setImportUserId] = useState<string | null>(null);
  const [showCreateImportUser, setShowCreateImportUser] = useState(false);
  const [newImportUserName, setNewImportUserName] = useState("");
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [codeVerified, setCodeVerified] = useState<boolean | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, number> | null>(null);
  const [remapStartDate, setRemapStartDate] = useState<string>("");
  const [error, setError] = useState("");

  // ==================== PHOTOS STATE ====================
  const [photoZipFile, setPhotoZipFile] = useState<File | null>(null);
  const [isImportingPhotos, setIsImportingPhotos] = useState(false);
  const [photoImportResult, setPhotoImportResult] = useState<PhotoImportResult | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoDragOver, setPhotoDragOver] = useState(false);

  // ==================== ARCHIVE STATE ====================
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [archiveCategories, setArchiveCategories] = useState<SyncCategory[]>([]);
  const [archivePreviewCounts, setArchivePreviewCounts] = useState<Record<string, number>>({});
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveImportFile, setArchiveImportFile] = useState<File | null>(null);
  const [archiveEnvelope, setArchiveEnvelope] = useState<SyncEnvelopeV2 | null>(null);
  const [archivePreview, setArchivePreview] = useState<ImportPreview | null>(null);
  const [archiveImportMode, setArchiveImportMode] = useState<ImportMode>("merge");
  const [isArchiveImporting, setIsArchiveImporting] = useState(false);
  const [archiveImportResult, setArchiveImportResult] = useState<Record<string, number> | null>(null);
  const [archiveExported, setArchiveExported] = useState(false);

  // ==================== CREATE TRIP ON IMPORT STATE ====================
  const [showCreateTripForm, setShowCreateTripForm] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newTripStartDate, setNewTripStartDate] = useState("");
  const [newTripEndDate, setNewTripEndDate] = useState("");

  // Code input refs
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const archiveFileInputRef = useRef<HTMLInputElement | null>(null);
  const [importDragOver, setImportDragOver] = useState(false);

  // Trip dates
  const tripDates = useMemo(() => {
    if (!currentTrip) return [];
    return getDateRange(currentTrip.startDate, currentTrip.endDate);
  }, [currentTrip]);

  // ==================== RESET ON OPEN/CLOSE ====================

  useEffect(() => {
    if (visible) {
      setActiveTab("export");
      setSelectedDates([]);
      setSelectedCategories([]);
      setSelectedUserIds([]);
      setPreviewCounts({});
      setIsExporting(false);
      setExportCode(null);
      setImportFile(null);
      setImportEnvelope(null);
      setImportPreview(null);
      setImportMode("merge");
      setImportUserId(null);
      setShowCreateImportUser(false);
      setNewImportUserName("");
      setCodeDigits(["", "", "", "", "", ""]);
      setCodeVerified(null);
      setIsImporting(false);
      setImportResult(null);
      setRemapStartDate("");
      setError("");
      setPhotoZipFile(null);
      setIsImportingPhotos(false);
      setPhotoImportResult(null);
      setArchiveDates([]);
      setArchiveCategories([]);
      setArchivePreviewCounts({});
      setIsArchiving(false);
      setArchiveImportFile(null);
      setArchiveEnvelope(null);
      setArchivePreview(null);
      setArchiveImportMode("merge");
      setIsArchiveImporting(false);
      setArchiveImportResult(null);
      setArchiveExported(false);
      setShowCreateTripForm(false);
      setNewTripName("");
      setNewTripStartDate("");
      setNewTripEndDate("");
    }
  }, [visible]);

  // Auto-select all users when component opens
  useEffect(() => {
    if (visible && users.length > 0 && selectedUserIds.length === 0) {
      setSelectedUserIds(users.map((u) => u.id));
    }
  }, [visible, users, selectedUserIds.length]);

  // Auto-match import user to existing user by name
  useEffect(() => {
    if (!importPreview?.exportedBy || users.length === 0) return;
    const exportedBy = importPreview.exportedBy.toLowerCase().trim();
    const match = users.find((u) => u.name.toLowerCase().trim() === exportedBy);
    if (match) {
      setImportUserId(match.id);
    }
  }, [importPreview, users]);

  // ==================== PREVIEW UPDATES ====================

  useEffect(() => {
    if (!currentTrip || selectedDates.length === 0 || selectedCategories.length === 0) {
      setPreviewCounts({});
      return;
    }
    let cancelled = false;
    const userFilter = selectedUserIds.length > 0 && selectedUserIds.length < users.length
      ? selectedUserIds
      : undefined;
    getExportPreview(currentTrip.id, selectedDates, selectedCategories, userFilter).then((counts) => {
      if (!cancelled) setPreviewCounts(counts);
    });
    return () => { cancelled = true; };
  }, [currentTrip, selectedDates, selectedCategories, selectedUserIds, users.length]);

  useEffect(() => {
    if (!currentTrip || archiveDates.length === 0 || archiveCategories.length === 0) {
      setArchivePreviewCounts({});
      return;
    }
    let cancelled = false;
    getExportPreview(currentTrip.id, archiveDates, archiveCategories).then((counts) => {
      if (!cancelled) setArchivePreviewCounts(counts);
    });
    return () => { cancelled = true; };
  }, [currentTrip, archiveDates, archiveCategories]);

  // ==================== DATE SELECTION ====================

  const toggleDate = (date: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const selectAllDates = (dates: string[], selected: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(selected.length === dates.length ? [] : [...dates]);
  };

  // ==================== CATEGORY SELECTION ====================

  const toggleCategory = (cat: SyncCategory, setter: React.Dispatch<React.SetStateAction<SyncCategory[]>>) => {
    setter((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const selectAllCategories = (selected: SyncCategory[], setter: React.Dispatch<React.SetStateAction<SyncCategory[]>>) => {
    setter(selected.length === ALL_CATEGORIES.length ? [] : [...ALL_CATEGORIES]);
  };

  // ==================== EXPORT HANDLER ====================

  const handleExport = useCallback(async (type: "sync" | "archive") => {
    if (!currentTrip) return;
    const dates = type === "sync" ? selectedDates : archiveDates;
    const categories = type === "sync" ? selectedCategories : archiveCategories;
    if (dates.length === 0 || categories.length === 0) return;

    if (type === "sync") setIsExporting(true);
    else setIsArchiving(true);

    try {
      const userFilter = type === "sync" && selectedUserIds.length > 0 && selectedUserIds.length < users.length
        ? selectedUserIds
        : undefined;
      const currentUser = userMap.get(currentUserId);
      const exportedByName = currentUser?.name;
      const { envelope, code } = await buildExportEnvelope(
        currentTrip.id,
        dates,
        categories,
        currentTrip.name,
        type,
        userFilter,
        exportedByName
      );
      // If exporting for a single user, include their name in the filename
      const fileUserName = userFilter?.length === 1 ? userMap.get(userFilter[0])?.name : undefined;
      downloadExportFile(envelope, currentTrip.name, fileUserName);

      if (type === "sync") {
        setExportCode(code);
      } else {
        setArchiveExported(true);
      }

      // Notify parent of completed transfer
      onTransferComplete?.({
        type: type === "sync" ? "export" : "archive",
        name: currentTrip.name,
        code: type === "sync" ? code ?? undefined : undefined,
        categories,
        dateRange: dates.length > 0
          ? { startDate: dates[0], endDate: dates[dates.length - 1] }
          : undefined,
        itemCount: Object.values(type === "sync" ? previewCounts : archivePreviewCounts)
          .reduce((s, n) => s + n, 0),
      });
    } catch (err) {
      console.error("[SyncModal] Export error:", err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      if (type === "sync") setIsExporting(false);
      else setIsArchiving(false);
    }
  }, [currentTrip, selectedDates, archiveDates, selectedCategories, archiveCategories,
      selectedUserIds, users.length, userMap, currentUserId,
      onTransferComplete, previewCounts, archivePreviewCounts]);

  // ==================== IMPORT HANDLER ====================

  const handleFileSelect = useCallback(async (
    file: File,
    setFileFn: React.Dispatch<React.SetStateAction<File | null>>,
    setEnvelopeFn: React.Dispatch<React.SetStateAction<SyncEnvelopeV2 | null>>,
    setPreviewFn: React.Dispatch<React.SetStateAction<ImportPreview | null>>,
    onParsed?: (envelope: SyncEnvelopeV2) => void
  ) => {
    setError("");
    setFileFn(file);
    try {
      const { envelope, metadata } = await parseImportFile(file);
      setEnvelopeFn(envelope);
      setPreviewFn(metadata);
      onParsed?.(envelope);
    } catch (err) {
      console.error("[SyncModal] Parse error:", err);
      setError(err instanceof Error ? err.message : "Could not parse file");
      setFileFn(null);
      setEnvelopeFn(null);
      setPreviewFn(null);
    }
  }, []);

  const handlePhotoZipSelect = useCallback(async (file: File) => {
    setError("");
    setPhotoZipFile(file);
    setIsImportingPhotos(true);
    try {
      const result = await importPhotoZip(file, currentTrip?.id, currentUserId);
      setPhotoImportResult(result);
    } catch (err) {
      console.error("[SyncModal] Photo zip import error:", err);
      setError(err instanceof Error ? err.message : "Could not import photo zip");
      setPhotoZipFile(null);
    } finally {
      setIsImportingPhotos(false);
    }
  }, [currentTrip, currentUserId]);

  // ==================== CODE ENTRY ====================

  const handleCodeDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...codeDigits];
    newDigits[index] = value.slice(-1);
    setCodeDigits(newDigits);
    setCodeVerified(null);

    // Auto-advance to next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = useCallback(async () => {
    if (!importEnvelope) return;
    const code = codeDigits.join("");
    if (code.length !== 6) return;
    const valid = await verifyImportCode(importEnvelope, code);
    setCodeVerified(valid);
  }, [importEnvelope, codeDigits]);

  // ==================== EXECUTE IMPORT ====================

  const handleImport = useCallback(async (
    envelope: SyncEnvelopeV2 | null,
    mode: ImportMode,
    setImportingFn: React.Dispatch<React.SetStateAction<boolean>>,
    setResultFn: React.Dispatch<React.SetStateAction<Record<string, number> | null>>,
    assignToUserId?: string | null
  ) => {
    if (!envelope || !currentTrip) return;

    setImportingFn(true);
    setError("");

    try {
      const counts = await executeImport(envelope, currentTrip.id, mode, assignToUserId ?? undefined);
      setResultFn(counts);

      // Notify parent of completed transfer
      const isArchiveType = envelope.type === "archive";
      onTransferComplete?.({
        type: isArchiveType ? "archive" : "import",
        name: envelope.exportedBy ?? currentTrip.name,
        categories: envelope.categories ?? [],
        dateRange: envelope.dateRange,
        itemCount: Object.values(counts).reduce((s, n) => s + n, 0),
      });
    } catch (err) {
      console.error("[SyncModal] Import error:", err);
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingFn(false);
    }
  }, [currentTrip, onTransferComplete]);

  // ==================== CREATE TRIP + IMPORT HANDLER ====================

  const handleCreateTripAndImport = useCallback(async (
    envelope: SyncEnvelopeV2,
    mode: ImportMode,
    setImportingFn: React.Dispatch<React.SetStateAction<boolean>>,
    setResultFn: React.Dispatch<React.SetStateAction<Record<string, number> | null>>,
    assignToUserId?: string | null
  ) => {
    const name = newTripName.trim();
    if (!name) return;

    setImportingFn(true);
    setError("");
    try {
      const tripId = await createTrip({
        name,
        startDate: newTripStartDate || envelope.dateRange?.startDate || "",
        endDate: newTripEndDate || envelope.dateRange?.endDate || "",
      });
      const counts = await executeImport(envelope, tripId, mode, assignToUserId ?? undefined);
      setResultFn(counts);
      setShowCreateTripForm(false);

      onTransferComplete?.({
        type: envelope.type === "archive" ? "archive" : "import",
        name: envelope.exportedBy ?? name,
        categories: envelope.categories ?? [],
        dateRange: envelope.dateRange,
        itemCount: Object.values(counts).reduce((s, n) => s + n, 0),
      });
    } catch (err) {
      console.error("[SyncModal] Create trip + import error:", err);
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingFn(false);
    }
  }, [createTrip, newTripName, newTripStartDate, newTripEndDate, onTransferComplete]);

  // ==================== RENDER HELPERS ====================

  const renderDateCheckboxes = (
    dates: string[],
    selected: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider"
           style={{ color: "var(--color-text-muted)" }}>
          Select Dates
        </p>
        <button onClick={() => selectAllDates(dates, selected, setter)}
                className="text-xs cursor-pointer underline"
                style={{ color: ACCENT }}>
          {selected.length === dates.length ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="space-y-1 max-h-36 overflow-y-auto mb-3">
        {dates.map((date) => (
          <label key={date}
                 className="flex items-center gap-3 p-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
            <input type="checkbox"
                   checked={selected.includes(date)}
                   onChange={() => toggleDate(date, setter)}
                   className="accent-[var(--color-accent-publish)]" />
            <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
              {formatDate(date)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderCategoryCheckboxes = (
    selected: SyncCategory[],
    setter: React.Dispatch<React.SetStateAction<SyncCategory[]>>,
    counts?: Record<string, number>
  ) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider"
           style={{ color: "var(--color-text-muted)" }}>
          Categories
        </p>
        <button onClick={() => selectAllCategories(selected, setter)}
                className="text-xs cursor-pointer underline"
                style={{ color: ACCENT }}>
          {selected.length === ALL_CATEGORIES.length ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1 mb-3">
        {ALL_CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const count = counts?.[cat];
          return (
            <label key={cat}
                   className="flex items-center gap-2 p-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
              <input type="checkbox"
                     checked={selected.includes(cat)}
                     onChange={() => toggleCategory(cat, setter)}
                     className="accent-[var(--color-accent-publish)]" />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                {meta.icon} {meta.label}
                {count !== undefined && count > 0 && (
                  <span className="ml-1 text-xs" style={{ color: "var(--color-text-dim)" }}>
                    ({count})
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const renderImportResultCounts = (counts: Record<string, number>) => {
    const entries = Object.entries(counts).filter(([, n]) => n > 0);
    if (entries.length === 0) return null;
    return (
      <div className="inline-block p-3 rounded-xl text-left mb-4"
           style={{ backgroundColor: "var(--color-surface-raised)" }}>
        {entries.map(([type, count]) => {
          const meta = CATEGORY_META[type as SyncCategory];
          return (
            <div key={type} className="text-xs py-0.5"
                 style={{ color: "var(--color-text-secondary)" }}>
              {meta ? `${meta.icon} ` : ""}{count} {meta?.label || type}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFilePreview = (preview: ImportPreview) => (
    <div className="p-3 rounded-xl mb-3"
         style={{ backgroundColor: "var(--color-surface-raised)" }}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs"
           style={{ color: "var(--color-text-secondary)" }}>
        <div>Source: <strong>{preview.source === "mobile" ? "Mobile App" : "PWA"}</strong></div>
        <div>Type: <strong>{preview.type === "sync" ? "Sync Transfer" : "Archive"}</strong></div>
        <div>By: <strong>{preview.exportedBy}</strong></div>
        <div>Date: <strong>{preview.exportDate ? new Date(preview.exportDate).toLocaleDateString() : "Unknown"}</strong></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {preview.categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const count = preview.itemCounts[cat] || 0;
          if (!meta || count === 0) return null;
          return (
            <span key={cat}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "color-mix(in srgb, var(--color-accent-publish) 15%, transparent)", color: ACCENT }}>
              {meta.icon} {meta.label} ({count})
            </span>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] italic"
         style={{ color: "var(--color-text-dim)" }}>
        ℹ️ Imported items stay on this device — they won&apos;t automatically reach other Cloud Sync collaborators on a shared trip.
      </p>
    </div>
  );

  // ==================== USER HELPERS ====================

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateImportUser = async () => {
    const name = newImportUserName.trim();
    if (!name) return;
    try {
      // If the file carries the mobile user's ID, preserve it via upsertFromMobile
      // so repeated imports from the same device don't create duplicate users.
      const mobileUserId = importEnvelope?.exportedByUserId;
      let newUser;
      if (mobileUserId) {
        newUser = await upsertFromMobile(mobileUserId, name, mobileUserId === "user_primary");
      } else {
        newUser = await addUser(name);
      }
      if (newUser) {
        setImportUserId(newUser.id);
        setShowCreateImportUser(false);
        setNewImportUserName("");
      }
    } catch (err) {
      console.error("[SyncModal] Create user error:", err);
    }
  };

  const renderUserCheckboxes = (
    allUsers: User[],
    selected: string[],
    onToggle: (id: string) => void
  ) => {
    if (allUsers.length <= 1) return null;
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider"
             style={{ color: "var(--color-text-muted)" }}>
            Include Users
          </p>
          <button onClick={() => setSelectedUserIds(
                    selected.length === allUsers.length ? [] : allUsers.map((u) => u.id)
                  )}
                  className="text-xs cursor-pointer underline"
                  style={{ color: ACCENT }}>
            {selected.length === allUsers.length ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allUsers.map((user) => {
            const isSelected = selected.includes(user.id);
            return (
              <button key={user.id}
                      onClick={() => onToggle(user.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium
                                 cursor-pointer transition-all duration-150"
                      style={{
                        backgroundColor: isSelected ? `${user.color}20` : "var(--color-surface-raised)",
                        border: isSelected ? `2px solid ${user.color}` : "2px solid transparent",
                        color: isSelected ? user.color : "var(--color-text-dim)",
                      }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: user.color }} />
                {user.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderImportUserPicker = (
    allUsers: User[],
    selectedId: string | null,
    onSelect: (id: string) => void,
    exportedByName?: string
  ) => (
    <div className="mb-3">
      <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
         style={{ color: "var(--color-text-muted)" }}>
        Assign To User
      </p>
      {exportedByName && (
        <p className="text-[10px] mb-2" style={{ color: "var(--color-text-dim)" }}>
          Exported by: <strong>{exportedByName}</strong>
        </p>
      )}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {allUsers.map((user) => {
          const isSelected = selectedId === user.id;
          return (
            <button key={user.id}
                    onClick={() => onSelect(user.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium
                               cursor-pointer transition-all duration-150"
                    style={{
                      backgroundColor: isSelected ? `${user.color}20` : "var(--color-surface-raised)",
                      border: isSelected ? `2px solid ${user.color}` : "2px solid transparent",
                      color: isSelected ? user.color : "var(--color-text-dim)",
                    }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: user.color }} />
              {user.name}
              {isSelected && <span>{"\u2713"}</span>}
            </button>
          );
        })}
      </div>
      {!showCreateImportUser ? (
        <button onClick={() => setShowCreateImportUser(true)}
                className="text-xs cursor-pointer underline"
                style={{ color: ACCENT }}>
          + Create new user
        </button>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <input type="text"
                 value={newImportUserName}
                 onChange={(e) => setNewImportUserName(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") handleCreateImportUser(); }}
                 placeholder="Name"
                 className="flex-1 px-2 py-1.5 rounded-lg text-sm"
                 style={{
                   backgroundColor: "var(--color-bg-deep)",
                   color: "var(--color-text-primary)",
                   border: "1px solid var(--color-border-input)",
                 }}
                 autoFocus />
          <button onClick={handleCreateImportUser}
                  disabled={!newImportUserName.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
            Add
          </button>
          <button onClick={() => { setShowCreateImportUser(false); setNewImportUserName(""); }}
                  className="text-xs cursor-pointer"
                  style={{ color: "var(--color-text-dim)" }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  // ==================== RENDER ====================

  if (!visible) return null;

  // Inner content (shared between modal and inline modes)
  const content = (
    <div ref={inline ? undefined : focusRef}
         className={inline
           ? "w-full"
           : "w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"}
         style={inline ? undefined : {
           backgroundColor: "var(--color-bg-card)",
           border: "1px solid var(--color-border-default)",
         }}>
      {/* Header (hidden in inline mode — page provides its own) */}
      {!inline && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
            Data Transfer
          </h2>
          <button onClick={onClose}
                  className="text-xl cursor-pointer p-1"
                  style={{ color: "var(--color-text-dim)" }}>
            {"\u2715"}
          </button>
        </div>
      )}

        {/* Tab Bar */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl"
             style={{ backgroundColor: "var(--color-surface-raised)" }}>
          {(["export", "import", "photos", "archive"] as TabMode[]).map((tab) => (
            <button key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor: activeTab === tab ? "color-mix(in srgb, var(--color-accent-publish) 20%, transparent)" : "transparent",
                      color: activeTab === tab ? ACCENT : "var(--color-text-dim)",
                    }}>
              {tab === "export" ? "\uD83D\uDCE4 Export" : tab === "import" ? "\uD83D\uDCE5 Import" : tab === "photos" ? "\uD83D\uDDBC\uFE0F Photos" : "\uD83D\uDCC1 Archive"}
            </button>
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 rounded-xl mb-3"
               style={{ backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-error) 30%, transparent)" }}>
            <p className="text-xs" style={{ color: "var(--color-error)" }}>{error}</p>
            <button onClick={() => setError("")}
                    className="text-xs mt-1 cursor-pointer underline"
                    style={{ color: "var(--color-text-dim)" }}>
              Dismiss
            </button>
          </div>
        )}

        {/* ==================== EXPORT TAB ==================== */}
        {activeTab === "export" && !exportCode && (
          <div>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Export trip data as a file for device-to-device transfer. A 6-digit verification code will be generated.
            </p>

            {renderDateCheckboxes(tripDates, selectedDates, setSelectedDates)}
            {renderUserCheckboxes(users, selectedUserIds, toggleUserSelection)}
            {renderCategoryCheckboxes(selectedCategories, setSelectedCategories, previewCounts)}

            {/* Preview summary */}
            {Object.values(previewCounts).some((n) => n > 0) && (
              <div className="p-2 rounded-lg mb-3 text-xs"
                   style={{ backgroundColor: "color-mix(in srgb, var(--color-gold) 10%, transparent)", color: GOLD }}>
                Total: {Object.values(previewCounts).reduce((s, n) => s + n, 0)} items selected
              </div>
            )}

            <button onClick={() => handleExport("sync")}
                    disabled={selectedDates.length === 0 || selectedCategories.length === 0 || isExporting}
                    className="w-full py-3 rounded-full text-sm font-semibold cursor-pointer
                               transition-all duration-200 hover:brightness-110
                               disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: GOLD, color: "var(--color-bg-deep)" }}>
              {isExporting ? "Exporting..." : "\uD83D\uDCE4 Download Export File"}
            </button>
          </div>
        )}

        {/* ==================== EXPORT CODE OVERLAY ==================== */}
        {activeTab === "export" && exportCode && (
          <div className="text-center py-4">
            <span className="text-4xl mb-3 block">{"\u2705"}</span>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
              File downloaded successfully!
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
              Share this verification code with the receiving device:
            </p>

            {/* Large code display */}
            <div className="inline-flex gap-2 mb-4">
              {exportCode.split("").map((digit, i) => (
                <div key={i}
                     className="w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-bold"
                     style={{
                       backgroundColor: "color-mix(in srgb, var(--color-gold) 15%, transparent)",
                       color: GOLD,
                       border: "2px solid color-mix(in srgb, var(--color-gold) 30%, transparent)",
                     }}>
                  {digit}
                </div>
              ))}
            </div>

            {/* QR Code */}
            <div className="inline-block p-4 rounded-xl mb-4 border border-[var(--color-border-subtle,transparent)] shadow-sm" style={{ backgroundColor: "white" }}>
              <QRCodeSVG value={exportCode} size={160} level="M" />
            </div>
            <p className="text-[10px] mb-4" style={{ color: "var(--color-text-dim)" }}>
              The receiving device can scan this QR code or enter the code manually
            </p>

            <div className="flex gap-2">
              <button onClick={() => setExportCode(null)}
                      className="flex-1 py-2.5 rounded-full text-sm font-semibold cursor-pointer"
                      style={{ backgroundColor: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>
                Export Another
              </button>
              {!inline && (
                <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-full text-sm font-semibold cursor-pointer
                                   transition-all duration-200 hover:brightness-110"
                        style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
                  Done
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==================== IMPORT TAB ==================== */}
        {activeTab === "import" && !importResult && (
          <div>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Import a sync file from another device. You&apos;ll need the 6-digit verification code from the sender.
            </p>

            {/* File picker */}
            {!importFile ? (
              <div onClick={() => fileInputRef.current?.click()}
                   onDragOver={(e) => { e.preventDefault(); setImportDragOver(true); }}
                   onDragLeave={() => setImportDragOver(false)}
                   onDrop={(e) => {
                     e.preventDefault();
                     setImportDragOver(false);
                     const file = e.dataTransfer.files?.[0];
                     if (file) handleFileSelect(file, setImportFile, setImportEnvelope, setImportPreview);
                   }}
                   className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                              transition-colors duration-200 hover:border-[var(--color-accent-publish)]"
                   style={{ borderColor: importDragOver ? "var(--color-accent-publish)" : "var(--color-border-input)" }}>
                <span className="text-3xl block mb-2">{"\uD83D\uDCC2"}</span>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Select .json file
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-dim)" }}>
                  Click to browse or drop a file here
                </p>
                <input ref={fileInputRef}
                       type="file"
                       accept=".json"
                       className="hidden"
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) handleFileSelect(file, setImportFile, setImportEnvelope, setImportPreview);
                       }} />
              </div>
            ) : (
              <div>
                {/* File info */}
                <div className="flex items-center justify-between p-2 rounded-lg mb-3"
                     style={{ backgroundColor: "var(--color-surface-raised)" }}>
                  <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {"\uD83D\uDCC4"} {importFile.name}
                  </span>
                  <button onClick={() => {
                            setImportFile(null);
                            setImportEnvelope(null);
                            setImportPreview(null);
                            setCodeDigits(["", "", "", "", "", ""]);
                            setCodeVerified(null);
                            setRemapStartDate("");
                            setImportUserId(null);
                            setShowCreateImportUser(false);
                            setNewImportUserName("");
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="text-xs cursor-pointer"
                          style={{ color: "var(--color-error)" }}>
                    Remove
                  </button>
                </div>

                {/* Preview */}
                {importPreview && renderFilePreview(importPreview)}

                {/* Date remap */}
                {importPreview && importPreview.dateRange.startDate && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
                       style={{ color: "var(--color-text-muted)" }}>
                      Remap Dates
                    </p>
                    <div className="p-3 rounded-xl"
                         style={{ backgroundColor: "var(--color-surface-raised)" }}>
                      <div className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                        Original: <strong>{formatDate(importPreview.dateRange.startDate)}</strong>
                        {" \u2192 "}
                        <strong>{formatDate(importPreview.dateRange.endDate)}</strong>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-xs whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>
                          New start:
                        </label>
                        <input
                          type="date"
                          value={remapStartDate}
                          onChange={(e) => setRemapStartDate(e.target.value)}
                          className="flex-1 px-2 py-1 rounded-lg text-sm"
                          style={{
                            backgroundColor: "var(--color-bg-deep)",
                            color: "var(--color-text-primary)",
                            border: "1px solid var(--color-border-input)",
                          }}
                        />
                        {remapStartDate && (
                          <button
                            onClick={() => setRemapStartDate("")}
                            className="text-xs cursor-pointer px-2 py-1 rounded-lg"
                            style={{ color: "var(--color-error)", backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)" }}>
                            Clear
                          </button>
                        )}
                      </div>
                      {remapStartDate && (() => {
                        const origStart = new Date(importPreview.dateRange.startDate + "T00:00:00");
                        const origEnd = new Date(importPreview.dateRange.endDate + "T00:00:00");
                        const dayCount = Math.round((origEnd.getTime() - origStart.getTime()) / 86400000);
                        const newEnd = new Date(new Date(remapStartDate + "T00:00:00").getTime() + dayCount * 86400000);
                        const newEndStr = newEnd.toISOString().split("T")[0];
                        return (
                          <div className="mt-2">
                            <div className="text-xs" style={{ color: GOLD }}>
                              New range: <strong>{formatDate(remapStartDate)}</strong>
                              {" \u2192 "}
                              <strong>{formatDate(newEndStr)}</strong>
                            </div>
                            <div className="text-[10px] mt-1" style={{ color: "var(--color-text-dim)" }}>
                              Completed status will be reset
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* User assignment */}
                {importPreview && users.length > 1 && renderImportUserPicker(
                  users,
                  importUserId,
                  setImportUserId,
                  importPreview.exportedBy
                )}

                {/* Code entry (if required) */}
                {importPreview?.requiresCode && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
                       style={{ color: "var(--color-text-muted)" }}>
                      Verification Code
                    </p>
                    <div className="flex gap-2 justify-center mb-2">
                      {codeDigits.map((digit, i) => (
                        <input key={i}
                               ref={(el) => { codeInputRefs.current[i] = el; }}
                               type="text"
                               inputMode="numeric"
                               maxLength={1}
                               value={digit}
                               onChange={(e) => handleCodeDigitChange(i, e.target.value)}
                               onKeyDown={(e) => handleCodeKeyDown(i, e)}
                               className="w-10 h-12 text-center text-xl font-bold rounded-lg"
                               style={{
                                 backgroundColor: "var(--color-bg-deep)",
                                 color: "var(--color-text-primary)",
                                 border: `2px solid ${
                                   codeVerified === true ? "var(--color-success)" :
                                   codeVerified === false ? "var(--color-error)" :
                                   "var(--color-border-input)"
                                 }`,
                               }} />
                      ))}
                    </div>
                    <button onClick={handleVerifyCode}
                            disabled={codeDigits.some((d) => !d)}
                            className="w-full py-2 rounded-lg text-sm font-semibold cursor-pointer
                                       disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: codeVerified === true ? "color-mix(in srgb, var(--color-success) 20%, transparent)" :
                                               codeVerified === false ? "color-mix(in srgb, var(--color-error) 20%, transparent)" :
                                               "var(--color-surface-hover)",
                              color: codeVerified === true ? "var(--color-success)" :
                                     codeVerified === false ? "var(--color-error)" :
                                     "var(--color-text-secondary)",
                            }}>
                      {codeVerified === true ? "\u2705 Code Verified" :
                       codeVerified === false ? "\u274C Invalid Code" :
                       "Verify Code"}
                    </button>
                  </div>
                )}

                {/* Import mode */}
                {importEnvelope && (!importPreview?.requiresCode || codeVerified === true) && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
                       style={{ color: "var(--color-text-muted)" }}>
                      Import Mode
                    </p>
                    <div className="flex gap-1 p-1 rounded-xl"
                         style={{ backgroundColor: "var(--color-surface-raised)" }}>
                      {(["merge", "replace"] as ImportMode[]).map((m) => (
                        <button key={m}
                                onClick={() => setImportMode(m)}
                                className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                                style={{
                                  backgroundColor: importMode === m ? "color-mix(in srgb, var(--color-accent-publish) 20%, transparent)" : "transparent",
                                  color: importMode === m ? ACCENT : "var(--color-text-dim)",
                                }}>
                          {m === "merge" ? "Merge (keep existing)" : "Replace (overwrite)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No trip OR user chose to create a new trip */}
                {importEnvelope && (!currentTrip || showCreateTripForm) && (!importPreview?.requiresCode || codeVerified === true) && (
                  <div className="mb-3">
                    {!showCreateTripForm ? (
                      <button onClick={() => setShowCreateTripForm(true)}
                              className="w-full py-2.5 rounded-full text-sm font-semibold cursor-pointer
                                         transition-all duration-200 hover:brightness-110"
                              style={{ backgroundColor: "color-mix(in srgb, var(--color-gold) 20%, transparent)", color: GOLD }}>
                        + Create New Trip &amp; Import
                      </button>
                    ) : (
                      <div className="p-3 rounded-xl"
                           style={{ backgroundColor: "var(--color-surface-raised)" }}>
                        <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
                           style={{ color: GOLD }}>New Trip</p>
                        <input type="text"
                               value={newTripName}
                               onChange={(e) => setNewTripName(e.target.value)}
                               placeholder="Trip name (e.g. Summer 2025)"
                               className="w-full px-3 py-2 rounded-lg text-sm mb-2 outline-none"
                               style={{ backgroundColor: "var(--color-surface-sunken)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-input)" }} />
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Start Date</label>
                            <input type="date"
                                   value={newTripStartDate}
                                   onChange={(e) => setNewTripStartDate(e.target.value)}
                                   className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                                   style={{ backgroundColor: "var(--color-surface-sunken)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-input)" }} />
                          </div>
                          <div>
                            <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>End Date</label>
                            <input type="date"
                                   value={newTripEndDate}
                                   onChange={(e) => setNewTripEndDate(e.target.value)}
                                   className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                                   style={{ backgroundColor: "var(--color-surface-sunken)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-input)" }} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowCreateTripForm(false)}
                                  className="flex-1 py-2 rounded-full text-xs cursor-pointer"
                                  style={{ color: "var(--color-text-dim)", backgroundColor: "var(--color-surface-sunken)" }}>
                            Cancel
                          </button>
                          <button onClick={() => {
                                    const envelopeToImport = remapStartDate
                                      ? remapPayloadDates(importEnvelope, remapStartDate)
                                      : importEnvelope;
                                    handleCreateTripAndImport(envelopeToImport, importMode, setIsImporting, setImportResult, importUserId);
                                  }}
                                  disabled={!newTripName.trim() || isImporting}
                                  className="flex-1 py-2 rounded-full text-xs font-semibold cursor-pointer
                                             transition-all duration-200 hover:brightness-110
                                             disabled:opacity-40 disabled:cursor-not-allowed"
                                  style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
                            {isImporting ? "Importing..." : "Create & Import"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Import button (when a trip is selected and not creating a new one) */}
                {importEnvelope && currentTrip && !showCreateTripForm && (!importPreview?.requiresCode || codeVerified === true) && (
                  <div>
                    <button onClick={() => {
                              const envelopeToImport = remapStartDate
                                ? remapPayloadDates(importEnvelope, remapStartDate)
                                : importEnvelope;
                              handleImport(envelopeToImport, importMode, setIsImporting, setImportResult, importUserId);
                            }}
                            disabled={isImporting}
                            className="w-full py-3 rounded-full text-sm font-semibold cursor-pointer
                                       transition-all duration-200 hover:brightness-110
                                       disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
                      {isImporting ? "Importing..." : "\uD83D\uDCE5 Import Data"}
                    </button>
                    <button
                      onClick={() => {
                        setNewTripName(importPreview?.exportedBy ?? "");
                        setNewTripStartDate(importEnvelope.dateRange?.startDate ?? "");
                        setNewTripEndDate(importEnvelope.dateRange?.endDate ?? "");
                        setShowCreateTripForm(true);
                      }}
                      className="w-full mt-2 py-1.5 text-xs cursor-pointer text-center"
                      style={{ color: "var(--color-text-dim)", background: "none", border: "none" }}
                    >
                      or import into a new trip instead →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== IMPORT RESULT ==================== */}
        {activeTab === "import" && importResult && (
          <div className="text-center py-6">
            <span className="text-5xl mb-4 block">{"\u2728"}</span>
            <p className="text-lg font-bold mb-2" style={{ color: "var(--color-success)" }}>
              Import Complete!
            </p>
            {renderImportResultCounts(importResult)}
            {inline ? (
              <button onClick={() => {
                        setImportResult(null);
                        setImportFile(null);
                        setImportEnvelope(null);
                        setImportPreview(null);
                        setCodeDigits(["", "", "", "", "", ""]);
                        setCodeVerified(null);
                        setRemapStartDate("");
                      }}
                      className="px-8 py-2.5 rounded-full text-sm font-semibold cursor-pointer"
                      style={{ backgroundColor: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>
                Import Another
              </button>
            ) : (
              <button onClick={onClose}
                      className="px-8 py-2.5 rounded-full text-sm font-semibold cursor-pointer
                                 transition-all duration-200 hover:brightness-110"
                      style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
                Done
              </button>
            )}
          </div>
        )}

        {/* ==================== PHOTOS TAB ==================== */}
        {activeTab === "photos" && (
          <div>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Import photos exported from the mobile app&apos;s Photo Gallery. No verification code needed.
            </p>

            {!photoImportResult ? (
              !photoZipFile ? (
                <div onClick={() => photoFileInputRef.current?.click()}
                     onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true); }}
                     onDragLeave={() => setPhotoDragOver(false)}
                     onDrop={(e) => {
                       e.preventDefault();
                       setPhotoDragOver(false);
                       const file = e.dataTransfer.files?.[0];
                       if (file) handlePhotoZipSelect(file);
                     }}
                     className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                                transition-colors duration-200 hover:border-[var(--color-accent-publish)]"
                     style={{ borderColor: photoDragOver ? "var(--color-accent-publish)" : "var(--color-border-input)" }}>
                  <span className="text-3xl block mb-2">{"🖼️"}</span>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Select .zip file
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-dim)" }}>
                    Click to browse or drop a photo export here
                  </p>
                  <input ref={photoFileInputRef}
                         type="file"
                         accept=".zip"
                         className="hidden"
                         onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) handlePhotoZipSelect(file);
                         }} />
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {isImportingPhotos ? "Importing..." : photoZipFile.name}
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-6">
                <span className="text-5xl mb-4 block">{"✨"}</span>
                <p className="text-lg font-bold mb-2" style={{ color: "var(--color-success)" }}>
                  Photos Imported!
                </p>
                <div className="inline-block p-3 rounded-xl text-left mb-2"
                     style={{ backgroundColor: "var(--color-surface-raised)" }}>
                  <div className="text-xs py-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    {"✅"} {photoImportResult.linked} linked
                  </div>
                  {photoImportResult.created > 0 && (
                    <div className="text-xs py-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      {"🆕"} {photoImportResult.created} new place{photoImportResult.created === 1 ? "" : "s"} created
                    </div>
                  )}
                  {photoImportResult.skipped > 0 && (
                    <div className="text-xs py-0.5" style={{ color: "var(--color-text-dim)" }}>
                      {"⚠️"} {photoImportResult.skipped} skipped
                    </div>
                  )}
                </div>
                {photoImportResult.skippedReasons.notFound > 0 && (
                  <p className="text-[10px] italic mb-3" style={{ color: "var(--color-text-dim)" }}>
                    {photoImportResult.skippedReasons.notFound} photo{photoImportResult.skippedReasons.notFound === 1 ? "" : "s"} had no matching ride/show/dining/wish/packing item anywhere in your catalog — sync this trip&apos;s data first (Play → Export) so the item exists, then re-import.
                  </p>
                )}
                <button onClick={() => {
                          setPhotoImportResult(null);
                          setPhotoZipFile(null);
                          if (photoFileInputRef.current) photoFileInputRef.current.value = "";
                        }}
                        className="px-8 py-2.5 rounded-full text-sm font-semibold cursor-pointer"
                        style={{ backgroundColor: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>
                  Import Another
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== ARCHIVE TAB ==================== */}
        {activeTab === "archive" && (
          <div>
            {/* Archive Export Section */}
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
                 style={{ color: GOLD }}>
                {"\uD83D\uDCE4"} Export Archive
              </p>
              <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
                Save a backup of your trip data. No verification code needed for archives.
              </p>

              {!archiveExported ? (
                <>
                  {renderDateCheckboxes(tripDates, archiveDates, setArchiveDates)}
                  {renderCategoryCheckboxes(archiveCategories, setArchiveCategories, archivePreviewCounts)}

                  {Object.values(archivePreviewCounts).some((n) => n > 0) && (
                    <div className="p-2 rounded-lg mb-3 text-xs"
                         style={{ backgroundColor: "color-mix(in srgb, var(--color-gold) 10%, transparent)", color: GOLD }}>
                      Total: {Object.values(archivePreviewCounts).reduce((s, n) => s + n, 0)} items selected
                    </div>
                  )}

                  <button onClick={() => handleExport("archive")}
                          disabled={archiveDates.length === 0 || archiveCategories.length === 0 || isArchiving}
                          className="w-full py-2.5 rounded-full text-sm font-semibold cursor-pointer
                                     transition-all duration-200 hover:brightness-110
                                     disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ backgroundColor: GOLD, color: "var(--color-bg-deep)" }}>
                    {isArchiving ? "Exporting..." : "\uD83D\uDCC1 Download Archive"}
                  </button>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm" style={{ color: "var(--color-success)" }}>
                    {"\u2705"} Archive downloaded!
                  </p>
                  <button onClick={() => setArchiveExported(false)}
                          className="text-xs mt-1 cursor-pointer underline"
                          style={{ color: ACCENT }}>
                    Export another
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t my-4" style={{ borderColor: "var(--color-surface-hover)" }} />

            {/* Archive Import Section */}
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
                 style={{ color: ACCENT }}>
                {"\uD83D\uDCE5"} Import Archive
              </p>
              <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
                Restore from a previously saved archive file.
              </p>

              {!archiveImportResult ? (
                <>
                  {!archiveImportFile ? (
                    <div onClick={() => archiveFileInputRef.current?.click()}
                         className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
                                    transition-colors duration-200 hover:border-[var(--color-accent-publish)]"
                         style={{ borderColor: "var(--color-border-input)" }}>
                      <span className="text-2xl block mb-1">{"\uD83D\uDCC2"}</span>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        Select archive file
                      </p>
                      <input ref={archiveFileInputRef}
                             type="file"
                             accept=".json"
                             className="hidden"
                             onChange={(e) => {
                               const file = e.target.files?.[0];
                               if (file) handleFileSelect(file, setArchiveImportFile, setArchiveEnvelope, setArchivePreview, (env) => {
                                 // Pre-populate Create New Trip form from archive's date range
                                 if (env.dateRange?.startDate) setNewTripStartDate(env.dateRange.startDate);
                                 if (env.dateRange?.endDate) setNewTripEndDate(env.dateRange.endDate);
                                 // Suggest a trip name from the archive if none entered yet
                                 if (!newTripName.trim()) {
                                   const label = env.exportedBy
                                     ? `${env.exportedBy}'s Trip`
                                     : env.dateRange?.startDate
                                       ? `Trip ${env.dateRange.startDate.slice(0, 7)}`
                                       : "";
                                   if (label) setNewTripName(label);
                                 }
                               });
                             }} />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between p-2 rounded-lg mb-3"
                           style={{ backgroundColor: "var(--color-surface-raised)" }}>
                        <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                          {"\uD83D\uDCC4"} {archiveImportFile.name}
                        </span>
                        <button onClick={() => {
                                  setArchiveImportFile(null);
                                  setArchiveEnvelope(null);
                                  setArchivePreview(null);
                                  if (archiveFileInputRef.current) archiveFileInputRef.current.value = "";
                                }}
                                className="text-xs cursor-pointer"
                                style={{ color: "var(--color-error)" }}>
                          Remove
                        </button>
                      </div>

                      {archivePreview && renderFilePreview(archivePreview)}

                      {/* Import mode */}
                      {archiveEnvelope && (
                        <div className="mb-3">
                          <div className="flex gap-1 p-1 rounded-xl"
                               style={{ backgroundColor: "var(--color-surface-raised)" }}>
                            {(["merge", "replace"] as ImportMode[]).map((m) => (
                              <button key={m}
                                      onClick={() => setArchiveImportMode(m)}
                                      className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                                      style={{
                                        backgroundColor: archiveImportMode === m ? "color-mix(in srgb, var(--color-accent-publish) 20%, transparent)" : "transparent",
                                        color: archiveImportMode === m ? ACCENT : "var(--color-text-dim)",
                                      }}>
                                {m === "merge" ? "Merge (keep existing)" : "Replace (overwrite)"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No trip OR user chose to create a new trip */}
                      {archiveEnvelope && (!currentTrip || showCreateTripForm) && (
                        <div className="mb-3">
                          {!showCreateTripForm ? (
                            <button onClick={() => setShowCreateTripForm(true)}
                                    className="w-full py-2.5 rounded-full text-sm font-semibold cursor-pointer
                                               transition-all duration-200 hover:brightness-110"
                                    style={{ backgroundColor: "color-mix(in srgb, var(--color-gold) 20%, transparent)", color: GOLD }}>
                              + Create New Trip &amp; Import
                            </button>
                          ) : (
                            <div className="p-3 rounded-xl"
                                 style={{ backgroundColor: "var(--color-surface-raised)" }}>
                              <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
                                 style={{ color: GOLD }}>New Trip</p>
                              <input type="text"
                                     value={newTripName}
                                     onChange={(e) => setNewTripName(e.target.value)}
                                     placeholder="Trip name (e.g. Summer 2025)"
                                     className="w-full px-3 py-2 rounded-lg text-sm mb-2 outline-none"
                                     style={{ backgroundColor: "var(--color-surface-sunken)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-input)" }} />
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div>
                                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Start Date</label>
                                  <input type="date"
                                         value={newTripStartDate}
                                         onChange={(e) => setNewTripStartDate(e.target.value)}
                                         className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                                         style={{ backgroundColor: "var(--color-surface-sunken)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-input)" }} />
                                </div>
                                <div>
                                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>End Date</label>
                                  <input type="date"
                                         value={newTripEndDate}
                                         onChange={(e) => setNewTripEndDate(e.target.value)}
                                         className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                                         style={{ backgroundColor: "var(--color-surface-sunken)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-input)" }} />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setShowCreateTripForm(false)}
                                        className="flex-1 py-2 rounded-full text-xs cursor-pointer"
                                        style={{ color: "var(--color-text-dim)", backgroundColor: "var(--color-surface-sunken)" }}>
                                  Cancel
                                </button>
                                <button onClick={() => handleCreateTripAndImport(archiveEnvelope, archiveImportMode, setIsArchiveImporting, setArchiveImportResult)}
                                        disabled={!newTripName.trim() || isArchiveImporting}
                                        className="flex-1 py-2 rounded-full text-xs font-semibold cursor-pointer
                                                   transition-all duration-200 hover:brightness-110
                                                   disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
                                  {isArchiveImporting ? "Importing..." : "Create & Import"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {archiveEnvelope && currentTrip && !showCreateTripForm && (
                        <div>
                          <button onClick={() => handleImport(archiveEnvelope, archiveImportMode, setIsArchiveImporting, setArchiveImportResult)}
                                  disabled={isArchiveImporting}
                                  className="w-full py-2.5 rounded-full text-sm font-semibold cursor-pointer
                                             transition-all duration-200 hover:brightness-110
                                             disabled:opacity-40 disabled:cursor-not-allowed"
                                  style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
                            {isArchiveImporting ? "Importing..." : "\uD83D\uDCE5 Import Archive"}
                          </button>
                          <button
                            onClick={() => {
                              setNewTripName(archivePreview?.exportedBy ?? "");
                              setNewTripStartDate(archiveEnvelope.dateRange?.startDate ?? "");
                              setNewTripEndDate(archiveEnvelope.dateRange?.endDate ?? "");
                              setShowCreateTripForm(true);
                            }}
                            className="w-full mt-2 py-1.5 text-xs cursor-pointer text-center"
                            style={{ color: "var(--color-text-dim)", background: "none", border: "none" }}
                          >
                            or import into a new trip instead →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <span className="text-4xl mb-3 block">{"\u2728"}</span>
                  <p className="text-sm font-bold mb-2" style={{ color: "var(--color-success)" }}>
                    Archive Imported!
                  </p>
                  {renderImportResultCounts(archiveImportResult)}
                  <button onClick={() => {
                            setArchiveImportResult(null);
                            setArchiveImportFile(null);
                            setArchiveEnvelope(null);
                            setArchivePreview(null);
                          }}
                          className="text-xs cursor-pointer underline"
                          style={{ color: ACCENT }}>
                    Import another
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );

  // Inline mode: render content directly, no overlay
  if (inline) return content;

  // Modal mode: wrap in overlay backdrop
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: "var(--color-overlay)" }}>
      {content}
    </div>
  );
}
