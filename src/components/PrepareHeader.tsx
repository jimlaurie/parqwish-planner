"use client";

import { motion } from "framer-motion";
import type { Trip } from "@/lib/db";
import PackingProgress from "@/components/PackingProgress";
import ActiveUserChip from "@/components/ActiveUserChip";

interface PrepareHeaderProps {
  trip: Trip;
  stats: {
    total: number;
    completed: number;
    percentComplete: number;
    byType: Record<string, { total: number; completed: number }>;
  };
}

export default function PrepareHeader({ trip, stats }: PrepareHeaderProps) {
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
        <span className="text-2xl">{"\u{1F3D4}\uFE0F"}</span>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <PackingProgress stats={stats} />
      </div>
    </motion.div>
  );
}
