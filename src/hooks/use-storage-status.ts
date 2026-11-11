"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import { useAppStore } from "@/lib/store";
import { isSyncEnabled, onAuthChanged } from "@/lib/auth";
import {
  hasWebKit7DayRule, installSteps, isStandalone, persistPrompts, readPersisted, requestPersistence,
  storageStatus, type StorageStatus,
} from "@/lib/storage-safety";

/** Asked once per page load at most, wherever the hook is used. */
let autoAsked = false;

export interface StorageStatusInfo {
  /** Undefined until the browser and the database have answered. */
  status: StorageStatus | undefined;
  /** How to install the Planner in this browser (Safari), if it needs telling. */
  installSteps: string | undefined;
  /** Firefox asks the person, so persist() waits for a button there. */
  canAskToKeep: boolean;
  askToKeep: () => Promise<void>;
}

/**
 * Whether this device will keep the Planner's data (src/lib/storage-safety.ts).
 * Also asks the browser to keep it once there's something to keep, where
 * asking shows no prompt (every browser but Firefox).
 */
export function useStorageStatus(): StorageStatusInfo {
  const cloudSyncEnabled = useAppStore((s) => s.cloudSyncEnabled);
  const [appleSignedIn, setAppleSignedIn] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null | undefined>(undefined);
  const [ua, setUa] = useState<{ agent: string; touch: number } | undefined>(undefined);
  const hasData = useLiveQuery(async () => (await db.trips.count()) + (await db.wishes.count()) + (await db.packingItems.count()) > 0, []);

  useEffect(() => {
    setUa({ agent: navigator.userAgent, touch: navigator.maxTouchPoints ?? 0 });
    readPersisted().then(setPersisted);
    return onAuthChanged((user) => setAppleSignedIn(isSyncEnabled(user)));
  }, []);

  useEffect(() => {
    if (!hasData || !ua || persisted !== false || autoAsked || persistPrompts(ua.agent)) return;
    autoAsked = true;
    requestPersistence().then(setPersisted);
  }, [hasData, ua, persisted]);

  const askToKeep = useCallback(async () => setPersisted(await requestPersistence()), []);

  if (!ua || persisted === undefined || hasData === undefined) {
    return { status: undefined, installSteps: undefined, canAskToKeep: false, askToKeep };
  }
  const status = storageStatus({
    standalone: isStandalone(),
    persisted,
    webkit7Day: hasWebKit7DayRule(ua.agent, ua.touch),
    backedUp: cloudSyncEnabled && appleSignedIn,
    hasData,
  });
  return {
    status,
    installSteps: installSteps(ua.agent, ua.touch),
    canAskToKeep: persisted === false && persistPrompts(ua.agent) && status.kind === "best-effort",
    askToKeep,
  };
}
