"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useTrips } from "@/hooks/use-trips";
import { usePublishData } from "@/hooks/use-publish-data";
import PublishHeader from "@/components/publish/PublishHeader";
import UserFilterBar from "@/components/UserFilterBar";
import TripStatsGrid from "@/components/publish/TripStatsGrid";
import DayBreakdown from "@/components/publish/DayBreakdown";
import ParkAnalytics from "@/components/publish/ParkAnalytics";
import PhotoGallery from "@/components/publish/PhotoGallery";
import TrailGallery, { type TrailTimeRanges } from "@/components/publish/TrailGallery";

const ACCENT = "var(--color-accent-publish)";

export default function PublishPage() {
  const router = useRouter();
  const { _hasHydrated, currentTripId, excludedPhotoIds, togglePhotoExclusion } = useAppStore();
  const { currentTrip } = useTrips();
  const { data, loading } = usePublishData();
  const [generating, setGenerating] = useState(false);
  const trailTimeRangesRef = useRef<TrailTimeRanges>({});
  const handleTimeRangesChange = useCallback((r: TrailTimeRanges) => {
    trailTimeRangesRef.current = r;
  }, []);

  // Build excluded set for the current trip
  const excludedSet = useMemo<Set<string>>(
    () => new Set(currentTripId ? (excludedPhotoIds[currentTripId] ?? []) : []),
    [excludedPhotoIds, currentTripId]
  );

  // Redirect to home if no trip — delayed to avoid racing IndexedDB
  useEffect(() => {
    if (!_hasHydrated || currentTripId) return;
    const timer = setTimeout(() => {
      if (!useAppStore.getState().currentTripId) {
        router.push("/");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [_hasHydrated, currentTripId, router]);

  const handleGeneratePDF = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      const { generateTripPDF } = await import("@/lib/pdf-generator");
      // Only pass photos not excluded by the user
      const pdfData = {
        ...data,
        allPhotos: data.allPhotos.filter((p) => !excludedSet.has(p.id)),
      };
      await generateTripPDF(pdfData, trailTimeRangesRef.current);
    } catch (err) {
      console.error("[Publish] PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  if (!currentTripId || !currentTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading trip...</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading trip data...</p>
      </div>
    );
  }

  const hasItinerary = data.totalItineraryItems > 0;
  const hasAnyData =
    data.totalWishes > 0 || data.totalPackingItems > 0 || hasItinerary;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-6">
      <PublishHeader data={data} />
      <UserFilterBar />

      {!hasAnyData ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <span className="text-5xl mb-4">{"\uD83C\uDFA2"}</span>
          <h2
            className="text-lg font-bold mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Nothing to recap yet
          </h2>
          <p
            className="text-sm text-center max-w-sm mb-6"
            style={{ color: "var(--color-text-dim)" }}
          >
            Start planning your trip in the Plan, Prepare, and Play phases to
            see your recap here.
          </p>
        </div>
      ) : (
        <>
          <TripStatsGrid data={data} />

          {hasItinerary && <DayBreakdown data={data} />}

          {(Object.keys(data.parkBreakdown).length > 0 ||
            Object.keys(data.landBreakdown).length > 0) && (
            <ParkAnalytics
              parkBreakdown={data.parkBreakdown}
              landBreakdown={data.landBreakdown}
            />
          )}

          <TrailGallery onTimeRangesChange={handleTimeRangesChange} />

          <PhotoGallery
            photos={data.allPhotos}
            excludedIds={excludedSet}
            onToggleExclusion={(id) => currentTripId && togglePhotoExclusion(currentTripId, id)}
          />

          {/* Generate PDF button */}
          <div className="w-full max-w-4xl mb-12 flex justify-center">
            <button
              onClick={handleGeneratePDF}
              disabled={generating}
              className="px-6 py-3 rounded-full font-semibold text-sm
                         transition-all duration-200 cursor-pointer
                         hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: ACCENT,
                color: "var(--color-bg-deep)",
              }}
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">{"\u23F3"}</span>
                  Generating PDF...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>{"\uD83D\uDCC4"}</span>
                  Generate PDF Recap
                </span>
              )}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
