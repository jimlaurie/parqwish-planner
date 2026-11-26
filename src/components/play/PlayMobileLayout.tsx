"use client";

import type { DayItemRecord, User } from "@/lib/db";
import type { PoolItem } from "@/hooks/use-play-pool";
import type { TripMember } from "@shared/types/trip";
import MiniParkMap from "./MiniParkMap";
import MobileTabBar from "./MobileTabBar";
import ItemPool from "./ItemPool";
import Timeline from "./Timeline";
import TimelineTypeFilter from "./TimelineTypeFilter";
import { DEFAULT_RESORT_ID, getResort } from "@shared/constants/resorts";

const ACCENT = "var(--color-accent-preview)";

// ==================== COMPONENT ====================

type MobileTab = "pool" | "timeline";

interface PlayMobileLayoutProps {
  items: DayItemRecord[];
  poolItems: PoolItem[];
  poolLoading: boolean;
  selectedDate: string | null;
  userMap: Map<string, User>;
  members?: Record<string, TripMember>;
  myUid?: string;
  mobileTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onToggleCompleted: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onQuickAdd: (time: string) => void;
  onScheduleReservation: (item: PoolItem) => void;
  onQuickSchedule: (item: PoolItem) => void;
  /** The day's resort (Preview's resort chip); the map and the timeline's weather are Disneyland Resort's */
  dayResort?: string;
}

export default function PlayMobileLayout({
  items,
  poolItems,
  poolLoading,
  selectedDate,
  userMap,
  members,
  myUid,
  mobileTab,
  onTabChange,
  onToggleCompleted,
  onEdit,
  onRemove,
  onQuickAdd,
  onScheduleReservation,
  onQuickSchedule,
  dayResort,
}: PlayMobileLayoutProps) {
  const isDisneylandDay = !dayResort || dayResort === DEFAULT_RESORT_ID;
  return (
    <div className="w-full flex flex-col" style={{ height: "calc(100vh - 200px - var(--mobile-tabbar-h))" }}>
      {/* SVG Park Map — always visible */}
      <div className="flex-shrink-0 mb-3">
        {isDisneylandDay ? <MiniParkMap items={items} /> : <OtherResortMapNote resortId={dayResort!} compact />}
      </div>

      {/* Tab Bar */}
      <div className="flex-shrink-0 mb-3">
        <MobileTabBar activeTab={mobileTab} onTabChange={onTabChange} />
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {mobileTab === "pool" && (
          <div
            className="h-full rounded-xl p-3 overflow-y-auto"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <h2
              className="text-xs font-bold mb-3 uppercase tracking-wider"
              style={{ color: ACCENT }}
            >
              Available Items
            </h2>
            <ItemPool
              poolItems={poolItems}
              loading={poolLoading}
              onScheduleReservation={onScheduleReservation}
              onQuickSchedule={onQuickSchedule}
            />
          </div>
        )}

        {mobileTab === "timeline" && (
          <div className="h-full flex flex-col overflow-hidden">
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
        )}
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
