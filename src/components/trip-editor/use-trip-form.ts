"use client";

// ==================== TRIP FORM STATE ====================
// The Edit Trip page's form: a copy of the trip that the user edits and saves
// in one go. Background writes to the trip (Cloud Sync echoes, the members
// stamp a just-created trip gets when its upload finishes, a collaborator's
// edit) replace the trip object while the page is open; re-copying the whole
// trip on each of those would discard what the user is typing, so only
// fields the user hasn't touched take the fresh values. With no trip (a new,
// unsaved draft) the form starts blank.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Trip } from "@/lib/db";

export type TripArrayField = "flights" | "hotels" | "transports";

/**
 * Moving the trip's dates moves any hotel stay that was booked for exactly
 * the old start or end (a trip made from a template gets its hotel booked
 * for the trip's dates, first today, until the real dates are set).
 * Returns `prev.hotels` itself when nothing changes.
 */
function hotelsFollowingDates(prev: Partial<Trip>, next: Partial<Trip>): Trip["hotels"] {
  const moved = (from?: string, to?: string) => !!from && from !== to;
  if (!prev.hotels?.length || (!moved(prev.startDate, next.startDate) && !moved(prev.endDate, next.endDate))) return prev.hotels;
  return prev.hotels.map((h) => ({
    ...h,
    checkIn: h.checkIn && h.checkIn === prev.startDate ? next.startDate : h.checkIn,
    checkOut: h.checkOut && h.checkOut === prev.endDate ? next.endDate : h.checkOut,
  }));
}

const BLANK_DRAFT: Partial<Trip> = { name: "", startDate: "", endDate: "", isTemplate: false };

/** `draft` seeds a new, unsaved trip (e.g. `{ isTemplate: true }` for a new template). */
export function useTripForm(trip: Trip | null | undefined, draft?: Partial<Trip>) {
  const [form, setForm] = useState<Partial<Trip>>(trip ? { ...trip } : { ...BLANK_DRAFT, ...draft });
  const dirtyFields = useRef<Set<keyof Trip>>(new Set());
  const formTripId = useRef<string | null>(trip?.id ?? null);

  // Opening a different trip starts from a clean copy of it.
  useEffect(() => {
    if (!trip || formTripId.current === trip.id) return;
    dirtyFields.current.clear();
    formTripId.current = trip.id;
    setForm({ ...trip });
  }, [trip]);

  // Fresh data for the open trip fills every field the user hasn't changed.
  useEffect(() => {
    if (!trip || formTripId.current !== trip.id) return;
    setForm((prev) => {
      const next: Partial<Trip> = { ...trip };
      for (const field of dirtyFields.current) (next as Record<string, unknown>)[field] = prev[field];
      return next;
    });
  }, [trip]);

  const setField = useCallback((field: keyof Trip, value: string | boolean) => {
    dirtyFields.current.add(field);
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      const hotels = hotelsFollowingDates(prev, next);
      if (hotels === prev.hotels) return next;
      dirtyFields.current.add("hotels");
      return { ...next, hotels };
    });
  }, []);

  const updateItem = useCallback(<T,>(field: TripArrayField, index: number, key: keyof T, value: string) => {
    dirtyFields.current.add(field);
    setForm((prev) => {
      const arr = [...((prev[field] as T[]) || [])];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
  }, []);

  const addItem = useCallback(<T,>(field: TripArrayField, blank: T) => {
    dirtyFields.current.add(field);
    setForm((prev) => ({ ...prev, [field]: [...((prev[field] as T[]) || []), blank] }));
  }, []);

  const removeItem = useCallback((field: TripArrayField, index: number) => {
    dirtyFields.current.add(field);
    setForm((prev) => {
      const arr = [...((prev[field] as unknown[]) || [])];
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
  }, []);

  /** True once the user has changed anything since opening or saving. */
  const isDirty = useCallback(() => dirtyFields.current.size > 0, []);
  const markSaved = useCallback(() => dirtyFields.current.clear(), []);

  return { form, setField, updateItem, addItem, removeItem, isDirty, markSaved };
}

export type TripForm = ReturnType<typeof useTripForm>;
