"use client";

import { motion } from "framer-motion";
import { TICKET_PRIORITIES, TICKET_COLORS } from "@/lib/constants";

interface PriorityPickerProps {
  value: string;
  onChange: (priority: string) => void;
}

export default function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  return (
    <div className="flex gap-2">
      {TICKET_PRIORITIES.map((p) => {
        const colors = TICKET_COLORS[p];
        const isSelected = value === p;
        return (
          <motion.button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border-2
                       cursor-pointer transition-all duration-150 flex-1"
            style={{
              backgroundColor: isSelected ? colors.bg : "transparent",
              borderColor: isSelected
                ? colors.border
                : "var(--color-border-subtle)",
              opacity: isSelected ? 1 : 0.6,
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span
              className="text-sm font-bold"
              style={{
                color: isSelected
                  ? colors.border
                  : "var(--color-text-muted)",
              }}
            >
              {p}
            </span>
            <span
              className="text-[10px]"
              style={{
                color: isSelected
                  ? colors.border
                  : "var(--color-text-dim)",
              }}
            >
              {colors.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
