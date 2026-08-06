"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import Image from "next/image";
import SidebarLayout from "@/components/SidebarLayout";
import TripSidebar from "@/components/TripSidebar";
import CreateTripModal from "@/components/CreateTripModal";
import EditTripModal from "@/components/EditTripModal";
import WelcomeCard from "@/components/WelcomeCard";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useTrips } from "@/hooks/use-trips";
import db from "@/lib/db";

// ==================== TYPES ====================

type Phase = "plan" | "prepare" | "preview" | "play";

interface PortalConfig {
  phase: Phase;
  href: string;
  label: string;
  description: string;
  accent: string;
  image: string;
}

const PORTALS: PortalConfig[] = [
  { phase: "plan", href: "/plan", label: "Plan", description: "Gather your wishes for your day", accent: "var(--color-accent-plan)", image: "/images/publish-portal.jpg" },
  { phase: "preview", href: "/preview", label: "Preview", description: "Your day-of guide and itinerary", accent: "var(--color-accent-preview)", image: "/images/play-portal.jpg" },
  { phase: "prepare", href: "/prepare", label: "Prepare", description: "Pack your bags and get ready", accent: "var(--color-accent-prepare)", image: "/images/prepare-portal.jpg" },
  { phase: "play", href: "/play", label: "Play", description: "Transfer data between devices", accent: "var(--color-accent-play)", image: "/images/plan-portal.jpg" },
];

// ==================== COMPONENT ====================

export default function Home() {
  const router = useRouter();
  const { currentTripId, setCurrentTripId, showTripModal, setShowTripModal } =
    useAppStore();
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const {
    trips,
    templateTrips,
    futureTrips,
    recentTrips,
    archivedTrips,
    currentTrip,
    createTrip,
    updateTrip,
    createFromTemplate,
    saveAsTemplate,
    clearTrip,
    deleteTrip,
    archiveTrip,
    unarchiveTrip,
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
  };

  const editingTrip = editingTripId
    ? trips.find((t) => t.id === editingTripId) ?? null
    : null;

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
    const { phase, href, label, description, accent, image } = config;
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
          // Image content on every frame — without this, transform-animating
          // a parent with overflow:hidden + border-radius over a next/image
          // fill child flickers in some browsers during the hover transition.
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
        {/* Portal image */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={image}
            alt={label}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {/* Gradient overlay for text readability */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, transparent 50%, color-mix(in srgb, ${accent} 19%, transparent) 100%)`,
            }}
          />
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

        {/* Label + description below image */}
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
      currentTrip={currentTrip}
      futureTrips={futureTrips}
      recentTrips={recentTrips}
      archivedTrips={archivedTrips}
      templateTrips={templateTrips}
      onSelectTrip={(id) => setCurrentTripId(id)}
      onEditTrip={(id) => setEditingTripId(id)}
      onNewTrip={() => setShowTripModal(true)}
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

  // Welcome state — no trips yet (first-time visitor)
  if (!loading && trips.length === 0) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-12">
        <WelcomeCard onCreateTrip={() => setShowTripModal(true)} />
        <CreateTripModal
          visible={showTripModal}
          onClose={() => setShowTripModal(false)}
          onCreateTrip={async (data) => { await createTrip(data); }}
          onCreateFromTemplate={createFromTemplate}
          templates={templateTrips}
        />
      </main>
    );
  }

  return (
    <SidebarLayout sidebar={sidebar}>
      <div className="flex flex-col items-center px-4 py-6">
        {/* Title Banner */}
        <div
          className="relative w-full max-w-4xl rounded-2xl overflow-hidden mb-8"
          // Same clipped-rounded-image repaint issue as the portal cards
          // (see willChange below) -- promote to its own layer so nearby
          // animations (e.g. the Edit Trip modal's full-screen backdrop
          // fade) don't force this to repaint every frame.
          style={{ minHeight: 160, willChange: "transform" }}
        >
          {/* Background image */}
          <Image
            src="/images/title-background.jpg"
            alt="Disneyland entrance"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
          {/* Dark overlay for text readability — fixed at 55% so text is always legible */}
          <div className="absolute inset-0 bg-black/55" />
          {/* Logo + subtitle */}
          <div className="relative z-10 flex flex-col items-center justify-center py-8 px-4">
            <Image
              src="/images/parqwish-logo.png"
              alt="ParQwish"
              width={400}
              height={100}
              className="h-16 md:h-20 w-auto mb-2"
              style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.7))" }}
              priority
            />
            <p
              className="text-sm md:text-lg text-center tracking-widest uppercase font-semibold"
              style={{
                color: "#FFD700",
                textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.7)",
              }}
            >
              Planner
            </p>
            <p
              className="text-xs md:text-sm text-center mt-1"
              style={{
                color: "rgba(255,255,255,0.95)",
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              }}
            >
              Your Disneyland Resort Companion
            </p>
          </div>
        </div>

        {/* Portal cards — 4 in a row */}
        <div className="w-full max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <Link
            href="/publish"
            className="px-6 py-3 rounded-full border-2 font-semibold
                       transition-colors duration-200
                       hover:bg-[var(--color-accent-publish)] hover:text-[var(--color-bg-deep)]"
            style={{
              borderColor: "var(--color-accent-publish)",
              color: "var(--color-accent-publish)",
            }}
          >
            Publish
          </Link>
        </div>
      </div>

      {/* Create Trip Modal */}
      <CreateTripModal
        visible={showTripModal}
        onClose={() => setShowTripModal(false)}
        onCreateTrip={async (data) => { await createTrip(data); }}
        onCreateFromTemplate={createFromTemplate}
        templates={templateTrips}
      />

      {/* Edit Trip Modal */}
      <EditTripModal
        visible={!!editingTripId}
        trip={editingTrip}
        onClose={() => setEditingTripId(null)}
        onSave={updateTrip}
        onSaveAsTemplate={saveAsTemplate}
        onClear={clearTrip}
        onDelete={deleteTrip}
        onArchive={archiveTrip}
        onUnarchive={unarchiveTrip}
      />

    </SidebarLayout>
  );
}
