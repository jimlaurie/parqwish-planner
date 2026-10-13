"use client";

// ==================== EDIT TRIP PAGE ====================
// One page for a trip's details, replacing the old six-tab Edit Trip modal:
//   /trip?id=<tripId>          edit a trip or template
//   /trip?id=<tripId>&dates=1  ...just made dated today (Quick Trip, From
//                              Template): point at the dates
//   /trip?new=1                a new, unsaved trip (New Trip › Full Detail),
//                              created and synced only on Save
//   /trip?new=1&template=1     a new, unsaved template (sidebar › + New Template)
// A query string rather than /trip/<id>, since the planner is a static export.
// Every way of editing a trip leads here: the ✏️ beside a trip and the New
// Trip menu.

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Trip } from "@/lib/db";
import { useTrips } from "@/hooks/use-trips";
import TripEditor from "@/components/trip-editor/TripEditor";

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4 text-center">
      <p className="text-base font-semibold" style={{ color: "var(--color-heading)" }}>This trip isn&rsquo;t on this device</p>
      <p className="text-sm max-w-sm" style={{ color: "var(--color-text-muted)" }}>
        It may have been deleted, or it hasn&rsquo;t synced here yet.
      </p>
      <button type="button" onClick={onHome} className="text-sm font-semibold px-4 py-2 rounded-full cursor-pointer"
              style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>
        Back to Home
      </button>
    </div>
  );
}

/** Drops flight, hotel, and transport entries that were added but never filled in. */
function filledIn<T extends object>(items: T[] | undefined): T[] | undefined {
  return items?.filter((item) => Object.values(item).some((v) => typeof v === "string" && v.trim() !== ""));
}

/** The fields the page saves; collaboration and archiving act on their own. */
function editableFields(form: Partial<Trip>): Partial<Trip> {
  const { name, startDate, endDate, isTemplate, flights, hotels, transports, notes } = form;
  return {
    name: name?.trim(), startDate, endDate, isTemplate, notes,
    flights: filledIn(flights), hotels: filledIn(hotels), transports: filledIn(transports),
  };
}

function TripPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tripId = params.get("id");
  const highlightDates = params.get("dates") === "1";
  const newTemplate = !tripId && params.get("template") === "1";
  const t = useTrips();
  const trip = tripId ? t.trips.find((x) => x.id === tripId) ?? null : null;
  const goHome = useCallback(() => router.push("/"), [router]);

  if (tripId && t.loading) return <Spinner />;
  if (tripId && !trip) return <NotFound onHome={goHome} />;

  const save = async (form: Partial<Trip>) => {
    const fields = editableFields(form);
    if (trip) {
      await t.updateTrip(trip.id, fields);
    } else {
      await t.createTrip({
        name: fields.name ?? "",
        startDate: fields.startDate ?? "",
        endDate: fields.endDate ?? "",
        isTemplate: fields.isTemplate,
        details: { flights: fields.flights, hotels: fields.hotels, transports: fields.transports, notes: fields.notes },
      });
    }
    goHome();
  };

  return (
    <TripEditor
      key={trip?.id ?? (newTemplate ? "new-template" : "new")}
      trip={trip}
      highlightDates={highlightDates}
      newTemplate={newTemplate}
      onSave={save}
      onClose={goHome}
      onSaveAsTemplate={trip ? async () => { await t.saveAsTemplate(trip.id, `${trip.name} (Template)`); } : undefined}
      onToggleArchive={trip ? async () => {
        if (trip.isArchived) { await t.unarchiveTrip(trip.id); return; }
        await t.archiveTrip(trip.id);
        goHome();
      } : undefined}
      onClear={trip ? async () => { await t.clearTrip(trip.id); goHome(); } : undefined}
      onDelete={trip ? async () => { await t.deleteTrip(trip.id); goHome(); } : undefined}
    />
  );
}

export default function TripPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <TripPageInner />
    </Suspense>
  );
}
