// ==================== AI CONTEXT TYPES ====================
// Structured data shapes for AI consumption via MCP server, Claude API,
// or clipboard export. These types define the contract between the app's
// internal data and any AI system analyzing a user's trip.

import type { Trip, TripPhase } from "./trip";
import type { Wish, WishTagId } from "./wish";
import type { PackingItem, PackingType } from "./packing";
import type { ScheduledDining, ScheduledShow, RidePreference, LightningLane, PhotoSpot } from "./itinerary";
import type { Priority, ParkKey } from "./common";

// ==================== TRIP CONTEXT ====================

/** Complete snapshot of a trip for AI analysis */
export interface TripContext {
  trip: TripSummary;
  dates: string[];              // All trip dates YYYY-MM-DD
  wishes: WishSummary[];
  days: DayPlan[];
  packing: PackingSummary;
  budget: BudgetSummary;
  metadata: ContextMetadata;
}

/** High-level trip info (safe to share — no confirmation numbers) */
export interface TripSummary {
  name: string;
  startDate: string;
  endDate: string;
  phase: TripPhase;
  totalDays: number;
  hotelName?: string;
  transportationType?: string;
}

/** A single day's plan */
export interface DayPlan {
  date: string;                 // YYYY-MM-DD
  dayOfWeek: string;            // "Monday", "Tuesday", etc.
  rides: RidePlanItem[];
  shows: ShowPlanItem[];
  dining: DiningPlanItem[];
  lightningLanes: LightningLanePlanItem[];
  photoSpots: string[];         // Just names for AI context
  completedCount: number;
  totalCount: number;
}

/** Ride info for AI (simplified from RidePreference) */
export interface RidePlanItem {
  name: string;
  park: string;
  land: string;
  priority: Priority;
  maxWait?: number;
  completed: boolean;
}

/** Show info for AI */
export interface ShowPlanItem {
  name: string;
  park: string;
  land: string;
  showTime?: string;
  priority: Priority;
  completed: boolean;
}

/** Dining info for AI */
export interface DiningPlanItem {
  name: string;
  park: string;
  land: string;
  time?: string;
  type: "reservation" | "walk-up" | "mobile-order";
  priority: Priority;
  completed: boolean;
  partySize?: number;
  dietaryNotes?: string;
}

/** Lightning Lane for AI */
export interface LightningLanePlanItem {
  name: string;
  returnTime?: string;
  completed: boolean;
}

/** Wish summary for AI */
export interface WishSummary {
  title: string;
  tags: WishTagId[];
  priority: Priority;
  completed: boolean;
  hasUrl: boolean;              // Flag only, not the actual URL
  park?: string;
  land?: string;
  maxWaitTime?: number;
}

/** Packing progress for AI */
export interface PackingSummary {
  outfits: PackingCategorySummary;
  equipment: PackingCategorySummary;
  sundries: PackingCategorySummary;
  shopping: PackingCategorySummary;
}

export interface PackingCategorySummary {
  total: number;
  packed: number;
  missing: string[];            // Names of unpacked items
}

/** Budget tracking for AI */
export interface BudgetSummary {
  shoppingItems: { name: string; price: number; purchased: boolean }[];
  estimatedTotal: number;
  spentTotal: number;
}

/** Metadata about the context export */
export interface ContextMetadata {
  exportedAt: string;           // ISO-8601
  appVersion: string;
  source: "mobile" | "pwa";
  /** Prompt hint for the AI — describes what the data represents */
  systemPrompt: string;
}

// ==================== MCP TOOL SCHEMAS ====================
// These types define what an MCP server would expose as tools.

/** Available MCP tool names */
export type MCPToolName =
  | "get_trip_overview"
  | "get_day_plan"
  | "get_wishes"
  | "get_packing_status"
  | "get_dining_reservations"
  | "get_budget_summary"
  | "suggest_itinerary_improvements";

/** MCP tool parameter shapes */
export interface MCPToolParams {
  get_trip_overview: Record<string, never>;
  get_day_plan: { date: string };
  get_wishes: { tag?: WishTagId; completed?: boolean };
  get_packing_status: { type?: PackingType };
  get_dining_reservations: { date?: string };
  get_budget_summary: Record<string, never>;
  suggest_itinerary_improvements: { date: string; preferences?: string };
}

// ==================== DEFAULT SYSTEM PROMPT ====================

/** System prompt template for AI assistants consuming trip data */
export const DEFAULT_AI_SYSTEM_PROMPT = `You are a Disneyland Resort trip planning assistant. You have access to the user's trip data from the ParQ Wish app.

CONTEXT:
- The user is planning a trip to the Disneyland Resort in Anaheim, California
- The resort includes: Disneyland Park, Disney California Adventure, Downtown Disney District, and three on-property hotels
- Priority system: E = Must Do, D = Important, C = Medium, B = Low, A = If Time

GUIDELINES:
- Be specific about park locations and lands when making suggestions
- Consider travel time between lands/parks when suggesting itinerary changes
- Respect the user's priority rankings — don't push low-priority items
- If rides have a maxWait set, respect that threshold in suggestions
- Note any gaps in dining (e.g., no lunch planned) or scheduling conflicts
- Consider park hours, rope drop strategy, and typical crowd patterns
- Be aware that Lightning Lane and Genie+ availability changes throughout the day`;
