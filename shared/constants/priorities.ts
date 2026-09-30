// ==================== PRIORITY SYSTEM ====================
// Modeled on Disneyland's original A–E ride ticket books (1955–1982): an
// "E-Ticket" was the top attraction, an "A-Ticket" the simplest. E is the
// highest priority, A the lowest.
//
// Colors run cool → warm as the ticket rises, ending on the brand gold for
// E, so the scale reads at a glance without knowing the letters. (B used to
// be red, which read as an error state rather than "low priority".)

import type { Priority } from "../types/common";

export interface PriorityConfig {
  bg: string;
  border: string;
  label: string;
}

export const TICKET_PRIORITIES: readonly Priority[] = ["A", "B", "C", "D", "E"] as const;

export const TICKET_COLORS: Record<string, PriorityConfig> = {
  E: { bg: "#4d3d00", border: "#ffd700", label: "Must Do" },
  D: { bg: "#4d2c0c", border: "#f0913a", label: "Really Want" },
  C: { bg: "#123f3c", border: "#3fb8a8", label: "Want" },
  B: { bg: "#1f2f52", border: "#7196e0", label: "Maybe" },
  A: { bg: "#34344a", border: "#9a9ab4", label: "If Time" },
};

/** One-line explanation of the ticket scale, for pickers and tooltips. */
export const TICKET_EXPLAINER =
  "Rated like Disneyland\u2019s classic ride tickets \u2014 E-Ticket is a must-do, A-Ticket is if there\u2019s time.";

/** "E-Ticket · Must Do" — full name for tooltips and accessible labels. */
export function ticketTitle(priority: string): string {
  const config = TICKET_COLORS[priority];
  return config ? `${priority}-Ticket \u00b7 ${config.label}` : `${priority}-Ticket`;
}

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
