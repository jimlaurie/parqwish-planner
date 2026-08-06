"use client";

/**
 * SyncPanel — shown on the Play page.
 *
 * States:
 *   1. Cloud sync disabled (default) → explain the option, offer opt-in
 *   2. Cloud sync enabled, not signed in → show Apple Sign In button
 *   3. Cloud sync enabled, signed in → active badge + opt-out option
 *
 * File-based transfer (the existing manual flow) is always available
 * regardless of this setting.
 */

import { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import { onAuthChanged, signInWithApple, signOutSync, isSyncEnabled } from "@/lib/auth";
import { startSync, stopSync } from "@/lib/wish-sync";
import { useAppStore } from "@/lib/store";

export default function SyncPanel() {
  const { cloudSyncEnabled, setCloudSyncEnabled } = useAppStore();
  const [user, setUser]       = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const synced = !!user && isSyncEnabled(user);

  // Track auth state and start sync engine whenever we have an active user.
  // Must run on every auth state change (including page refresh restoring
  // an existing session) — not just after a fresh sign-in.
  //
  // authChecked gates the "Not signed in" UI: Firebase's IndexedDB restore
  // is async, so `user` is briefly null on every load even when a real
  // session is persisted. Without this gate the panel flashes a false
  // "please sign in again" prompt on every refresh.
  useEffect(() => {
    if (!cloudSyncEnabled) return;
    return onAuthChanged(async (u) => {
      setUser(u);
      setAuthChecked(true);
      if (u && isSyncEnabled(u)) {
        await startSync();
      } else {
        stopSync();
      }
    });
  }, [cloudSyncEnabled]);

  function handleEnable() {
    setCloudSyncEnabled(true);
  }

  function handleDisable() {
    stopSync();
    signOutSync().catch(() => {});
    setCloudSyncEnabled(false);
    setUser(null);
    setError(null);
  }

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithApple();
      // startSync() is called by onAuthChanged when auth state updates
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("popup-closed")) return;
      setError("Sign in failed — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">☁️</span>
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--color-heading)" }}
        >
          Cloud Sync
        </h3>
        {synced && (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
              color: "var(--color-success)",
            }}
          >
            ● Active
          </span>
        )}
        {cloudSyncEnabled && !authChecked && (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-text-dim) 15%, transparent)",
              color: "var(--color-text-dim)",
            }}
          >
            ○ Checking…
          </span>
        )}
        {cloudSyncEnabled && authChecked && !synced && (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
              color: "var(--color-warning)",
            }}
          >
            ○ Not signed in
          </span>
        )}
      </div>

      {/* ── State 1: Disabled (default) ── */}
      {!cloudSyncEnabled && (
        <>
          <p className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
            Keep your wish catalog in sync across iPhone, iPad, and this
            planner automatically. Data is end-to-end encrypted before it
            leaves your device — only you can read it.
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
            Prefer manual control? File-based transfer (below) works without
            an account and always will.
          </p>
          <button
            onClick={handleEnable}
            className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer
                       transition-all duration-150"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-gold) 15%, transparent)",
              color: "var(--color-gold)",
              border: "1px solid color-mix(in srgb, var(--color-gold) 40%, transparent)",
            }}
          >
            Enable Cloud Sync
          </button>
        </>
      )}

      {/* ── State: Enabled, still restoring session ── */}
      {cloudSyncEnabled && !authChecked && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Checking sync status…
        </p>
      )}

      {/* ── State 2: Enabled, not signed in ── */}
      {cloudSyncEnabled && authChecked && !synced && (
        <>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
            Sign in with Apple to activate sync. Your data is encrypted on
            this device before upload — no one else can read it.
          </p>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                       text-sm font-semibold cursor-pointer transition-all duration-150
                       disabled:opacity-50 mb-3"
            style={{
              backgroundColor: "var(--color-text-primary)",
              color: "var(--color-bg-deep)",
            }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-148.2-112.7C87.3 754.3 35 683.8 35 604.2c0-123.7 80.4-190.7 158.7-190.7 46.8 0 85.8 31.4 115.5 31.4 28.4 0 73.5-33.5 127-33.5 20.5 0 108.2 2 162.5 75.4zm-170.3-63.9c3.2-44.4 29.5-82.6 59.5-106.9 36.5-29.5 96.6-44.4 100.5-44.4-.6 4.5-3.8 37-21.8 71.9-18 34.9-62.2 77.8-138.2 79.4z"/>
              </svg>
            )}
            {loading ? "Signing in…" : "Sign in with Apple"}
          </button>

          {error && (
            <p className="text-xs mb-3 text-center" style={{ color: "var(--color-error)" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleDisable}
            className="w-full py-2 rounded-xl text-xs cursor-pointer transition-colors"
            style={{
              color: "var(--color-text-dim)",
              backgroundColor: "transparent",
            }}
          >
            Turn off cloud sync
          </button>
        </>
      )}

      {/* ── State 3: Active ── */}
      {cloudSyncEnabled && synced && (
        <>
          <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
            Your wish catalog syncs automatically across all devices signed in
            with the same Apple ID. Changes appear within seconds.
          </p>
          <p className="text-[10px] mb-4" style={{ color: "var(--color-text-dim)" }}>
            Account: …{user?.uid?.slice(-8)}
          </p>
          <button
            onClick={handleDisable}
            className="w-full py-2 rounded-xl text-xs cursor-pointer transition-colors
                       hover:opacity-80"
            style={{
              color: "var(--color-text-dim)",
              backgroundColor: "var(--color-surface-raised)",
            }}
          >
            Turn off cloud sync
          </button>
          <p className="text-[10px] mt-2 text-center" style={{ color: "var(--color-text-dim)" }}>
            Turning off stops syncing. Your local data is not affected.
          </p>
        </>
      )}
    </div>
  );
}
