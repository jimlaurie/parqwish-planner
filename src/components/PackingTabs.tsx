"use client";

import { motion } from "framer-motion";
import { PACKING_TABS } from "@/lib/constants";
import type { PackingType } from "@/lib/db";

interface PackingTabsProps {
  activeTabs: PackingType[];
  onToggleTab: (tab: PackingType) => void;
  onSelectAll: () => void;
  onClear: () => void;
  counts: Record<string, { total: number; completed: number }>;
}

const ACCENT = "var(--color-accent-prepare)";

export default function PackingTabs({
  activeTabs,
  onToggleTab,
  onSelectAll,
  onClear,
  counts,
}: PackingTabsProps) {
  const allSelected = activeTabs.length === PACKING_TABS.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {PACKING_TABS.map((tab) => {
          const isActive = activeTabs.includes(tab.id);
          const count = counts[tab.id]?.total ?? 0;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onToggleTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border-2
                         cursor-pointer transition-all duration-150 text-sm whitespace-nowrap
                         flex-shrink-0"
              style={{
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--color-accent-prepare) 12%, transparent)"
                  : "transparent",
                borderColor: isActive ? ACCENT : "var(--color-border-subtle)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span>{tab.icon}</span>
              <span
                className="font-medium"
                style={{
                  color: isActive ? ACCENT : "var(--color-text-secondary)",
                }}
              >
                {tab.label}
              </span>
              {count > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: isActive
                      ? ACCENT
                      : "var(--color-surface-raised)",
                    color: isActive
                      ? "var(--color-bg-deep)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      {/* Quick select buttons */}
      <div className="flex gap-2 px-1">
        <button
          onClick={allSelected ? onClear : onSelectAll}
          className="text-[11px] cursor-pointer transition-colors duration-150"
          style={{ color: "var(--color-text-dim)" }}
        >
          {allSelected ? "Clear" : "Select All"}
        </button>
      </div>
    </div>
  );
}
