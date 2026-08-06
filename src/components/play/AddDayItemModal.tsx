"use client";

import { useState, useEffect, useCallback } from "react";
import type { PoolItem } from "@/hooks/use-play-pool";
import type { AddDayItemParams } from "@/hooks/use-day-items";
import type { DayItemType } from "@shared/types/day-item";

const ACCENT = "var(--color-accent-preview)";

// ==================== TYPES ====================

interface AddDayItemModalProps {
  visible: boolean;
  initialTime?: string;       // pre-fill time; undefined = open as Anytime
  poolItems: PoolItem[];
  onAdd: (params: AddDayItemParams) => Promise<void>;
  onClose: () => void;
}

type TabId = "wish" | "ride" | "dining" | "shopping" | "custom";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "wish",     label: "Wish",     icon: "⭐"  },
  { id: "ride",     label: "Ride",     icon: "🎢" },
  { id: "dining",   label: "Dining",   icon: "🍽️" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "custom",   label: "Custom",   icon: "🗓️" },
];

// Map pool sourceType → DayItemType
const SOURCE_TYPE_MAP: Record<string, DayItemType> = {
  wish:     "wish",
  ride:     "ride",
  dining:   "dining",
  shopping: "shopping",
};

// ==================== TIME HELPERS ====================

function parseHHMM(time: string): { h: number; m: number } {
  const [hStr, mStr] = time.split(":");
  return { h: parseInt(hStr || "9", 10), m: parseInt(mStr || "0", 10) };
}

function formatHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDisplayTime(h: number, m: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function adjustTime(h: number, m: number, deltaMin: number): { h: number; m: number } {
  let total = h * 60 + m + deltaMin;
  if (total < 0) total += 24 * 60;
  if (total >= 24 * 60) total -= 24 * 60;
  return { h: Math.floor(total / 60), m: total % 60 };
}

// ==================== COMPONENT ====================

export default function AddDayItemModal({
  visible,
  initialTime,
  poolItems,
  onAdd,
  onClose,
}: AddDayItemModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("wish");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [isAnytime, setIsAnytime] = useState(false);
  const [timeH, setTimeH] = useState(9);
  const [timeM, setTimeM] = useState(0);
  const [timeInput, setTimeInput] = useState("09:00");

  // Reset on open
  useEffect(() => {
    if (!visible) return;
    setActiveTab("wish");
    setSelectedId(null);
    setCustomName("");
    if (initialTime) {
      const { h, m } = parseHHMM(initialTime);
      setTimeH(h); setTimeM(m);
      setTimeInput(formatHHMM(h, m));
      setIsAnytime(false);
    } else {
      setTimeH(9); setTimeM(0);
      setTimeInput("09:00");
      setIsAnytime(true);
    }
  }, [visible, initialTime]);

  const tabItems = poolItems.filter((p) =>
    activeTab === "wish"     ? p.sourceType === "wish"     :
    activeTab === "ride"     ? p.sourceType === "ride"     :
    activeTab === "dining"   ? p.sourceType === "dining"   :
    activeTab === "shopping" ? p.sourceType === "shopping" :
    false
  );

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setSelectedId(null);
  }, []);

  const handleTimeInput = useCallback((val: string) => {
    setTimeInput(val);
    const match = val.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      setTimeH(Math.min(23, parseInt(match[1], 10)));
      setTimeM(Math.min(59, parseInt(match[2], 10)));
    }
  }, []);

  const handleHourArrow = useCallback((delta: number) => {
    const { h, m } = adjustTime(timeH, timeM, delta * 60);
    setTimeH(h); setTimeM(m); setTimeInput(formatHHMM(h, m));
  }, [timeH, timeM]);

  const handleMinuteNudge = useCallback((delta: number) => {
    const { h, m } = adjustTime(timeH, timeM, delta);
    setTimeH(h); setTimeM(m); setTimeInput(formatHHMM(h, m));
  }, [timeH, timeM]);

  const handleAdd = useCallback(async () => {
    const scheduledTime = isAnytime ? undefined : formatHHMM(timeH, timeM);

    if (activeTab === "custom") {
      const name = customName.trim();
      if (!name) return;
      await onAdd({
        title: name,
        itemType: "custom",
        scheduledTime,
        sourceId: `custom_${Date.now()}`,
      });
      return;
    }

    if (!selectedId) return;
    const poolItem = poolItems.find((p) => p.id === selectedId);
    if (!poolItem) return;

    await onAdd({
      title:       poolItem.title,
      itemType:    SOURCE_TYPE_MAP[poolItem.sourceType] ?? "wish",
      scheduledTime,
      park:        poolItem.park,
      land:        poolItem.land,
      parkDataId:  poolItem.parkDataId,
      priority:    poolItem.priority,
      sourceId:    poolItem.id,
    });
  }, [activeTab, selectedId, customName, isAnytime, timeH, timeM, poolItems, onAdd]);

  const canConfirm = activeTab === "custom" ? customName.trim().length > 0 : selectedId !== null;

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "var(--color-overlay)", zIndex: 10000 }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid var(--color-border-default)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Add to Day
          </h2>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded"
            style={{ color: "var(--color-text-dim)" }}
          >
            ✕
          </button>
        </div>

        {/* Time / Anytime */}
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          {/* Anytime toggle row */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-dim)" }}>
              Anytime
            </span>
            <button
              onClick={() => setIsAnytime((v) => !v)}
              className="relative w-9 h-5 rounded-full transition-colors duration-200"
              style={{ backgroundColor: isAnytime ? ACCENT : "var(--color-surface-raised)" }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                style={{ transform: isAnytime ? "translateX(16px)" : "translateX(0)" }}
              />
            </button>
          </div>

          {/* Time picker — hidden when Anytime */}
          {!isAnytime && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleHourArrow(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-opacity hover:opacity-80"
                style={{ backgroundColor: `color-mix(in srgb, ${ACCENT} 15%, transparent)`, color: ACCENT }}
              >
                ‹
              </button>
              <input
                type="text"
                value={timeInput}
                onChange={(e) => handleTimeInput(e.target.value)}
                className="w-20 text-center text-sm font-mono rounded-lg px-2 py-1.5 outline-none"
                style={{
                  backgroundColor: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border-input)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="HH:MM"
                maxLength={5}
              />
              <button
                onClick={() => handleHourArrow(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-opacity hover:opacity-80"
                style={{ backgroundColor: `color-mix(in srgb, ${ACCENT} 15%, transparent)`, color: ACCENT }}
              >
                ›
              </button>
              <div className="ml-1 flex items-center gap-1">
                <button
                  onClick={() => handleMinuteNudge(-15)}
                  className="text-[10px] px-1.5 py-1 rounded"
                  style={{ color: "var(--color-text-secondary)", backgroundColor: "var(--color-surface-sunken)" }}
                >
                  −15m
                </button>
                <button
                  onClick={() => handleMinuteNudge(15)}
                  className="text-[10px] px-1.5 py-1 rounded"
                  style={{ color: "var(--color-text-secondary)", backgroundColor: "var(--color-surface-sunken)" }}
                >
                  +15m
                </button>
              </div>
              <span className="ml-auto text-xs font-semibold" style={{ color: ACCENT }}>
                {formatDisplayTime(timeH, timeM)}
              </span>
            </div>
          )}
        </div>

        {/* Type Tabs */}
        <div
          className="flex shrink-0 overflow-x-auto"
          style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          {TABS.map((tab) => {
            const count =
              tab.id === "custom" ? null :
              poolItems.filter((p) => p.sourceType === tab.id).length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="flex-1 flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium
                           whitespace-nowrap transition-colors duration-150"
                style={{
                  color: isActive ? ACCENT : "var(--color-text-dim)",
                  borderBottom: isActive ? `2px solid ${ACCENT}` : "2px solid transparent",
                }}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
                {count !== null && (
                  <span
                    className="text-[9px] px-1 rounded-full"
                    style={{
                      backgroundColor: isActive
                        ? `color-mix(in srgb, ${ACCENT} 20%, transparent)`
                        : "var(--color-surface-sunken)",
                      color: isActive ? ACCENT : "var(--color-text-dim)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {activeTab === "custom" ? (
            <div className="pt-2">
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--color-text-dim)" }}>
                Event name
              </p>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{
                  backgroundColor: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border-input)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="e.g. Parade viewing spot"
                maxLength={80}
                autoFocus
              />
            </div>
          ) : tabItems.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <span className="text-2xl opacity-40">
                {TABS.find((t) => t.id === activeTab)?.icon}
              </span>
              <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
                No {activeTab} items in your pool
              </p>
            </div>
          ) : (
            <div className="space-y-1 pt-1">
              {tabItems.map((poolItem) => {
                const isSelected = selectedId === poolItem.id;
                return (
                  <button
                    key={poolItem.id}
                    onClick={() => setSelectedId(isSelected ? null : poolItem.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                               text-left transition-all duration-100"
                    style={{
                      backgroundColor: isSelected
                        ? `color-mix(in srgb, ${ACCENT} 15%, transparent)`
                        : "var(--color-surface-sunken)",
                      border: isSelected
                        ? `1px solid color-mix(in srgb, ${ACCENT} 40%, transparent)`
                        : "1px solid transparent",
                    }}
                  >
                    <span className="text-sm">{poolItem.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: isSelected ? ACCENT : "var(--color-text-secondary)" }}
                      >
                        {poolItem.title}
                      </p>
                      {poolItem.subtitle && (
                        <p className="text-[10px] truncate" style={{ color: "var(--color-text-dim)" }}>
                          {poolItem.subtitle}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-sm shrink-0" style={{ color: ACCENT }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--color-border-subtle)" }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-surface-sunken)", color: "var(--color-text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!canConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
            style={{
              backgroundColor: canConfirm ? ACCENT : `color-mix(in srgb, ${ACCENT} 30%, transparent)`,
              color: canConfirm ? "var(--color-bg-deep)" : "var(--color-text-dim)",
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            {isAnytime ? "Add to Anytime" : "Add to Timeline"}
          </button>
        </div>
      </div>
    </div>
  );
}
