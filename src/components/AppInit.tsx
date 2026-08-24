"use client";

import { useEffect, useRef, useState } from "react";
import { useUserInit } from "@/hooks/use-user-init";
import db from "@/lib/db";
import { ensureAuth, onAuthChanged, isSyncEnabled, canCollaborate, auth } from "@/lib/auth";
import { startSync, startCollaboratorSync, stopSync, pullWishes, pullSharedTrips, pullAllTripContent, pushWish, pushPackingItem } from "@/lib/wish-sync";
import { useAppStore } from "@/lib/store";
import { IN_APP_SESSION_KEY } from "@/lib/in-app-session";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0";

// ==================== CACHE VERSION ====================
// Bump this to force a one-time cache clear on next deploy.
const CACHE_VERSION = 2;
const CACHE_VERSION_KEY = "pwa-cache-version";

function useCacheBuster() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CACHE_VERSION_KEY);
      const current = Number(stored) || 0;
      if (current < CACHE_VERSION && "caches" in window) {
        // Clear stale service worker caches
        caches.keys().then((names) => {
          for (const name of names) {
            if (name.includes("next-static") || name.includes("js-assets")) {
              caches.delete(name);
            }
          }
        });
        localStorage.setItem(CACHE_VERSION_KEY, String(CACHE_VERSION));
      }
    } catch {
      // localStorage may be blocked by Safari privacy protections
    }
  }, []);
}

// ==================== LEGACY KEY MIGRATION ====================
// Migrate Zustand store from old "dland-wishes-store" to "parqwish-store"
function useLegacyKeyMigration() {
  useEffect(() => {
    try {
      const OLD_KEY = "dland-wishes-store";
      const NEW_KEY = "parqwish-store";
      const old = localStorage.getItem(OLD_KEY);
      if (old && !localStorage.getItem(NEW_KEY)) {
        localStorage.setItem(NEW_KEY, old);
        localStorage.removeItem(OLD_KEY);
      }
    } catch {
      // localStorage may be blocked
    }
  }, []);
}

// ==================== LEGACY DEXIE DB MIGRATION ====================
// One-time migration from "DLandWishesPWA" → "ParQwishPWA".
// Reads all object stores from the old DB via raw IndexedDB API and
// bulk-writes into the new Dexie instance, then deletes the old DB.

const OLD_DB_NAME = "DLandWishesPWA";
const DB_MIGRATION_KEY = "pwa-db-migration-v1";

// All table names that exist in the Dexie schema (superset of old tables).
const DB_TABLES = [
  "trips", "wishes", "tripWishSelections", "packingItems",
  "tripPackingSelections", "tripPackingCustomItems", "tripWishCustomItems",
  "itineraryItems", "publishPhotos", "users", "ensembles", "syncHistory",
  "trails", "scheduledEvents", "dayItems",
] as const;

function useLegacyDbMigration() {
  useEffect(() => {
    if (typeof indexedDB === "undefined") return;

    async function migrate() {
      try {
        // Already migrated — just ensure old DB is gone
        if (localStorage.getItem(DB_MIGRATION_KEY)) {
          indexedDB.deleteDatabase(OLD_DB_NAME);
          return;
        }

        // Check if old DB exists
        const allDbs = await indexedDB.databases();
        if (!allDbs.some((d) => d.name === OLD_DB_NAME)) {
          localStorage.setItem(DB_MIGRATION_KEY, "done");
          return;
        }

        // Open old DB at its current version (no schema needed — read-only)
        const oldVersion = allDbs.find((d) => d.name === OLD_DB_NAME)?.version ?? 1;
        const oldDb = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open(OLD_DB_NAME, oldVersion);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
          req.onblocked = () => reject(new Error("Old DB open blocked"));
        });

        // Copy each table that exists in both old and new DB
        const oldStores = Array.from(oldDb.objectStoreNames);
        for (const table of DB_TABLES) {
          if (!oldStores.includes(table)) continue;

          // Read all records from old DB
          const records = await new Promise<unknown[]>((resolve, reject) => {
            const tx = oldDb.transaction(table, "readonly");
            const req = tx.objectStore(table).getAll();
            req.onsuccess = () => resolve(req.result as unknown[]);
            req.onerror = () => reject(req.error);
          });

          if (records.length === 0) continue;

          // Write into new Dexie DB (bulkPut skips conflicts)
          try {
            // @ts-expect-error — dynamic table access
            await db[table].bulkPut(records);
            console.log(`[AppInit] Migrated ${records.length} records from ${table}`);
          } catch (err) {
            console.warn(`[AppInit] Partial migration error for ${table}:`, err);
          }
        }

        oldDb.close();
        indexedDB.deleteDatabase(OLD_DB_NAME);
        localStorage.setItem(DB_MIGRATION_KEY, "done");
        console.log("[AppInit] DB migration complete: DLandWishesPWA → ParQwishPWA");
      } catch (err) {
        console.error("[AppInit] DB migration failed:", err);
        // Don't block the app — user keeps their new empty DB
      }
    }

    migrate();
  }, []);
}

// ==================== FLAT PHOTOS → PHOTOSETS MIGRATION ====================
// One-time migration: photos added via the zip-import photo path before
// this fix (see sync-translate.ts linkPhotoManifest) were stored as raw,
// uncompressed data URIs in the legacy photos[] field instead of the app's
// normal multi-resolution photoSets. PhotoPicker.tsx always uses whatever
// is in the "thumbnail" slot as-is for a 48x48 grid image with no separate
// resizing, so a multi-MB camera photo used directly there was overwhelming
// Safari's image decoder (reported as photos rendering as an empty frame).
// Compress any such record's photos into photoSets in place, once.

const PHOTOSETS_MIGRATION_KEY = "pwa-photosets-migration-v1";

function usePhotoSetsMigration() {
  useEffect(() => {
    if (typeof indexedDB === "undefined") return;
    if (localStorage.getItem(PHOTOSETS_MIGRATION_KEY)) return;

    async function migrate() {
      try {
        const { compressDataURLMultiRes } = await import("@/lib/image-utils");
        const uid = auth.currentUser?.uid;
        let migrated = 0;

        const wishes = await db.wishes.toArray();
        for (const wish of wishes) {
          const flatPhotos = wish.photos ?? [];
          if (flatPhotos.length === 0 || (wish.photoSets && wish.photoSets.length > 0)) continue;
          const photoSets = await Promise.all(flatPhotos.map((p) => compressDataURLMultiRes(p)));
          const updatedAt = Date.now();
          await db.wishes.update(wish.id, { photoSets, photos: [], updatedAt });
          if (uid) pushWish({ ...wish, photoSets, photos: [], updatedAt }, uid).catch(() => {});
          migrated++;
        }

        const packingItems = await db.packingItems.toArray();
        for (const item of packingItems) {
          const flatPhotos = item.photos ?? [];
          if (flatPhotos.length === 0 || (item.photoSets && item.photoSets.length > 0)) continue;
          const photoSets = await Promise.all(flatPhotos.map((p) => compressDataURLMultiRes(p)));
          const updatedAt = Date.now();
          await db.packingItems.update(item.id, { photoSets, photos: [], updatedAt });
          if (uid) pushPackingItem({ ...item, photoSets, photos: [], updatedAt }, uid).catch(() => {});
          migrated++;
        }

        localStorage.setItem(PHOTOSETS_MIGRATION_KEY, "done");
        if (migrated > 0) console.log(`[AppInit] Photo migration complete: ${migrated} record(s) converted to photoSets`);
      } catch (err) {
        console.error("[AppInit] Photo migration failed:", err);
        // Don't set the flag — retry on next load
      }
    }

    migrate();
  }, []);
}

// ==================== FOCUS PULL ====================
// On iOS, the Firestore WebSocket is throttled when the PWA is backgrounded.
// Pulling all three collections when the page becomes visible again cuts the
// "wake from background" sync delay from ~20s to near-instant.

function useFocusPull() {
  const cloudSyncEnabled = useAppStore((s) => s.cloudSyncEnabled);

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      if (!cloudSyncEnabled) return;
      const user = auth.currentUser;
      if (!user || !canCollaborate(user)) return;
      const uid = user.uid;
      const tripIds = await pullSharedTrips(uid).catch(() => [] as string[]);
      const pulls = [pullAllTripContent(uid, tripIds)];
      if (isSyncEnabled(user)) pulls.push(pullWishes(uid).then(() => {}));
      Promise.allSettled(pulls);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [cloudSyncEnabled]);
}

// ==================== VERSION CHECK ====================
// On iOS home-screen PWAs the page HTML can be stale.
// We detect updates by fetching /version.json (no-cache) on every focus
// and comparing against the version baked into this build.
// When a mismatch is found we set a flag that UpdateBanner reads.

const VERSION_UPDATE_KEY = "parqwish-update-available";

function useVersionCheck() {
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res  = await fetch("/version.json?t=" + Date.now(), { cache: "no-store" });
        const data = await res.json() as { version: string };
        if (data.version && data.version !== APP_VERSION) {
          localStorage.setItem(VERSION_UPDATE_KEY, data.version);
          window.dispatchEvent(new Event("parqwish-update-available"));
        }
      } catch {
        // Network unavailable — silently skip
      }
    };

    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);
}

// ==================== SYNC INIT ====================

function useSyncInit() {
  const cloudSyncEnabled = useAppStore((s) => s.cloudSyncEnabled);

  useEffect(() => {
    // Do nothing if the user hasn't opted into cloud sync.
    // No Firebase calls are made — the app stays fully local.
    if (!cloudSyncEnabled) {
      stopSync();
      return;
    }

    // Ensure anonymous auth baseline (no UI, silent)
    ensureAuth().catch(() => {});

    // Start or restart sync whenever auth state changes. Apple-verified
    // accounts get the full sync (their own catalog + any shared trips);
    // any other signed-in identity (Google, email link, or a bare
    // anonymous session — e.g. someone who joined a trip via /join without
    // ever signing in with Apple) still needs shared-trip content to keep
    // syncing on return visits, just not the personal catalog.
    const unsub = onAuthChanged((user) => {
      if (user && isSyncEnabled(user)) {
        startSync().catch((err) =>
          console.warn("[AppInit] Sync start failed:", err)
        );
      } else if (user && canCollaborate(user)) {
        startCollaboratorSync().catch((err) =>
          console.warn("[AppInit] Collaborator sync start failed:", err)
        );
      } else {
        stopSync();
      }
    });

    return () => {
      unsub();
      stopSync();
    };
  }, [cloudSyncEnabled]);
}

// ==================== IN-APP SESSION MARKER ====================
// AppInit only ever mounts inside the (app) route group — its presence
// means this tab has genuinely opened the Planner, not just landed on a
// Guide/Story/Blog content page. Read by ContentLogoLink.tsx so the logo
// on those content pages can send an in-app visitor back to the Planner's
// own dashboard, while a fresh external visitor goes to the marketing
// site instead. sessionStorage (not localStorage) so a new tab/session
// with no recent app activity defaults back to the marketing-site case.

function useMarkInAppSession() {
  useEffect(() => {
    try {
      sessionStorage.setItem(IN_APP_SESSION_KEY, "1");
    } catch {
      // sessionStorage may be blocked — ContentLogoLink falls back safely
    }
  }, []);
}

// ==================== APP INIT ====================
// Client-side initialization that runs once on app mount.
// Add any future init hooks here.

export default function AppInit() {
  useLegacyDbMigration(); // Must run first — populates DB before other hooks read it
  useLegacyKeyMigration(); // Must run before store hydrates
  usePhotoSetsMigration();
  useUserInit();
  useCacheBuster();
  useMarkInAppSession();
  useSyncInit();
  useFocusPull();
  useVersionCheck();
  return null;
}
