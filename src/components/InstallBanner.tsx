"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useStorageStatus } from "@/hooks/use-storage-status";
import { isStandalone } from "@/lib/storage-safety";

const DISMISSED_KEY = "pwa-install-dismissed";
/** Separate from the install prompt's, so someone who said "Later" to installing still hears about the risk once. */
const RISK_DISMISSED_KEY = "storage-risk-dismissed";

function wasDismissed(key: string): boolean {
  try {
    return !!localStorage.getItem(key);
  } catch {
    return true; // localStorage blocked: don't nag
  }
}

function rememberDismissed(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch (error) {
    console.warn("[InstallBanner] couldn't remember the dismissal:", error);
  }
}

/**
 * In a browser tab (not the installed app): suggests installing the Planner.
 * When this browser may clear the Planner's data (Safari's 7-day rule, see
 * src/lib/storage-safety.ts), it says so instead, with the two ways to keep it.
 */
export default function InstallBanner() {
  const { status, installSteps } = useStorageStatus();
  const [dismissed, setDismissed] = useState<{ install: boolean; risk: boolean } | null>(null);

  useEffect(() => {
    setDismissed({ install: wasDismissed(DISMISSED_KEY), risk: wasDismissed(RISK_DISMISSED_KEY) });
  }, []);

  if (!status || !dismissed || isStandalone()) return null;
  const atRisk = status.kind === "at-risk" && !dismissed.risk;
  if (!atRisk && dismissed.install) return null;

  const dismiss = () => {
    rememberDismissed(atRisk ? RISK_DISMISSED_KEY : DISMISSED_KEY);
    setDismissed((d) => d && (atRisk ? { ...d, risk: true } : { ...d, install: true }));
  };

  return (
    <div
      role="region"
      aria-label={atRisk ? "Keep your Planner data" : "Install ParQwish Planner"}
      className="fixed left-0 right-0 px-4 py-3 backdrop-blur-md"
      style={{
        bottom: "var(--mobile-tabbar-h)",
        zIndex: "var(--z-overlay)",
        background: "var(--color-bg-card)",
        borderTop: "1px solid color-mix(in srgb, var(--color-gold) 30%, transparent)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <span className="text-2xl flex-shrink-0" aria-hidden="true">{atRisk ? "🧳" : "✨"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>
            {atRisk ? "Keep your trip plans" : "Install ParQwish Planner"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {atRisk ? (
              <>
                Safari can clear the Planner&rsquo;s data after 7 days without a visit.{" "}
                {installSteps ? `Install it to keep it: ${installSteps}` : "Install the Planner to keep it."}{" "}
                Or <Link href="/play" className="underline" style={{ color: "var(--color-gold)" }}>turn on Cloud Sync</Link>.
              </>
            ) : (
              installSteps ?? "Install this app for faster loading and smoother navigation."
            )}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full cursor-pointer"
          style={{
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border-input)",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
