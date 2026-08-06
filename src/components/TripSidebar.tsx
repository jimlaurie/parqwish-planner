"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StarCompass from "@/components/portals/StarCompass";
import UserPanel from "@/components/UserPanel";
import type { Trip } from "@/lib/db";

// ==================== TYPES ====================

interface TripSidebarProps {
  currentTripId: string | null;
  currentTrip: Trip | undefined;
  futureTrips: Trip[];
  recentTrips: Trip[];
  archivedTrips: Trip[];
  templateTrips: Trip[];
  onSelectTrip: (id: string) => void;
  onEditTrip: (id: string) => void;
  onNewTrip: () => void;
}

interface TripSectionProps {
  title: string;
  trips: Trip[];
  currentTripId: string | null;
  onSelectTrip: (id: string) => void;
  onEditTrip: (id: string) => void;
  defaultOpen?: boolean;
  /** If set, only this many trips show by default with a "Show more" toggle for the rest. */
  previewCount?: number;
}

// ==================== HELPERS ====================

function formatDateRange(start?: string, end?: string): string {
  if (!start || !end) return "";
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (s.getMonth() === e.getMonth()) {
    return `${months[s.getMonth()]} ${s.getDate()}\u2013${e.getDate()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} \u2013 ${months[e.getMonth()]} ${e.getDate()}`;
}

// ==================== TRIP SECTION ====================

function TripSection({ title, trips, currentTripId, onSelectTrip, onEditTrip, defaultOpen = true, previewCount }: TripSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  if (trips.length === 0) return null;

  const isPreviewing = previewCount !== undefined && trips.length > previewCount && !showAll;
  const visibleTrips = isPreviewing ? trips.slice(0, previewCount) : trips;
  const hiddenCount = trips.length - visibleTrips.length;

  return (
    <div className="mb-2">
      <button
        className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors"
        style={{ color: "var(--color-text-dim)" }}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`${title} section`}
      >
        <span>{title}</span>
        <span className="text-[10px]" aria-hidden="true">{isOpen ? "\u25B2" : "\u25BC"}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {visibleTrips.map((trip) => {
              const isActive = trip.id === currentTripId;
              return (
                <div
                  key={trip.id}
                  className="group flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors duration-150"
                  style={{
                    backgroundColor: isActive ? "color-mix(in srgb, var(--color-gold) 10%, transparent)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--color-gold)" : "3px solid transparent",
                  }}
                  onClick={() => onSelectTrip(trip.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: isActive ? "var(--color-gold)" : "var(--color-text-primary)" }}
                    >
                      {trip.name}
                    </div>
                    {trip.startDate && (
                      <div
                        className="text-[10px] truncate"
                        style={{ color: "var(--color-text-dim)" }}
                      >
                        {formatDateRange(trip.startDate, trip.endDate)}
                      </div>
                    )}
                    {trip.archiveFileName && (
                      <div
                        className="text-[10px] truncate italic"
                        style={{ color: "var(--color-text-dim)" }}
                      >
                        {trip.archiveFileName}
                      </div>
                    )}
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 cursor-pointer"
                    style={{ color: "var(--color-text-dim)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTrip(trip.id);
                    }}
                    aria-label={`Edit ${trip.name}`}
                  >
                    {"\u270F\uFE0F"}
                  </button>
                </div>
              );
            })}
            {previewCount !== undefined && trips.length > previewCount && (
              <button
                className="w-full px-4 py-1.5 text-[10px] text-left cursor-pointer hover:bg-white/5 transition-colors"
                style={{ color: "var(--color-gold)" }}
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Show less" : `Show ${hiddenCount} more`}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== COMPONENT ====================

export default function TripSidebar({
  currentTripId,
  currentTrip,
  futureTrips,
  recentTrips,
  archivedTrips,
  templateTrips,
  onSelectTrip,
  onEditTrip,
  onNewTrip,
}: TripSidebarProps) {
  return (
    <div className="flex flex-col h-full py-4">
      {/* Compass Star */}
      <div
        className="mx-auto mb-4 rounded-xl overflow-hidden cursor-pointer"
        style={{ backgroundColor: "var(--color-bg-deep)", maxWidth: 120 }}
        onClick={() => {
          if (currentTripId) onEditTrip(currentTripId);
        }}
      >
        <StarCompass tripName={currentTrip?.name ?? null} />
      </div>

      {/* Trip sections */}
      <div className="flex-1 overflow-y-auto">
        <TripSection
          title="Future Trips"
          trips={futureTrips}
          currentTripId={currentTripId}
          onSelectTrip={onSelectTrip}
          onEditTrip={onEditTrip}
        />
        <TripSection
          title="Recent Trips"
          trips={recentTrips}
          currentTripId={currentTripId}
          onSelectTrip={onSelectTrip}
          onEditTrip={onEditTrip}
          previewCount={2}
        />
        <TripSection
          title="Archived Trips"
          trips={archivedTrips}
          currentTripId={currentTripId}
          onSelectTrip={onSelectTrip}
          onEditTrip={onEditTrip}
          defaultOpen={false}
        />
        <TripSection
          title="Templates"
          trips={templateTrips}
          currentTripId={currentTripId}
          onSelectTrip={onSelectTrip}
          onEditTrip={onEditTrip}
          defaultOpen={false}
        />
      </div>

      {/* Family members */}
      <UserPanel />

      {/* New Trip button */}
      <div className="px-4 pt-4">
        <button
          onClick={onNewTrip}
          className="w-full px-4 py-2.5 rounded-lg border-2 text-sm font-semibold
                     transition-colors duration-200 cursor-pointer
                     hover:bg-[var(--color-gold)] hover:text-[var(--color-bg-deep)]"
          style={{
            borderColor: "var(--color-gold)",
            color: "var(--color-gold)",
          }}
        >
          + New Trip
        </button>
      </div>
    </div>
  );
}
