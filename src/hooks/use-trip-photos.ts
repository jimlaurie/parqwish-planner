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
  // Dedup: importing the same photo twice (e.g. re-running an import, or a
  // photo that's in both the Camera Roll and a PhotoPass download) should
  // not create a second row. Same exact-match approach already used for
  // photo dedup elsewhere in this codebase (sync-translate.ts's
  // existingPhotos.includes(dataUri)). Prefer matching on capturedAt when
  // it's available (from EXIF), but most PhotoPass downloads and plenty of
  // Camera Roll exports carry no EXIF at all — capturedAt is then undefined
  // for every import, which would silently defeat this check entirely.
  // Fall back to same trip day + identical thumbnail bytes in that case.
  {
    const existing = await db.tripPhotos.where("tripId").equals(params.tripId).toArray();
    const dupe = existing.find((p) =>
      params.capturedAt
        ? p.capturedAt === params.capturedAt && p.photoSets[0]?.thumbnail === params.photoSet.thumbnail
        : !p.capturedAt && p.date === params.date && p.photoSets[0]?.thumbnail === params.photoSet.thumbnail
    );
    if (dupe) return dupe.id;
  }

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

// Catalog Photo Gallery's multi-item linking — see linkedParkDataIds/
// linkedWishIds on TripPhoto (db.ts). Replaces the full set of links each
// call rather than appending, matching how the picker UI presents a
// checked/unchecked list of every candidate item.
export async function updateTripPhotoLinks(
  id: string,
  links: { parkDataIds: string[]; wishIds: string[] }
): Promise<void> {
  await db.tripPhotos.update(id, {
    linkedParkDataIds: links.parkDataIds,
    linkedWishIds: links.wishIds,
  });
}

export async function removeTripPhoto(id: string): Promise<void> {
  await db.tripPhotos.delete(id);
}
