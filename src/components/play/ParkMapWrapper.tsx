"use client";

import dynamic from "next/dynamic";
import type { DayItemRecord } from "@/lib/db";

// Leaflet must be loaded client-side only (no SSR)
const ParkMap = dynamic(() => import("./ParkMap"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center rounded-xl"
      style={{ backgroundColor: "var(--color-bg-card)", minHeight: "300px" }}
    >
      <div className="text-center">
        <span className="text-2xl block mb-2 animate-pulse">{"🗺️"}</span>
        <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>Loading map...</p>
      </div>
    </div>
  ),
});

interface ParkMapWrapperProps {
  items: DayItemRecord[];
}

export default function ParkMapWrapper({ items }: ParkMapWrapperProps) {
  return <ParkMap items={items} />;
}
