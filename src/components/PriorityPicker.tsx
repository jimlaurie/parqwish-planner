"use client";

// ==================== PRIORITY PICKER ====================
// A–E "ride ticket" priority, after Disneyland's original ticket books
// (see shared/constants/priorities.ts). Each option keeps a faint tint of its
// own color even when unselected so the cool → warm scale is visible before
// anything is picked, and a caption explains what the letters mean.

import { motion } from "framer-motion";
import { TICKET_PRIORITIES, TICKET_COLORS, TICKET_EXPLAINER, ticketTitle } from "@/lib/constants";

interface PriorityPickerProps {
  value: string;
  onChange: (priority: string) => void;
}

export default function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2" role="group" aria-label="Priority ticket">
        {TICKET_PRIORITIES.map((p) => {
          const colors = TICKET_COLORS[p];
          const isSelected = value === p;
          return (
            <motion.button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-pressed={isSelected}
              aria-label={ticketTitle(p)}
              title={ticketTitle(p)}
              className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border-2
                         cursor-pointer transition-all duration-150 flex-1"
              style={{
                backgroundColor: isSelected
                  ? colors.bg
                  : `color-mix(in srgb, ${colors.border} 6%, transparent)`,
                borderColor: isSelected
                  ? colors.border
                  : `color-mix(in srgb, ${colors.border} 30%, transparent)`,
                borderStyle: isSelected ? "solid" : "dashed",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span
                className="text-base font-bold leading-none"
                style={{
                  // Selected tickets sit on their own dark fill, so the raw
                  // ticket color reads fine. Unselected ones sit on the page
                  // background — mixing toward the theme's text color keeps
                  // gold/orange legible on the light theme's parchment.
                  color: isSelected
                    ? colors.border
                    : `color-mix(in srgb, ${colors.border} 60%, var(--color-text-primary))`,
                }}
              >
                {p}
              </span>
              <span
                className="text-[10px] leading-tight text-center"
                style={{
                  color: isSelected ? colors.border : "var(--color-text-muted)",
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {colors.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
        {TICKET_EXPLAINER}
      </p>
    </div>
  );
}
