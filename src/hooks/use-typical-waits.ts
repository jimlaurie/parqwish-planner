"use client";

import { useEffect, useState } from "react";
import { getWaitTimeStats, type WaitTimeStats } from "@/lib/park-data";

// One load per page session, shared by every timeline card. getWaitTimeStats
// itself caches the file in localStorage for 24h.
let statsPromise: Promise<WaitTimeStats | null> | null = null;

/** The nightly wait-time medians, or null until loaded / if unavailable. */
export function useTypicalWaits(): WaitTimeStats | null {
  const [stats, setStats] = useState<WaitTimeStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    statsPromise ??= getWaitTimeStats().catch((err) => {
      console.error("[useTypicalWaits] load failed:", err);
      statsPromise = null;
      return null;
    });
    statsPromise.then((s) => { if (!cancelled) setStats(s); });
    return () => { cancelled = true; };
  }, []);
  return stats;
}
