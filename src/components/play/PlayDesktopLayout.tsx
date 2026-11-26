"use client";

import type { DayItemRecord, User } from "@/lib/db";
import type { PoolItem } from "@/hooks/use-play-pool";
import type { TripMember } from "@shared/types/trip";
import ItemPool from "./ItemPool";
import Timeline from "./Timeline";
import TimelineTypeFilter from "./TimelineTypeFilter";
import ParkMapWrapper from "./ParkMapWrapper";
import UserPanel from "@/components/UserPanel";
import { DEFAULT_RESORT_ID, getResort } from "@shared/constants/resorts";

const ACCENT = "var(--color-accent-preview)";

// ==================== COMPONENT ====================

interface PlayDesktopLayoutProps {
  items: DayItemRecord[];
  poolItems: PoolItem[];
  poolLoading: boolean;
  selectedDate: string | null;
  userMap: Map<string, User>;
  members?: Record<string, TripMember>;
  myUid?: string;
  onToggleCompleted: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onQuickAdd: (time: string) => void;
  onScheduleReservation: (item: PoolItem) => void;
  onQuickSchedule: (item: PoolItem) => void;
  /** The day's resort (Preview's resort chip); the map and the timeline's weather are Disneyland Resort's */
  dayResort?: string;
}

export default function PlayDesktopLayout({
  items,
  poolItems,
  poolLoading,
  selectedDate,
  userMap,
  members,
  myUid,
  onToggleCompleted,
  onEdit,
  onRemove,
  onQuickAdd,
  onScheduleReservation,
  onQuickSchedule,
  dayResort,
}: PlayDesktopLayoutProps) {
  const isDisneylandDay = !dayResort || dayResort === DEFAULT_RESORT_ID;
  return (
    <div className="w-full max-w-7xl flex-1">
      <div className="grid grid-cols-[280px_320px_1fr] gap-4 h-full">
        {/* Left: Item Pool */}
        <div
          className="rounded-xl p-3 flex flex-col"
          style={{
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border-subtle)",
            height: "calc(100vh - 220px)",
            overflow: "hidden",
          }}
        >
          {/* Available Items — capped to half the panel height, scrolls internally */}
          <div className="flex flex-col shrink-0 overflow-hidden" style={{ maxHeight: "50%" }}>
            <h2
              className="text-xs font-bold mb-3 uppercase tracking-wider shrink-0"
              style={{ color: ACCENT }}
            >
              Available Items
            </h2>
            <div className="overflow-y-auto" style={{ minHeight: 0 }}>
              <ItemPool
                poolItems={poolItems}
                loading={poolLoading}
                onScheduleReservation={onScheduleReservation}
                onQuickSchedule={onQuickSchedule}
              />
            </div>
          </div>

          {/* Group/Family filter — remaining space, always visible without page scroll */}
          <div
            className="mt-2 border-t border-white/5 pt-1 flex-1 overflow-y-auto"
            style={{ minHeight: 0 }}
          >
            <UserPanel />
          </div>
        </div>

        {/* Middle: Timeline */}
        <div className="flex flex-col" style={{ maxHeight: "calc(100vh - 220px)", overflow: "hidden" }}>
          <TimelineTypeFilter />
          <Timeline
            items={items}
            onToggleCompleted={onToggleCompleted}
            onEdit={onEdit}
            onRemove={onRemove}
            onQuickAdd={onQuickAdd}
            userMap={userMap}
            members={members}
            myUid={myUid}
            selectedDate={selectedDate}
            dayResort={dayResort}
          />
        </div>

        {/* Right: GPS Map */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: "1px solid var(--color-border-subtle)",
            minHeight: "400px",
            height: "calc(100vh - 280px)",
            maxHeight: "calc(100vh - 220px)",
          }}
        >
          {isDisneylandDay ? <ParkMapWrapper items={items} /> : <OtherResortMapNote resortId={dayResort!} />}
        </div>
      </div>
    </div>
  );
}

/** In place of Disneyland's map on another resort's day. */
function OtherResortMapNote({ resortId, compact }: { resortId: string; compact?: boolean }) {
  return (
    <div className={`h-full flex items-center justify-center text-center px-6 ${compact ? "py-4 rounded-xl" : ""}`}
         style={{ backgroundColor: "var(--color-bg-card)", color: "var(--color-text-muted)", ...(compact ? { border: "1px solid var(--color-border-subtle)" } : {}) }}>
      <p className="text-xs max-w-xs">
        {"\u{1F5FA}\uFE0F"} The map shows Disneyland Resort. A map of {getResort(resortId)?.name ?? "this resort"} comes in a later version.
      </p>
    </div>
  );
}
