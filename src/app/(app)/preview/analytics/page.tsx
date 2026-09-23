"use client";

// ==================== ANALYTICS GALLERY ====================
// Entry point for the resort-wide, trip-agnostic historical analytics built
// on the BigQuery wait-time pipeline (see /preview/heat-map and
// /preview/reliability). This page itself holds no data — just a small
// card grid linking to each analytic, so new ones can join without
// crowding PlayHeader's own "📊 Analytics" pill with more direct links.

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const ACCENT = "var(--color-accent-preview)";

interface AnalyticsCard {
  href: string;
  icon: string;
  label: string;
  description: string;
}

const CARDS: AnalyticsCard[] = [
  {
    href: "/preview/heat-map",
    icon: "🌡️",
    label: "Wait Time Heat Map",
    description: "Every ride, color-coded by typical wait — pick a day and hour.",
  },
  {
    href: "/preview/reliability",
    icon: "⚠️",
    label: "Ride Reliability",
    description: "Odds of a breakdown, average downtime, and the wait-time impact when a ride goes down.",
  },
];

export default function AnalyticsGalleryPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <button type="button" onClick={() => router.push("/preview")}
            className="text-sm px-2 py-1 rounded cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}>
            ← Preview
          </button>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📊</span>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-heading)" }}>
            Analytics
          </h1>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-dim)" }}>
          Historical, resort-wide data from the last 90 days — useful for deciding when to go and what to expect, not a live forecast for your specific trip dates.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map((card) => (
            <motion.div
              key={card.href}
              onClick={() => router.push(card.href)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.99 }}
              className="rounded-2xl p-5 cursor-pointer flex flex-col gap-2"
              style={{
                backgroundColor: "var(--color-bg-card)",
                border: `1px solid color-mix(in srgb, ${ACCENT} 25%, transparent)`,
              }}
            >
              <span className="text-3xl">{card.icon}</span>
              <span className="text-base font-bold" style={{ color: ACCENT }}>
                {card.label}
              </span>
              <span className="text-xs leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
                {card.description}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
