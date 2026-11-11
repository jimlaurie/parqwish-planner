"use client";

import { useStorageStatus } from "@/hooks/use-storage-status";
import type { StorageStatusKind } from "@/lib/storage-safety";

// --color-warning is a fixed gold (unreadable on the day theme's parchment),
// so the warning uses the Preview accent, as CatalogBrowser's chips do.
const WARN = "var(--color-accent-preview)";
const TONE: Record<StorageStatusKind, { icon: string; iconColor: string }> = {
  installed: { icon: "✓", iconColor: "var(--color-success)" },
  "backed-up": { icon: "✓", iconColor: "var(--color-success)" },
  persisted: { icon: "✓", iconColor: "var(--color-success)" },
  "at-risk": { icon: "⚠", iconColor: WARN },
  "best-effort": { icon: "•", iconColor: "var(--color-text-dim)" },
  empty: { icon: "•", iconColor: "var(--color-text-dim)" },
};

/** Play's "On this device" line: whether this browser will keep the Planner's data, and how to make sure. */
export default function StorageStatusCard() {
  const { status, installSteps, canAskToKeep, askToKeep } = useStorageStatus();
  if (!status) return null;
  const tone = TONE[status.kind];
  const atRisk = status.kind === "at-risk";

  return (
    <div
      data-testid="storage-status"
      data-kind={status.kind}
      className="rounded-xl px-4 py-3 mt-3 text-sm"
      style={{
        backgroundColor: atRisk ? `color-mix(in srgb, ${WARN} 12%, transparent)` : "var(--color-surface-sunken)",
        border: `1px solid ${atRisk ? WARN : "var(--color-border-subtle)"}`,
      }}
    >
      <p className="font-semibold mb-0.5" style={{ color: "var(--color-text-primary)" }}>On this device</p>
      <p style={{ color: atRisk ? WARN : "var(--color-text-secondary)" }}>
        <span aria-hidden="true" style={{ color: tone.iconColor }}>{tone.icon} </span>{status.label}
      </p>
      {atRisk && installSteps && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          To install: {installSteps} Cloud Sync (above) needs an Apple account; full-size photos stay on this device either way.
        </p>
      )}
      {canAskToKeep && (
        <button
          onClick={() => void askToKeep()}
          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
          style={{ color: "var(--color-accent-play)", border: "1px solid var(--color-accent-play)" }}
        >
          Ask this browser to keep it
        </button>
      )}
    </div>
  );
}
