"use client";

// ==================== REMOVE CONTROLS ====================
// Footer controls shared by WishFormModal and PackingFormModal.
//
// "Remove from trip" is the common case and is one click — the caller shows
// an Undo toast afterward rather than asking for confirmation up front.
// "Delete everywhere" removes the item from the catalog and every trip, so
// it keeps a single inline confirmation and has no undo.
//
// When only onDeleteForever is provided (e.g. editing from the Catalog page,
// where there's no trip context), the delete control is labelled "Delete".

import { useState } from "react";

interface RemoveControlsProps {
  onRemoveFromTrip?: () => Promise<void>;
  onDeleteForever?: () => Promise<void>;
  disabled?: boolean;
}

const smallButton =
  "px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors duration-200 disabled:opacity-40";

export default function RemoveControls({ onRemoveFromTrip, onDeleteForever, disabled }: RemoveControlsProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!onRemoveFromTrip && !onDeleteForever) return null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (confirming && onDeleteForever) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>
          {onRemoveFromTrip ? "Delete from every trip?" : "Delete this item?"}
        </span>
        <button
          type="button"
          onClick={() => run(onDeleteForever)}
          disabled={busy || disabled}
          className={smallButton}
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
            color: "var(--color-error)",
          }}
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className={`${smallButton} hover:bg-white/5`}
          style={{ color: "var(--color-text-muted)" }}
        >
          Keep
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {onDeleteForever && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy || disabled}
          className={`${smallButton} hover:bg-white/5`}
          style={{ color: "var(--color-text-muted)" }}
        >
          {onRemoveFromTrip ? "Delete everywhere" : "Delete"}
        </button>
      )}
      {onRemoveFromTrip && (
        <button
          type="button"
          onClick={() => run(onRemoveFromTrip)}
          disabled={busy || disabled}
          className={`${smallButton} hover:bg-white/5`}
          style={{ color: "var(--color-error)" }}
        >
          Remove from trip
        </button>
      )}
    </div>
  );
}
