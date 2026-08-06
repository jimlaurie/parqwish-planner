"use client";

import { useState, useEffect, useMemo } from "react";

const ACCENT = "var(--color-accent-preview)";

// ==================== HELPERS ====================

function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const current = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (current <= last) {
    days.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatDateChip(dateStr: string): { dayOfWeek: string; monthDay: string } {
  const d = new Date(dateStr + "T12:00:00");
  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  return { dayOfWeek, monthDay };
}

// ==================== TYPES ====================

interface BulkAddToDayModalProps {
  visible: boolean;
  itemCount: number;
  tripStartDate: string;
  tripEndDate: string;
  defaultDate?: string | null;
  onConfirm: (date: string, scheduledTime: string | undefined) => Promise<void>;
  onClose: () => void;
}

// ==================== COMPONENT ====================

export default function BulkAddToDayModal({
  visible,
  itemCount,
  tripStartDate,
  tripEndDate,
  defaultDate,
  onConfirm,
  onClose,
}: BulkAddToDayModalProps) {
  const days = useMemo(
    () => (tripStartDate && tripEndDate ? getDaysBetween(tripStartDate, tripEndDate) : []),
    [tripStartDate, tripEndDate]
  );

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isAnytime, setIsAnytime] = useState(true);
  const [timeValue, setTimeValue] = useState("09:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const fallback = defaultDate && days.includes(defaultDate) ? defaultDate : days[0];
    setSelectedDate(fallback ?? "");
    setIsAnytime(true);
    setTimeValue("09:00");
  }, [visible, defaultDate, days]);

  if (!visible) return null;

  const handleConfirm = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await onConfirm(selectedDate, isAnytime ? undefined : timeValue);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "var(--color-overlay)" }}>
      <div
        className="w-full max-w-md rounded-2xl p-5"
        style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-default)" }}
      >
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
          Add {itemCount} item{itemCount !== 1 ? "s" : ""} to a day
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-dim)" }}>
          Choose which trip day to add the selected items to.
        </p>

        {/* Day chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {days.map((day) => {
            const { dayOfWeek, monthDay } = formatDateChip(day);
            const active = day === selectedDate;
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(day)}
                className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl cursor-pointer transition-colors duration-150"
                style={{
                  backgroundColor: active ? `${ACCENT}20` : "var(--color-surface-sunken)",
                  border: `1px solid ${active ? ACCENT : "var(--color-border-subtle)"}`,
                  color: active ? ACCENT : "var(--color-text-secondary)",
                }}
              >
                <span className="text-[10px] uppercase tracking-wide">{dayOfWeek}</span>
                <span className="text-sm font-semibold">{monthDay}</span>
              </button>
            );
          })}
        </div>

        {/* Time */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setIsAnytime(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            style={{
              backgroundColor: isAnytime ? `${ACCENT}20` : "transparent",
              color: isAnytime ? ACCENT : "var(--color-text-dim)",
              border: `1px solid ${isAnytime ? ACCENT : "var(--color-border-subtle)"}`,
            }}
          >
            Anytime
          </button>
          <button
            onClick={() => setIsAnytime(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            style={{
              backgroundColor: !isAnytime ? `${ACCENT}20` : "transparent",
              color: !isAnytime ? ACCENT : "var(--color-text-dim)",
              border: `1px solid ${!isAnytime ? ACCENT : "var(--color-border-subtle)"}`,
            }}
          >
            At a time
          </button>
          {!isAnytime && (
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: "var(--color-surface-sunken)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
            style={{ color: "var(--color-text-dim)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDate || saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: `${ACCENT}20`, color: ACCENT }}
          >
            {saving ? "Adding..." : `Add ${itemCount} to Day`}
          </button>
        </div>
      </div>
    </div>
  );
}
