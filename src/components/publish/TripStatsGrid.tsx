"use client";

import type { PublishData } from "@/hooks/use-publish-data";

const ACCENT = "var(--color-accent-publish)";

interface TripStatsGridProps {
  data: PublishData;
}

interface StatCardProps {
  label: string;
  completed: number;
  total: number;
  icon: string;
  showProgress?: boolean;
}

function StatCard({ label, completed, total, icon, showProgress = true }: StatCardProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      className="rounded-xl p-4 transition-all duration-200 hover:border-opacity-60"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: `1px solid ${ACCENT}22`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span
          className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: ACCENT }}>
        {completed}
        {showProgress && (
          <span
            className="text-sm font-normal"
            style={{ color: "var(--color-text-dim)" }}
          >
            {" "}/ {total}
          </span>
        )}
      </div>
      {showProgress && total > 0 && (
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--color-surface-raised)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              backgroundColor: percent === 100 ? "var(--color-success)" : ACCENT,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function TripStatsGrid({ data }: TripStatsGridProps) {
  return (
    <div className="w-full max-w-4xl mb-8">
      <h2
        className="text-xs font-bold mb-3 uppercase tracking-wider"
        style={{ color: ACCENT }}
      >
        Trip Overview
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Wishes"
          icon={"\u2B50"}
          completed={data.completedWishes}
          total={data.totalWishes}
        />
        <StatCard
          label="Itinerary"
          icon={"\uD83D\uDCC5"}
          completed={data.completedItineraryItems}
          total={data.totalItineraryItems}
        />
        <StatCard
          label="Packing"
          icon={"\uD83C\uDF92"}
          completed={data.completedPackingItems}
          total={data.totalPackingItems}
        />
        <StatCard
          label="Days"
          icon={"\u2600\uFE0F"}
          completed={data.days.length}
          total={data.days.length}
          showProgress={false}
        />
      </div>
    </div>
  );
}
