// ==================== AGENT TYPES ====================
// Real-time in-park context for the notification evaluator and future AI layer.
//
// Distinct from ai-context.ts (TripContext) which is trip-planning data for
// PWA / Claude API use. ContextSnapshot is live, ephemeral in-park state.

// ==================== CONTEXT SNAPSHOT ====================

/** One monitored ride with its live wait data merged in */
export interface LiveRide {
  rideId: string;
  name: string;
  park: string;
  land?: string;
  status: string;          // 'OPERATING' | 'DOWN' | 'CLOSED' | etc.
  currentWait: number;     // minutes, 0 if not operating
  maxWait: number;         // user's preference threshold
  notifiedToday: boolean;  // already fired a ride-ready notification today
}

/** A scheduled event the user has coming up */
export interface UpcomingEvent {
  id: string;
  type: 'show' | 'dining' | 'lightningLane';
  name: string;
  scheduledTime: string;       // "H:MM AM/PM"
  travelTime?: number;         // minutes buffer before scheduled time
  notificationScheduled: boolean;
}

/** Live in-park state — assembled by ContextSnapshot.ts, fed to evaluators */
export interface ContextSnapshot {
  date: string;                // YYYY-MM-DD (local park timezone)
  timeOfDay: string;           // ISO-8601 current timestamp
  location?: { lat: number; lng: number };
  monitoredRides: LiveRide[];
  upcomingEvents: UpcomingEvent[];
  completedItemCount: number;
  totalItemCount: number;
  userId: string;
}

// ==================== NOTIFICATION CANDIDATE ====================

/** A proposed notification returned by a pure evaluator function.
 *  The caller decides whether to actually fire it (side effects stay outside). */
export interface NotificationCandidate {
  type: 'rideReady' | 'showDeparture' | 'diningDeparture' | 'lightningLane';
  itemId: string;
  title: string;
  body: string;
  triggerAt?: Date;   // undefined = fire immediately
  reason: string;     // human-readable — "Space Mountain at 15 min (max: 20 min)"
}

// ==================== AGENT QUERY ====================

/** A natural-language question + context, for Phase B conversational AI */
export interface AgentQuery {
  question: string;
  context: ContextSnapshot;
  // Optional richer trip data when user is in planning mode (from ai-context.ts)
  tripContext?: import('./ai-context').TripContext;
}
