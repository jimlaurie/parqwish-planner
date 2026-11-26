"use client";

import { useState, useEffect } from "react";
import type { ParkDataItem } from "@/lib/park-data";
import { getResortParkData } from "@/lib/resort-park-data";
import { DEFAULT_RESORT_ID } from "@shared/constants/resorts";

/**
 * A resort's catalog items (Disneyland Resort unless told otherwise).
 * `error` is set when nothing loaded, so a failure doesn't look like an
 * empty resort.
 */
export function useParkData(resortId: string = DEFAULT_RESORT_ID) {
  const [state, setState] = useState<{ resortId: string; items: ParkDataItem[]; loading: boolean; error: string | null }>(
    { resortId, items: [], loading: true, error: null },
  );

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ resortId, items: prev.resortId === resortId ? prev.items : [], loading: true, error: null }));
    getResortParkData(resortId)
      .then((data) => {
        if (!cancelled) setState({ resortId, items: data, loading: false, error: null });
      })
      .catch((err) => {
        console.error("[ParkData] Failed to load:", err);
        if (!cancelled) setState({ resortId, items: [], loading: false, error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [resortId]);

  return { items: state.items, loading: state.loading, error: state.error };
}
