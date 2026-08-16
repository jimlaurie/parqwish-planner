"use client";

// ==================== TRIP PHOTO IMPORT PANEL ====================
// "From your device" mode of the Photos tab (Data Transfer flow): import
// arbitrary photos — a Camera Roll export or a Disney App/PhotoPass
// download — that don't carry the mobile export's manifest. Each photo is
// placed in order of confidence: EXIF GPS → nearest GPS trail point at its
// EXIF capture time → manual pick from the same rides/shows/dining/places
// (including your own added Places) search used elsewhere in the app.
// Deliberately a simple, synchronous review list — this is built for a
// handful of photos at a time, not a bulk camera-roll dump.

import { useState, useRef, useMemo } from "react";
import { compressImageMultiRes } from "@/lib/image-utils";
import { readExifLocation, suggestLocationFromTrail } from "@/lib/trip-photo-location";
import { addTripPhoto } from "@/hooks/use-trip-photos";
import TripPhotoLocationPicker, { type LocationMatch } from "./TripPhotoLocationPicker";

const ACCENT = "var(--color-accent-publish)";

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  date: string;
  latitude?: number;
  longitude?: number;
  capturedAt?: string;
  linkedParkDataId?: string;
  linkedWishId?: string;
  autoPlaced: boolean;
  editingLocation: boolean;
}

function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function resolveDate(capturedAtIso: string | undefined, tripDates: string[]): string {
  const fallback = tripDates[0] ?? new Date().toISOString().slice(0, 10);
  if (!capturedAtIso) return fallback;
  const day = capturedAtIso.slice(0, 10);
  return tripDates.includes(day) ? day : fallback;
}

export default function TripPhotoImportPanel({
  tripId,
  tripStartDate,
  tripEndDate,
  onImported,
}: {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  onImported: (count: number) => void;
}) {
  const tripDates = useMemo(() => getDatesBetween(tripStartDate, tripEndDate), [tripStartDate, tripEndDate]);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setProcessing(true);

    const drafts: PendingPhoto[] = list.map((file) => ({
      id: `pend_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      date: tripDates[0] ?? tripStartDate,
      autoPlaced: false,
      editingLocation: false,
    }));
    setPending((prev) => [...prev, ...drafts]);

    // Resolve EXIF (and, failing GPS, a trail-time match) per photo — done
    // after the drafts are already showing so the review list appears
    // immediately rather than waiting on every file's metadata read.
    for (const draft of drafts) {
      const exif = await readExifLocation(draft.file);
      const date = resolveDate(exif.capturedAt, tripDates);
      let latitude = exif.latitude;
      let longitude = exif.longitude;
      let autoPlaced = latitude != null && longitude != null;

      if (!autoPlaced && exif.capturedAt) {
        const suggestion = await suggestLocationFromTrail(tripId, date, exif.capturedAt);
        if (suggestion) {
          latitude = suggestion.latitude;
          longitude = suggestion.longitude;
          autoPlaced = true;
        }
      }

      setPending((prev) => prev.map((p) => p.id === draft.id ? { ...p, date, latitude, longitude, autoPlaced, capturedAt: exif.capturedAt } : p));
    }
    setProcessing(false);
  };

  const updatePending = (id: string, updates: Partial<PendingPhoto>) => {
    setPending((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleLocationSelect = (id: string, match: LocationMatch) => {
    updatePending(id, {
      latitude: match.latitude,
      longitude: match.longitude,
      linkedParkDataId: match.linkedParkDataId,
      linkedWishId: match.linkedWishId,
      autoPlaced: false,
      editingLocation: false,
    });
  };

  const handleImportAll = async () => {
    setImporting(true);
    try {
      for (const p of pending) {
        const photoSet = await compressImageMultiRes(p.file);
        await addTripPhoto({
          tripId,
          date: p.date,
          photoSet,
          caption: p.file.name,
          latitude: p.latitude,
          longitude: p.longitude,
          linkedParkDataId: p.linkedParkDataId,
          linkedWishId: p.linkedWishId,
          capturedAt: p.capturedAt,
        });
        URL.revokeObjectURL(p.previewUrl);
      }
      const count = pending.length;
      setPending([]);
      onImported(count);
    } finally {
      setImporting(false);
    }
  };

  if (pending.length === 0) {
    return (
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-200"
        style={{ borderColor: dragOver ? ACCENT : "var(--color-border-input)" }}
      >
        <span className="text-3xl block mb-2">📷</span>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Select photos
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-dim)" }}>
          Click to browse or drop photos here — from your Camera Roll, a Disney App/PhotoPass download, anywhere
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
        />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
        {pending.length} photo{pending.length === 1 ? "" : "s"} ready to import. Photos with a known location are placed automatically — everything else is optional to place now, or leave blank.
      </p>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto mb-3">
        {pending.map((p) => (
          <div key={p.id} className="flex gap-3 p-2 rounded-lg" style={{ backgroundColor: "var(--color-surface-raised)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.previewUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {tripDates.length > 1 ? (
                  <select
                    value={p.date}
                    onChange={(e) => updatePending(p.id, { date: e.target.value })}
                    className="text-[10px] rounded px-1.5 py-0.5 border"
                    style={{ backgroundColor: "var(--color-bg-card)", color: "var(--color-text-primary)", borderColor: "var(--color-border-input)" }}
                  >
                    {tripDates.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <span className="text-[10px]" style={{ color: "var(--color-text-dim)" }}>{p.date}</span>
                )}
                <button type="button" onClick={() => removePending(p.id)}
                        className="text-[10px] ml-auto cursor-pointer" style={{ color: "var(--color-text-dim)" }}>
                  ✕ Remove
                </button>
              </div>

              {p.autoPlaced && !p.editingLocation && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: "var(--color-success)" }}>📍 Placed automatically</span>
                  <button type="button" onClick={() => updatePending(p.id, { editingLocation: true })}
                          className="text-[10px] cursor-pointer underline" style={{ color: "var(--color-text-dim)" }}>
                    Change
                  </button>
                </div>
              )}

              {(!p.autoPlaced || p.editingLocation) && (
                <TripPhotoLocationPicker
                  tripId={tripId}
                  placeholder="Add a location (optional)"
                  onSelect={(match) => handleLocationSelect(p.id, match)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {processing && (
        <p className="text-[10px] mb-2" style={{ color: "var(--color-text-dim)" }}>Reading photo details…</p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-full cursor-pointer"
                style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border-input)" }}>
          + Add more
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
               onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }} />
        <button type="button" onClick={handleImportAll} disabled={importing}
                className="flex-1 px-6 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}>
          {importing ? "Importing…" : `Import ${pending.length} Photo${pending.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
