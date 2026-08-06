"use client";

/**
 * Small dot + label in the top nav, next to ThemeToggle, showing cloud
 * sync status at a glance. Mirrors the same state SyncPanel computes
 * (web/src/components/SyncPanel.tsx) and links there since that's where
 * opt-in/sign-in actually happens.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthChanged, isSyncEnabled, canCollaborate } from "@/lib/auth";
import { useAppStore } from "@/lib/store";

export default function SyncStatusIndicator() {
  const cloudSyncEnabled = useAppStore((s) => s.cloudSyncEnabled);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // authChecked gates "not signed in" — Firebase's session restore is
  // async, so user is briefly null on every load even when a real
  // session is persisted (see auth.ts ensureAuth()). Without this gate
  // the dot would flash amber before settling green.
  useEffect(() => {
    if (!cloudSyncEnabled) {
      setAuthChecked(false);
      setUser(null);
      return;
    }
    return onAuthChanged((u) => {
      setUser(u);
      setAuthChecked(true);
    });
  }, [cloudSyncEnabled]);

  const active = cloudSyncEnabled && authChecked && !!user && (isSyncEnabled(user) || canCollaborate(user));
  const checking = cloudSyncEnabled && !authChecked;

  const color = !cloudSyncEnabled
    ? "var(--color-text-dim)"
    : checking
    ? "var(--color-text-dim)"
    : active
    ? "var(--color-success)"
    : "var(--color-warning)";

  const label = !cloudSyncEnabled
    ? "Cloud sync is off"
    : checking
    ? "Checking sync status…"
    : active
    ? "Cloud sync active"
    : "Cloud sync on — not signed in";

  const shortLabel = !cloudSyncEnabled ? "Sync off" : checking ? "Sync" : active ? "Sync" : "Sign in";

  return (
    <Link
      href="/play"
      title={label}
      aria-label={label}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-colors hover:opacity-80"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span
        className={checking ? "animate-pulse" : ""}
        style={{
          width: 6,
          height: 6,
          borderRadius: "9999px",
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span className="hidden sm:inline">{shortLabel}</span>
    </Link>
  );
}
