"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import SidebarLayout from "@/components/SidebarLayout";
import TripSidebar from "@/components/TripSidebar";
import TemplatePickerModal from "@/components/TemplatePickerModal";
import type { NewTripActions } from "@/components/NewTripMenu";
import { quickTripName, nameFromTemplate } from "@/lib/new-trip";
import { localToday } from "@/lib/trip-selection";
import { showUndoToast } from "@/lib/undo-toast";
import WelcomeCard from "@/components/WelcomeCard";
import HomeBanner from "@/components/home/HomeBanner";
import { LazyIlloScene, type IlloArtLoader } from "@/components/home/illustrations/illo";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useTrips } from "@/hooks/use-trips";
import db from "@/lib/db";

// ==================== TYPES ====================

type Phase = "plan" | "prepare" | "preview" | "play" | "publish";

interface PortalConfig {
  phase: Phase;
  href: string;
  label: string;
  description: string;
  accent: string;
  /** Animated illustration, loaded on its own (the traced art is large). */
  art: IlloArtLoader;
}

const PORTALS: PortalConfig[] = [
  { phase: "plan", href: "/plan", label: "Plan", description: "Gather your wishes for your day", accent: "var(--color-accent-plan)", art: () => import("@/components/home/illustrations/generated/plan") },
  { phase: "preview", href: "/preview", label: "Preview", description: "Your day-of guide and itinerary", accent: "var(--color-accent-preview)", art: () => import("@/components/home/illustrations/generated/preview") },
  { phase: "prepare", href: "/prepare", label: "Prepare", description: "Pack your bags and get ready", accent: "var(--color-accent-prepare)", art: () => import("@/components/home/illustrations/generated/prepare") },
  { phase: "play", href: "/play", label: "Play", description: "Send your plan to your phone", accent: "var(--color-accent-play)", art: () => import("@/components/home/illustrations/generated/play") },
  { phase: "publish", href: "/publish", label: "Publish", description: "Relive the trip: photos, stats, trail", accent: "var(--color-accent-publish)", art: () => import("@/components/home/illustrations/generated/publish") },
];

// ==================== COMPONENT ====================

export default function Home() {
  const router = useRouter();
  const { currentTripId, setCurrentTripId, tripsRestoring } =
    useAppStore();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const {
    trips,
    templateTrips,
    futureTrips,
    recentTrips,
    archivedTrips,
    createTrip,
    createFromTemplate,
    setDefaultTemplate,
    deleteTrip,
    loading,
  } = useTrips();

  // ==================== BADGE COUNTS ====================
  // Only the current trip's counts are ever displayed (see badgeCounts below),
  // but these used to loop over every trip on every call — since Dexie's
  // liveQuery reactivity is table-level (not row-level), a write to any
  // trip's wishes/packing/dayItems re-ran all three queries regardless of
  // which trip was active, redoing that full per-trip scan every time. Scoping
  // each query to currentTripId doesn't stop the extra re-run (Dexie can't
  // know in advance a write is irrelevant), but cuts the work done on each
  // one from O(all trips) to O(1), which is most of what was visible as
  // homepage jank/flicker when editing something elsewhere in the app.

  const wishCounts = useLiveQuery(async () => {
    if (!currentTripId) return 0;
    // Only count selections where the underlying wish still exists — orphaned
    // selections can appear when a remote soft-delete removes the wish from
    // db.wishes before the selection cleanup fires.
    const selections = await db.tripWishSelections
      .where("tripId").equals(currentTripId).toArray();
    const wishIds = selections.map((s) => s.wishId);
    return wishIds.length > 0
      ? await db.wishes.where("id").anyOf(wishIds).count()
      : 0;
  }, [currentTripId]);

  const packingCounts = useLiveQuery(async () => {
    if (!currentTripId) return 0;
    return db.tripPackingSelections
      .where("tripId")
      .equals(currentTripId)
      .count();
  }, [currentTripId]);

  const itineraryCounts = useLiveQuery(async () => {
    if (!currentTripId) return 0;
    return db.dayItems
      .where("tripId")
      .equals(currentTripId)
      .count();
  }, [currentTripId]);

  const badgeCounts: Record<Phase, number> = {
    plan: wishCounts ?? 0,
    prepare: packingCounts ?? 0,
    preview: itineraryCounts ?? 0,
    play: 0,
    publish: 0,
  };

  // Editing a trip happens on the Edit Trip page (/trip). A trip just made
  // dated today (Quick Trip, From Template) opens there pointing at its dates.
  const openTripEditor = useCallback((tripId: string | null, highlightDates = false) => {
    if (!tripId) return;
    router.push(`/trip?id=${encodeURIComponent(tripId)}${highlightDates ? "&dates=1" : ""}`);
  }, [router]);

  // ==================== NEW TRIP MENU ====================

  const defaultTemplate = templateTrips.find((t) => t.isDefaultTemplate) ?? null;

  /**
   * Quick Trip: one click, from the starred default template or blank, dated
   * today. It becomes the selected trip and Home stays put (dates can be set
   * later from the ✏️); the toast's Undo deletes it and reselects the trip
   * that was selected before.
   */
  const handleQuickTrip = useCallback(async () => {
    const previousTripId = currentTripId;
    const today = localToday();
    const name = quickTripName(today);
    const id = defaultTemplate
      ? await createFromTemplate(defaultTemplate.id, name, today, today)
      : await createTrip({ name, startDate: today, endDate: today });
    if (!id) return;
    showUndoToast(`Created \u201C${name}\u201D`, async () => {
      await deleteTrip(id);
      setCurrentTripId(previousTripId);
    });
  }, [currentTripId, defaultTemplate, createFromTemplate, createTrip, deleteTrip, setCurrentTripId]);

  /** From Template: the picked template's content and name, dated today. */
  const handlePickTemplate = useCallback(async (templateId: string) => {
    const template = templateTrips.find((t) => t.id === templateId);
    if (!template) return;
    setShowTemplatePicker(false);
    const today = localToday();
    openTripEditor(await createFromTemplate(templateId, nameFromTemplate(template.name), today, today), true);
  }, [templateTrips, createFromTemplate, openTripEditor]);

  const newTrip: NewTripActions = {
    defaultTemplateName: defaultTemplate ? nameFromTemplate(defaultTemplate.name) : null,
    templateCount: templateTrips.length,
    onQuickTrip: handleQuickTrip,
    onFromTemplate: () => setShowTemplatePicker(true),
    onFullDetail: () => router.push("/trip?new=1"),
  };

  // ==================== PORTAL CLICK ====================

  const handlePortalClick = useCallback(
    (phase: Phase, href: string) => {
      if (!currentTripId) return;
      router.push(href);
    },
    [currentTripId, router]
  );

  // ==================== RENDER PORTAL CARD ====================

  const renderPortalCard = (config: PortalConfig) => {
    const { phase, href, label, description, accent, art } = config;
    const disabled = !currentTripId;
    const badge = badgeCounts[phase];

    return (
      <motion.div
        key={phase}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={disabled ? `${label} — select a trip first` : `${label}: ${description}`}
        aria-disabled={disabled}
        className="relative rounded-2xl overflow-hidden cursor-pointer flex flex-col"
        style={{
          backgroundColor: "var(--color-bg-card)",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "default" : "pointer",
          // Promote to its own compositing layer so the hover scale animates
          // a cached layer instead of re-rasterizing the clipped, rounded
          // artwork on every frame — without this, transform-animating a
          // parent with overflow:hidden + border-radius flickers in some
          // browsers during the hover transition.
          willChange: disabled ? undefined : "transform",
        }}
        onClick={() => !disabled && handlePortalClick(phase, href)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handlePortalClick(phase, href);
          }
        }}
        whileHover={disabled ? undefined : { scale: 1.03, y: -2 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Illustration */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <LazyIlloScene load={art} />
          {/* Badge */}
          {badge > 0 && !disabled && (
            <div
              className="absolute top-2 right-2 min-w-[20px] h-[20px] rounded-full
                         flex items-center justify-center px-1 text-[10px] font-bold z-10"
              style={{
                backgroundColor: accent,
                color: "var(--color-bg-deep)",
              }}
              aria-label={`${badge} item${badge !== 1 ? "s" : ""}`}
            >
              {badge}
            </div>
          )}
        </div>

        {/* Label + description below the illustration */}
        <div className="px-3 py-3 text-center">
          <div
            className="text-sm font-bold mb-0.5"
            style={{ color: accent }}
          >
            {label}
          </div>
          <div
            className="text-[11px] leading-snug"
            style={{ color: "var(--color-text-dim)" }}
          >
            {disabled ? "Select a trip first" : description}
          </div>
        </div>
      </motion.div>
    );
  };

  // ==================== SIDEBAR ====================

  const sidebar = (
    <TripSidebar
      currentTripId={currentTripId}
      futureTrips={futureTrips}
      recentTrips={recentTrips}
      archivedTrips={archivedTrips}
      templateTrips={templateTrips}
      onSelectTrip={(id) => setCurrentTripId(id)}
      onEditTrip={(id) => openTripEditor(id)}
      newTrip={newTrip}
      onNewTemplate={() => router.push("/trip?new=1&template=1")}
      onSetDefaultTemplate={setDefaultTemplate}
    />
  );

  // ==================== RENDER ====================

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading trips...</p>
      </div>
    );
  }

  // Just signed in on this device — trips are still downloading
  if (!loading && trips.length === 0 && tripsRestoring) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Restoring your trips from your other devices…</p>
      </div>
    );
  }

  // Welcome state — no trips yet (first-time visitor)
  if (!loading && trips.length === 0) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-12">
        <WelcomeCard newTrip={newTrip} />
      </main>
    );
  }

  return (
    <SidebarLayout sidebar={sidebar}>
      <div className="flex flex-col items-center px-4 py-6">
        <HomeBanner />

        {/* Portal cards — the five trip phases, in journey order */}
        <div className="w-full max-w-5xl mx-auto mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {PORTALS.map(renderPortalCard)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="/catalog"
            className="px-6 py-3 rounded-full border-2 font-semibold
                       transition-colors duration-200
                       hover:bg-[var(--color-accent-prepare)] hover:text-[var(--color-bg-deep)]"
            style={{
              borderColor: "var(--color-accent-prepare)",
              color: "var(--color-accent-prepare)",
            }}
          >
            Catalog
          </Link>
        </div>
      </div>

      <TemplatePickerModal
        visible={showTemplatePicker}
        templates={templateTrips}
        onPick={handlePickTemplate}
        onClose={() => setShowTemplatePicker(false)}
      />
    </SidebarLayout>
  );
}
