"use client";

import { motion } from "framer-motion";
import { PACKING_TABS } from "@/lib/constants";

interface PackingProgressProps {
  stats: {
    total: number;
    completed: number;
    percentComplete: number;
    byType: Record<string, { total: number; completed: number }>;
  };
}

const ACCENT = "var(--color-accent-prepare)";

export default function PackingProgress({ stats }: PackingProgressProps) {
  return (
    <div className="w-full">
      {/* Overall progress bar */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex-1 h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--color-surface-raised)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: ACCENT }}
            initial={{ width: 0 }}
            animate={{ width: `${stats.percentComplete}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>
        <span
          className="text-xs font-medium whitespace-nowrap"
          style={{ color: ACCENT }}
        >
          {stats.percentComplete}%
        </span>
      </div>

      {/* Label + per-category dots */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          {stats.completed} of {stats.total} packed
        </span>
        <div className="flex items-center gap-2">
          {PACKING_TABS.map((tab) => {
            const typeStats = stats.byType[tab.id];
            if (!typeStats || typeStats.total === 0) return null;
            const done = typeStats.completed === typeStats.total;
            return (
              <span
                key={tab.id}
                className="text-xs"
                title={`${tab.label}: ${typeStats.completed}/${typeStats.total}`}
                style={{
                  opacity: done ? 1 : 0.5,
                }}
              >
                {tab.icon}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
