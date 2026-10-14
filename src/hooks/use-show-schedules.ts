"use client";

// ==================== SHOW SCHEDULES ====================
// Each show's listed times from park data (see lib/showtimes.ts), found by
// its park-data id or, for a show wish that was never linked, its name.

import { useCallback, useEffect, useState } from "react";
import { getParkData, getShowtimesSyncedAt } from "@/lib/park-data";
import { syncDay, type ShowSchedule } from "@/lib/showtimes";

interface ShowIndex {
  byId: Map<string, ShowSchedule>;
  byName: Map<string, ShowSchedule>;
  /** Park-time date the showtimes are for (YYYY-MM-DD), or null. */
  syncedOn: string | null;
}

export function useShowSchedules() {
  const [index, setIndex] = useState<ShowIndex | null>(null);

  useEffect(() => {
    let cancelled = false;
    getParkData()
      .then((items) => {
        if (cancelled) return;
        const byId = new Map<string, ShowSchedule>();
        const byName = new Map<string, ShowSchedule>();
        for (const item of items) {
          if (item.type !== "show") continue;
          const schedule: ShowSchedule = { times: item.times ?? [], ranges: item.timeRanges ?? [], duration: item.duration || undefined };
          byId.set(item.id, schedule);
          byName.set(item.name.toLowerCase(), schedule);
        }
        setIndex({ byId, byName, syncedOn: syncDay(getShowtimesSyncedAt()) });
      })
      .catch((err) => console.error("[use-show-schedules] park data didn't load:", err));
    return () => { cancelled = true; };
  }, []);

  /** A show's schedule, or null for anything that isn't a known show. */
  const findSchedule = useCallback(
    (parkDataId: string | undefined, title: string | undefined): ShowSchedule | null => {
      if (!index) return null;
      return (parkDataId && index.byId.get(parkDataId)) || (title && index.byName.get(title.toLowerCase())) || null;
    },
    [index]
  );

  return { findSchedule, syncedOn: index?.syncedOn ?? null };
}
