"use client";

// ==================== SHOW SCHEDULES ====================
// Each show's times for the day being planned (see lib/showtimes.ts): the
// latest sync from park data plus the weekday history, found by park-data id
// or, for a show wish that was never linked, its name.

import { useCallback, useEffect, useState } from "react";
import { getParkData, getShowtimesSyncedAt, getShowtimeHistory } from "@/lib/park-data";
import { syncDay, showtimesForDay, type ShowSchedule, type ShowGuess, type ShowtimeHistory } from "@/lib/showtimes";

interface ShowIndex {
  /** park-data id → the latest synced schedule */
  byId: Map<string, ShowSchedule>;
  /** lowercase name → park-data id */
  idByName: Map<string, string>;
  /** Park-time date the latest showtimes are for (YYYY-MM-DD), or null. */
  syncedOn: string | null;
}

/** `day` (YYYY-MM-DD) is the day being planned; omit it when only `syncedOn` is needed. */
export function useShowSchedules(day: string | null = null) {
  const [index, setIndex] = useState<ShowIndex | null>(null);
  const [history, setHistory] = useState<ShowtimeHistory | null>(null);

  useEffect(() => {
    let cancelled = false;
    getParkData()
      .then((items) => {
        if (cancelled) return;
        const byId = new Map<string, ShowSchedule>();
        const idByName = new Map<string, string>();
        for (const item of items) {
          if (item.type !== "show") continue;
          // The sync empties a closed show's times but can leave an old window behind
          const closed = item.status === "closed";
          byId.set(item.id, {
            times: closed ? [] : item.times ?? [],
            ranges: closed ? [] : item.timeRanges ?? [],
            duration: item.duration || undefined,
          });
          idByName.set(item.name.toLowerCase(), item.id);
        }
        setIndex({ byId, idByName, syncedOn: syncDay(getShowtimesSyncedAt()) });
      })
      .catch((err) => console.error("[use-show-schedules] park data didn't load:", err));
    getShowtimeHistory().then((h) => { if (!cancelled) setHistory(h); });
    return () => { cancelled = true; };
  }, []);

  /** A show's times for `day` and what they're based on, or null for anything that isn't a known show. */
  const findShow = useCallback(
    (parkDataId: string | undefined, title: string | undefined): ShowGuess | null => {
      if (!index) return null;
      const id = (parkDataId && index.byId.has(parkDataId) && parkDataId) || (title && index.idByName.get(title.toLowerCase()));
      const latest = id ? index.byId.get(id) : undefined;
      return id && latest ? showtimesForDay(id, latest, day, index.syncedOn, history) : null;
    },
    [index, history, day]
  );

  /** Just the schedule from findShow. */
  const findSchedule = useCallback(
    (parkDataId: string | undefined, title: string | undefined): ShowSchedule | null => findShow(parkDataId, title)?.schedule ?? null,
    [findShow]
  );

  return { findShow, findSchedule, syncedOn: index?.syncedOn ?? null };
}
