"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";

interface TripItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isTemplate?: boolean;
  wishCount: number;
}

interface TripSelectorProps {
  trips: TripItem[];
  onDeleteTrip: (id: string) => void;
  onNewTrip: () => void;
  onEditTrip?: (id: string) => void;
}

function formatDateRange(start: string, end: string): string {
  if (!start || !end) return "No dates";
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}`;
}

export default function TripSelector({
  trips,
  onDeleteTrip,
  onNewTrip,
  onEditTrip,
}: TripSelectorProps) {
  const { currentTripId, setCurrentTripId } = useAppStore();

  if (trips.length === 0) return null;

  const regularTrips = trips.filter((t) => !t.isTemplate);
  const templateTrips = trips.filter((t) => t.isTemplate);

  const renderTrip = (trip: TripItem) => {
    const isActive = trip.id === currentTripId;
    const isTemplate = trip.isTemplate;

    return (
      <motion.button
        key={trip.id}
        onClick={() => setCurrentTripId(isActive ? null : trip.id)}
        aria-label={`${isActive ? "Deselect" : "Select"} trip: ${trip.name}`}
        aria-pressed={isActive}
        className={`relative flex-shrink-0 rounded-lg px-3 py-1.5 border text-left
                   cursor-pointer transition-colors duration-200 group
                   ${isTemplate ? "border-dashed" : ""}`}
        style={{
          backgroundColor: isActive
            ? "color-mix(in srgb, var(--color-gold) 8%, transparent)"
            : "var(--color-bg-card)",
          borderColor: isActive
            ? "var(--color-gold)"
            : isTemplate
              ? "color-mix(in srgb, var(--color-gold) 25%, transparent)"
              : "var(--color-border-subtle)",
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Action buttons */}
        <div className="absolute top-0.5 right-1.5 flex items-center gap-1">
          {onEditTrip && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onEditTrip(trip.id);
              }}
              role="button"
              tabIndex={0}
              aria-label={`Edit ${trip.name}`}
              className="text-[10px] opacity-0 group-hover:opacity-60
                         hover:!opacity-100 transition-opacity cursor-pointer"
              style={{ color: "var(--color-text-muted)" }}
            >
              {"\u270F\uFE0F"}
            </span>
          )}
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${trip.name}" and all its data?`)) {
                onDeleteTrip(trip.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Delete ${trip.name}`}
            className="text-[10px] opacity-0 group-hover:opacity-60
                       hover:!opacity-100 transition-opacity cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
          >
            {"\u2715"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Template indicator */}
          {isTemplate && (
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
              style={{
                color: "var(--color-gold)",
                backgroundColor: "color-mix(in srgb, var(--color-gold) 10%, transparent)",
              }}
            >
              T
            </span>
          )}
          <span
            className="text-xs font-semibold truncate max-w-[120px]"
            style={{
              color: isActive
                ? "var(--color-gold)"
                : "var(--color-text-primary)",
            }}
          >
            {trip.name}
          </span>
          {!isTemplate && (
            <span
              className="text-[10px] whitespace-nowrap"
              style={{ color: "var(--color-text-dim)" }}
            >
              {formatDateRange(trip.startDate, trip.endDate)}
            </span>
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <div className="w-full max-w-xl mb-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
        {regularTrips.map(renderTrip)}

        {templateTrips.length > 0 && regularTrips.length > 0 && (
          <div
            className="flex-shrink-0 w-px h-6 mx-0.5"
            style={{ backgroundColor: "var(--color-border-default)" }}
          />
        )}
        {templateTrips.map(renderTrip)}

        {/* Add trip button */}
        <motion.button
          onClick={onNewTrip}
          className="flex-shrink-0 rounded-lg px-2.5 py-1.5 border border-dashed
                     cursor-pointer transition-colors duration-200
                     flex items-center justify-center"
          style={{
            borderColor: "var(--color-border-input)",
            color: "var(--color-text-muted)",
          }}
          whileHover={{ scale: 1.05, borderColor: "var(--color-gold)" }}
          whileTap={{ scale: 0.95 }}
          aria-label="Create new trip"
        >
          <span className="text-sm">+</span>
        </motion.button>
      </div>
    </div>
  );
}
