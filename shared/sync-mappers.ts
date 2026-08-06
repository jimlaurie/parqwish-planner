// ==================== SHARED SYNC MAPPERS ====================
// Pure functions that convert loose platform-specific data into strongly-typed
// sync wire format items. Used by both mobile and PWA sync-translate layers.
// No platform dependencies (no Dexie, no AsyncStorage, no expo-file-system).

import type {
  SyncRide,
  SyncPlace,
  SyncShow,
  SyncDining,
  SyncWish,
  SyncPackingItem,
  SyncShoppingItem,
} from "./types/sync";
import { normalizeParkKey, normalizeDiningType, DEFAULT_PRIORITY } from "./sync-helpers";

// ==================== LOOSE INPUT INTERFACES ====================
// These accept the union of fields that either platform might provide.
// All fields except id/name/title are optional with sensible defaults.

export interface LooseRideInput {
  id: string;
  name: string;
  park?: string;
  land?: string;
  priority?: string;
  maxWait?: number;
  completed?: boolean;
  completedAt?: string;
  notes?: string;
}

export interface LoosePlaceInput {
  id: string;
  name: string;
  park?: string;
  land?: string;
  priority?: string;
  completed?: boolean;
  completedAt?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  capturedAt?: string;
}

export interface LooseShowInput {
  id: string;
  name: string;
  park?: string;
  land?: string;
  showTime?: string;
  timeType?: string;
  travelTime?: number;
  priority?: string;
  completed?: boolean;
  completedAt?: string;
  notes?: string;
}

export interface LooseDiningInput {
  id: string;
  name: string;
  park?: string;
  land?: string;
  time?: string;
  /** Mobile uses "diningType", PWA uses "type" — both accepted */
  type?: string;
  diningType?: string;
  travelTime?: number;
  priority?: string;
  completed?: boolean;
  completedAt?: string;
  notes?: string;
  reservationConfirmation?: string;
  partySize?: number;
  dietaryNotes?: string;
}

export interface LooseWishInput {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  priority?: string;
  completed?: boolean;
  completedAt?: string;
  url?: string;
  notes?: string;
  parkDataId?: string;
  park?: string;
  land?: string;
}

export interface LoosePackingInput {
  id: string;
  name: string;
  category?: string;
  priority?: string;
  /** Mobile uses "packed", PWA uses "completed" — both accepted */
  completed?: boolean;
  completedAt?: string;
  packed?: boolean;
  notes?: string;
}

export interface LooseShoppingInput extends LoosePackingInput {
  price?: string | number;
  shops?: string[];
  url?: string;
  purchased?: boolean;
}

// ==================== EXPORT MAPPERS ====================
// Convert loose inputs to strongly-typed sync wire format.

export function toSyncRide(input: LooseRideInput, date: string): SyncRide {
  return {
    id: input.id,
    name: input.name,
    park: normalizeParkKey(input.park),
    land: input.land || "",
    priority: input.priority || DEFAULT_PRIORITY,
    maxWait: input.maxWait,
    completed: input.completed || false,
    completedAt: input.completedAt,
    notes: input.notes || "",
    date,
  };
}

export function toSyncPlace(input: LoosePlaceInput, date: string): SyncPlace {
  return {
    id: input.id,
    name: input.name,
    park: normalizeParkKey(input.park),
    land: input.land || "",
    priority: input.priority || DEFAULT_PRIORITY,
    completed: input.completed || false,
    completedAt: input.completedAt,
    notes: input.notes || "",
    latitude: input.latitude,
    longitude: input.longitude,
    capturedAt: input.capturedAt,
    date,
  };
}

export function toSyncShow(input: LooseShowInput, date: string): SyncShow {
  return {
    id: input.id,
    name: input.name,
    park: normalizeParkKey(input.park),
    land: input.land || "",
    showTime: input.showTime || "",
    timeType: (input.timeType || "fixed").toLowerCase() as "fixed" | "range",
    travelTime: input.travelTime,
    priority: input.priority || DEFAULT_PRIORITY,
    completed: input.completed || false,
    completedAt: input.completedAt,
    notes: input.notes || "",
    date,
  };
}

export function toSyncDining(input: LooseDiningInput, date: string): SyncDining {
  return {
    id: input.id,
    name: input.name,
    park: normalizeParkKey(input.park),
    land: input.land || "",
    time: input.time || "",
    type: normalizeDiningType(input.type || input.diningType),
    travelTime: input.travelTime,
    priority: input.priority || DEFAULT_PRIORITY,
    completed: input.completed || false,
    completedAt: input.completedAt,
    notes: input.notes || "",
    reservationConfirmation: input.reservationConfirmation,
    partySize: input.partySize,
    dietaryNotes: input.dietaryNotes,
    date,
  };
}

export function toSyncWish(input: LooseWishInput, date: string): SyncWish {
  return {
    id: input.id,
    title: input.title,
    description: input.description || "",
    tags: input.tags || [],
    priority: input.priority || DEFAULT_PRIORITY,
    completed: input.completed || false,
    completedAt: input.completedAt,
    url: input.url || "",
    notes: input.notes || "",
    date,
    parkDataId: input.parkDataId,
    park: input.park,
    land: input.land,
  };
}

export function toSyncPackingItem(
  input: LoosePackingInput,
  date: string
): SyncPackingItem {
  return {
    id: input.id,
    name: input.name,
    category: input.category || "Custom",
    priority: input.priority || DEFAULT_PRIORITY,
    completed: input.completed ?? input.packed ?? false,
    completedAt: input.completedAt,
    notes: input.notes || "",
    date,
  };
}

export function toSyncShoppingItem(
  input: LooseShoppingInput,
  date: string
): SyncShoppingItem {
  return {
    id: input.id,
    name: input.name,
    category: input.category || "Custom",
    priority: input.priority || DEFAULT_PRIORITY,
    completed: input.purchased ?? input.completed ?? input.packed ?? false,
    completedAt: input.completedAt,
    notes: input.notes || "",
    price: input.price != null ? String(input.price) : "",
    shops: input.shops || [],
    url: input.url || "",
    purchased: input.purchased ?? input.completed ?? input.packed ?? false,
    date,
  };
}
