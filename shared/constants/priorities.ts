// ==================== PRIORITY SYSTEM ====================
// Ticket-tier inspired: E (highest) → A (lowest)

import type { Priority } from "../types/common";

export interface PriorityConfig {
  bg: string;
  border: string;
  label: string;
}

export const TICKET_PRIORITIES: readonly Priority[] = ["A", "B", "C", "D", "E"] as const;

export const TICKET_COLORS: Record<string, PriorityConfig> = {
  E: { bg: "#1a5c2a", border: "#2a8c3e", label: "Must Do" },
  D: { bg: "#b8960c", border: "#d4af37", label: "Important" },
  C: { bg: "#555566", border: "#7777aa", label: "Medium" },
  B: { bg: "#8c2a2a", border: "#c04040", label: "Low" },
  A: { bg: "#4a4a5a", border: "#6a6a7a", label: "If Time" },
};

export const PRIORITY_SORT_ORDER: Record<string, number> = {
  E: 0,
  D: 1,
  C: 2,
  B: 3,
  A: 4,
};

/** Convenience aliases matching mobile app's PRIORITIES constant */
export const PRIORITY_ALIASES = {
  HIGH: "E" as Priority,
  MEDIUM: "C" as Priority,
  LOW: "A" as Priority,
};
