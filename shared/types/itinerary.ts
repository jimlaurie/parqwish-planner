// ==================== ITINERARY TYPES ====================

import type { Priority, ParkKey, Timestamped } from "./common";

/** Ride preference — per-ride settings stored as object keyed by rideId */
export interface RidePreference {
  name: string;
  parkName: string;
  land: string;
  priority: Priority;
  maxWait?: number;
  completed: boolean;
  notes?: string;
  isMonitored?: boolean;
}

/** Scheduled show */
export interface ScheduledShow {
  id: string;
  name: string;
  showData: {
    locationShortName: "DL" | "DCA";
    land: string;
  };
  selectedTime: number | null; // milliseconds
  selectedTimeType: "fixed" | "range";
  travelTime: number;
  priority: Priority;
  completed: boolean;
  notes?: string;
}

/** Scheduled dining reservation or walk-up */
export interface ScheduledDining {
  id: string;
  name: string;
  restaurantName?: string;
  restaurant?: {
    locationShortName: "DL" | "DCA";
    land: string;
    cuisine?: string;
    priceRange?: string;
  };
  time?: string;
  type: "reservation" | "walk-up";
  travelTime: number;
  priority: Priority;
  completed: boolean;
  notes?: string;
  reservationConfirmation?: string;
  partySize?: number;
  dietaryNotes?: string;
}

/** Lightning Lane return time */
export interface LightningLane {
  id?: string;
  rideId?: string;
  rideName?: string;
  name?: string;
  time: string;
  returnTime?: string;
  travelTime: number;
  priority: Priority;
  notes?: string;
  completed?: boolean;
}

/** Photo spot */
export interface PhotoSpot {
  id: string;
  name: string;
  park?: string;
  land?: string;
  priority: Priority;
  completed: boolean;
  notes?: string;
  photos?: string[];
  photoUri?: string;  // Legacy
  type: "photo";
  /** GPS capture fields — set when created via the ParkMap "Create Place" quick-add. */
  latitude?: number;
  longitude?: number;
  capturedAt?: string; // ISO-8601
}

/** Itinerary item — scheduled on a specific day's timeline (PWA Play phase) */
export interface ItineraryItem extends Timestamped {
  id: string;
  tripId: string;
  date: string;                  // YYYY-MM-DD
  sourceType: "wish" | "dining" | "shopping" | "custom";
  sourceId?: string;
  parkDataId?: string;
  title: string;
  startTime: string;             // HH:mm 24h
  durationMinutes: number;
  park?: string;
  land?: string;
  notes?: string;
  completed: boolean;
  sortOrder: number;
  itemType?: string;             // "ride" | "show" | "dining" | "place" | "shopping" | "wish"
  userId?: string;               // Owner of this item (default: "user_primary")
}
