"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DayData, PublishData } from "@/hooks/use-publish-data";
import { DAY_ITEM_TYPE_ICONS } from "@shared/types/day-item";

const ACCENT = "var(--color-accent-publish)";
const SUCCESS = "var(--color-success)";

function formatTime12(time24: string): string {
  if (!time24 || !time24.includes(":")) return "";
  const [hh, mm] = time24.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return "";
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${hour12}:${mm.toString().padStart(2, "0")} ${period}`;
}

// ==================== DAY ACCORDION ITEM ====================

function DayAccordion({ day, data }: { day: DayData; data: PublishData }) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = day.total > 0 && day.completed === day.total;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: `1px solid ${isComplete ? "color-mix(in srgb, var(--color-success) 20%, transparent)" : "var(--color-border-subtle)"}`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer
                   transition-colors duration-100 hover:brightness-110"
        style={{ backgroundColor: "transparent" }}
      >
        {/* Expand arrow */}
        <span
          className="text-[10px] transition-transform duration-200"
          style={{
            color: "var(--color-text-dim)",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          {"\u25B6"}
        </span>

        {/* Date */}
        <span
          className="text-sm font-semibold flex-shrink-0"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {day.displayDate}
        </span>

        {/* Progress bar */}
        <div className="flex-1 mx-2">
          {day.total > 0 ? (
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${day.percentComplete}%`,
                  backgroundColor: isComplete ? SUCCESS : ACCENT,
                }}
              />
            </div>
          ) : (
            <div
              className="h-px"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            />
          )}
        </div>

        {/* Stats */}
        <span
          className="text-[10px] font-mono flex-shrink-0"
          style={{
            color: isComplete
              ? SUCCESS
              : day.total > 0
                ? "var(--color-text-muted)"
                : "var(--color-text-dim)",
          }}
        >
          {day.total > 0
            ? `${day.completed}/${day.total} (${day.percentComplete}%)`
            : "No items"}
        </span>

        {isComplete && (
          <span className="text-sm flex-shrink-0">{"\u2705"}</span>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-3 pt-1"
              style={{ borderTop: "1px solid var(--color-border-subtle)" }}
            >
              {/* What happened */}
              <p
                className="text-[9px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--color-text-dim)" }}
              >
                What happened
              </p>
              {day.items.length > 0 ? (
                <div className="space-y-1.5 mb-3">
                  {day.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 py-1 px-2 rounded-lg"
                      style={{
                        backgroundColor: item.completed
                          ? "color-mix(in srgb, var(--color-success) 6%, transparent)"
                          : "var(--color-surface-sunken)",
                      }}
                    >
                      <span
                        className="text-[10px] font-mono w-16 shrink-0"
                        style={{ color: "var(--color-text-dim)" }}
                      >
                        {formatTime12(item.scheduledTime ?? "")}
                      </span>
                      <span className="text-sm">
                        {DAY_ITEM_TYPE_ICONS[item.itemType] ?? "\uD83D\uDCCC"}
                      </span>
                      <span
                        className="text-xs flex-1 truncate"
                        style={{
                          color: item.completed
                            ? "var(--color-text-dim)"
                            : "var(--color-text-secondary)",
                          textDecoration: item.completed
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {item.title}
                      </span>
                      {item.land && (
                        <span
                          className="text-[10px] shrink-0"
                          style={{ color: "var(--color-text-dim)" }}
                        >
                          {item.land}
                        </span>
                      )}
                      {item.completed && (
                        <span className="text-xs shrink-0">{"\u2713"}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className="text-xs text-center py-2 mb-3"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  No items scheduled
                </p>
              )}

              {/* From your wish list */}
              {data.wishes.length > 0 && (
                <>
                  <p
                    className="text-[9px] font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    From your wish list
                  </p>
                  <div className="space-y-1">
                    {data.wishes.map((wish) => {
                      const appearedInDay = day.items.some(
                        (i) => i.sourceId === wish.id
                      );
                      const wishSel = data.wishSelections.find(
                        (s) => s.wishId === wish.id
                      );
                      const completed = wishSel?.completed ?? false;
                      return (
                        <div
                          key={wish.id}
                          className="flex items-center gap-2 py-0.5 px-2 rounded"
                          style={{
                            backgroundColor: appearedInDay
                              ? "color-mix(in srgb, var(--color-info, #1976D2) 6%, transparent)"
                              : "transparent",
                          }}
                        >
                          <span className="text-xs">
                            {appearedInDay ? "\u2705" : completed ? "\u2705" : "\u23ED"}
                          </span>
                          <span
                            className="text-xs flex-1 truncate"
                            style={{
                              color: appearedInDay || completed
                                ? "var(--color-text-secondary)"
                                : "var(--color-text-dim)",
                            }}
                          >
                            {wish.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

interface DayBreakdownProps {
  data: PublishData;
}

export default function DayBreakdown({ data }: DayBreakdownProps) {
  return (
    <div className="w-full max-w-4xl mb-8">
      <h2
        className="text-xs font-bold mb-3 uppercase tracking-wider"
        style={{ color: ACCENT }}
      >
        Day-by-Day Breakdown
      </h2>
      <div className="space-y-2">
        {data.days.map((day) => (
          <DayAccordion key={day.date} day={day} data={data} />
        ))}
      </div>
    </div>
  );
}
