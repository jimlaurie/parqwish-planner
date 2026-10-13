"use client";

// ==================== DANGER ZONE ====================
// Clear or delete a saved trip, with a backup download first. Closed until
// asked for; its button shares a row with the trip's other actions (Save as
// Template, Print), which stay out of the sticky Save bar. "Archive first" here is a backup FILE, unrelated to the General
// section's "Archive this trip" switch that hides a trip from the list (same
// word, two features: docs/sync-architecture.md §6.6).

import { useState, type ReactNode } from "react";
import type { Trip } from "@/lib/db";
import { getDateRange, buildExportEnvelope, downloadExportFile } from "@/lib/universal-sync";
import { ALL_CATEGORIES } from "@/lib/sync-types";

interface DangerZoneProps {
  trip: Trip;
  /** Removes the trip's wishes, packing, itinerary and trails, keeping the trip. */
  onClear?: () => Promise<void>;
  /** Removes the trip itself as well. */
  onDelete?: () => Promise<void>;
  /** Other trip actions (Save as Template, Print) shown in the same row. */
  actions?: ReactNode;
}

const pill = "px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed";

export default function DangerZone({ trip, onClear, onDelete, actions }: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backupAt, setBackupAt] = useState<Date | null>(null);
  const actionRow = (extra?: ReactNode) => (
    <div className="flex flex-wrap justify-center gap-2">{actions}{extra}</div>
  );
  if (!onClear && !onDelete) return actions ? actionRow() : null;

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  };
  const downloadBackup = () => run(async () => {
    const dates = trip.startDate && trip.endDate ? getDateRange(trip.startDate, trip.endDate) : [];
    const { envelope } = await buildExportEnvelope(trip.id, dates, ALL_CATEGORIES, trip.name, "archive", undefined, "Export for Deletion");
    await downloadExportFile(envelope, trip.name);
    setBackupAt(new Date());
  });

  if (!open) {
    return actionRow(
      <button type="button" onClick={() => setOpen(true)}
              className="text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors duration-200 hover:bg-white/5"
              style={{ color: "var(--color-error)", borderColor: "color-mix(in srgb, var(--color-error) 30%, transparent)" }}>
        🗑 Clear or delete this trip…
      </button>
    );
  }

  return (
    <>
    {actions && actionRow()}
    <section aria-label="Clear or delete this trip" className="rounded-2xl p-5 border space-y-5"
             style={{ backgroundColor: "var(--color-bg-card)", borderColor: "color-mix(in srgb, var(--color-error) 35%, transparent)" }}>
      <div className="flex items-start gap-3 p-4 rounded-xl"
           style={{ backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-error) 25%, transparent)" }}>
        <span className="text-2xl leading-none" aria-hidden>⚠️</span>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-error)" }}>Permanent action — cannot be undone</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            <strong>Clear</strong> removes all wishes, packing, itinerary, and GPS trails for this trip but keeps the trip name and dates.{" "}
            <strong>Delete</strong> removes everything including the trip itself. Catalog items are never deleted — only the links to this trip.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--color-surface-raised)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>Archive first (recommended)</p>
        {backupAt ? (
          <p className="text-sm font-medium" style={{ color: "var(--color-success)" }}>
            ✅ Archived {backupAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — file saved to Downloads
          </p>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Download a backup before deleting. You can restore it later via the Play → Import Archive tab.
            </p>
            <button type="button" onClick={downloadBackup} disabled={busy} className={`${pill} text-xs`}
                    style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>
              {busy ? "Archiving..." : "📥 Download Archive"}
            </button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(false)}
                className="text-xs px-3 py-1.5 rounded-full border border-white/10 transition-colors duration-200 hover:bg-white/5 cursor-pointer"
                style={{ color: "var(--color-text-muted)" }}>
          Never mind
        </button>
        <div className="flex-1" />
        {onClear && (
          <button type="button" onClick={() => run(onClear)} disabled={busy} className={pill}
                  style={{ backgroundColor: "color-mix(in srgb, var(--color-warning) 20%, transparent)", color: "var(--color-warning)" }}>
            {busy ? "Working..." : "🧹 Clear Data"}
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={() => run(onDelete)} disabled={busy} className={pill}
                  style={{ backgroundColor: "color-mix(in srgb, var(--color-error) 20%, transparent)", color: "var(--color-error)" }}>
            {busy ? "Working..." : "🗑 Delete Trip"}
          </button>
        )}
      </div>
    </section>
    </>
  );
}
