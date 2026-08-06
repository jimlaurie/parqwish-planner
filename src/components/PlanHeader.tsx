"use client";

import { motion } from "framer-motion";
import type { Trip } from "@/lib/db";
import ActiveUserChip from "@/components/ActiveUserChip";

interface PlanHeaderProps {
  trip: Trip;
  stats: {
    total: number;
    completed: number;
    pending: number;
  };
}

export default function PlanHeader({ trip, stats }: PlanHeaderProps) {
  return (
    <motion.div
      className="w-full max-w-2xl mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top row: title */}
      <div className="flex items-center gap-3 mb-1">
        <h1
          className="text-2xl md:text-3xl font-bold flex-1"
          style={{ color: "var(--color-heading)" }}
        >
          {trip.name}
        </h1>
        <ActiveUserChip />
        <span className="text-2xl">{"\u{1F3F0}"}</span>
      </div>

      {/* Stats row */}
      <div
        className="flex items-center gap-4 text-sm mt-2"
        style={{ color: "var(--color-text-muted)" }}
      >
        <span>
          {"\u2B50"} {stats.total} wish{stats.total !== 1 ? "es" : ""}
        </span>
        <span>
          {"\u2705"} {stats.completed} done
        </span>
        <span>
          {"\u{1F4CB}"} {stats.pending} pending
        </span>
      </div>
    </motion.div>
  );
}
