"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import { useAppStore } from "@/lib/store";

const ACCENT = "var(--color-accent-preview)";

interface DatePickerBarProps {
  startDate: string;
  endDate: string;
}

function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const current = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (current <= last) {
    days.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatDateChip(dateStr: string): { dayOfWeek: string; monthDay: string } {
  const d = new Date(dateStr + "T12:00:00");
  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  return { dayOfWeek, monthDay };
}

export default function DatePickerBar({ startDate, endDate }: DatePickerBarProps) {
  const { currentTripId, selectedPlayDate, setSelectedPlayDate } = useAppStore();
  const days = useMemo(() => getDaysBetween(startDate, endDate), [startDate, endDate]);

  // Get itinerary counts per date for badges
  const countsByDate = useLiveQuery(
    async () => {
      if (!currentTripId) return {};
      const all = await db.dayItems
        .where("tripId")
        .equals(currentTripId)
        .toArray();
      const counts: Record<string, number> = {};
      for (const item of all) {
        counts[item.date] = (counts[item.date] ?? 0) + 1;
      }
      return counts;
    },
    [currentTripId]
  );

  return (
    <div className="w-full max-w-7xl mb-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {days.map((day) => {
          const { dayOfWeek, monthDay } = formatDateChip(day);
          const isSelected = selectedPlayDate === day;
          const count = countsByDate?.[day] ?? 0;

          return (
            <button
              key={day}
              onClick={() => setSelectedPlayDate(day)}
              className="relative flex flex-col items-center px-4 py-2 rounded-xl text-xs
                         cursor-pointer transition-all duration-150 shrink-0
                         hover:brightness-110"
              style={{
                backgroundColor: isSelected ? ACCENT : "var(--color-bg-card)",
                color: isSelected ? "var(--color-bg-deep)" : "var(--color-text-secondary)",
                border: isSelected ? "none" : "1px solid var(--color-border-subtle)",
              }}
            >
              <span className="font-semibold">{dayOfWeek}</span>
              <span className="text-[10px] opacity-80">{monthDay}</span>
              {count > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center
                             justify-center text-[9px] font-bold"
                  style={{
                    backgroundColor: isSelected ? "var(--color-bg-deep)" : ACCENT,
                    color: isSelected ? ACCENT : "var(--color-bg-deep)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
