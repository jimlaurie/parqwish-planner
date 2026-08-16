"use client";

// ==================== TRIP PHOTOS ====================
// CRUD + live query for standalone imported photos (see TripPhoto in db.ts).
// Local-only for now — like GPS trail point corrections, these don't push
// to Firestore; the mobile app has no matching concept to sync against.

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db, { type TripPhoto } from "@/lib/db";
import type { PhotoResolutions } from "@/lib/image-utils";

export interface AddTripPhotoParams {
  tripId: string;
  date: string;
  photoSet: PhotoResolutions;
  caption?: string;
  latitude?: number;
  longitude?: number;
  capturedAt?: string;
  linkedParkDataId?: string;
  linkedWishId?: string;
}

export function useTripPhotos(tripId: string | null) {
  const photos = useLiveQuery(
    () => (tripId ? db.tripPhotos.where("tripId").equals(tripId).toArray() : Promise.resolve<TripPhoto[]>([])),
    [tripId],
    [] as TripPhoto[],
  );

  const sorted = useMemo(
    () => [...photos].sort((a, b) => (a.capturedAt ?? "").localeCompare(b.capturedAt ?? "") || a.createdAt - b.createdAt),
    [photos]
  );

  return { photos: sorted, loading: photos === undefined };
}

export async function addTripPhoto(params: AddTripPhotoParams): Promise<string> {
  const id = `tphoto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: TripPhoto = {
    id,
    tripId: params.tripId,
    date: params.date,
    photoSets: [params.photoSet],
    caption: params.caption,
    latitude: params.latitude,
    longitude: params.longitude,
    capturedAt: params.capturedAt,
    linkedParkDataId: params.linkedParkDataId,
    linkedWishId: params.linkedWishId,
    createdAt: Date.now(),
  };
  await db.tripPhotos.add(record);
  return id;
}

export async function updateTripPhotoLocation(
  id: string,
  location: { latitude?: number; longitude?: number; linkedParkDataId?: string; linkedWishId?: string }
): Promise<void> {
  await db.tripPhotos.update(id, location);
}

export async function removeTripPhoto(id: string): Promise<void> {
  await db.tripPhotos.delete(id);
}
