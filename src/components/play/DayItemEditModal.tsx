"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DayItemRecord } from "@/lib/db";
import { DAY_ITEM_TYPE_ICONS } from "@shared/types/day-item";

const ACCENT = "var(--color-accent-preview)";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// ==================== HELPERS ====================

function formatTime12(time24: string): string {
  if (!time24?.includes(":")) return "";
  const [hh, mm] = time24.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) return "";
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${hour12}:${mm.toString().padStart(2, "0")} ${period}`;
}

// ==================== TYPES ====================

export interface DayItemUpdates {
  title?: string;
  scheduledTime?: string | undefined;
  durationMinutes?: number | undefined;
  notes?: string | undefined;
}

interface DayItemEditModalProps {
  visible: boolean;
  item: DayItemRecord | null;
  onClose: () => void;
  onSave: (id: string, updates: DayItemUpdates) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onToggleCompleted: (id: string) => Promise<void>;
}

// ==================== COMPONENT ====================

export default function DayItemEditModal({
  visible,
  item,
  onClose,
  onSave,
  onRemove,
  onToggleCompleted,
}: DayItemEditModalProps) {
  const [title, setTitle] = useState("");
  const [isAnytime, setIsAnytime] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setIsAnytime(!item.scheduledTime);
    setScheduledTime(item.scheduledTime ?? "");
    setDuration(item.durationMinutes);
    setNotes(item.notes ?? "");
  }, [item]);

  if (!item) return null;

  // Custom = no sourceId, or sourceId starts with "custom_"
  const isCustom = !item.sourceId || item.sourceId.startsWith("custom_");
  const icon = DAY_ITEM_TYPE_ICONS[item.itemType] ?? "📌";

  const effectiveTime: string | undefined = isAnytime ? undefined : (scheduledTime || undefined);

  const hasChanges =
    (isCustom && title !== item.title) ||
    effectiveTime !== item.scheduledTime ||
    duration !== item.durationMinutes ||
    notes !== (item.notes ?? "");

  const handleSave = async () => {
    const updates: DayItemUpdates = {};
    if (isCustom && title !== item.title) updates.title = title;
    if (effectiveTime !== item.scheduledTime) updates.scheduledTime = effectiveTime;
    if (duration !== item.durationMinutes) updates.durationMinutes = duration;
    const newNotes = notes.trim() || undefined;
    if (newNotes !== item.notes) updates.notes = newNotes;
    await onSave(item.id, updates);
    onClose();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ zIndex: 10000 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "var(--color-overlay)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-sm rounded-2xl p-5"
            style={{ backgroundColor: "var(--color-bg-card)" }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Title row */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{icon}</span>
              {isCustom ? (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 text-base font-bold bg-transparent outline-none border-b"
                  style={{
                    color: ACCENT,
                    borderColor: `color-mix(in srgb, ${ACCENT} 30%, transparent)`,
                  }}
                />
              ) : (
                <h3 className="text-base font-bold" style={{ color: ACCENT }}>
                  {item.title}
                </h3>
              )}
            </div>

            {/* Park / Land */}
            {item.land && (
              <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
                {item.park ? `${item.park} · ` : ""}{item.land}
              </p>
            )}

            {/* Anytime toggle */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
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

            {/* Scheduled time */}
            {!isAnytime && (
              <div className="mb-4">
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Scheduled Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    backgroundColor: "var(--color-bg-deep)",
                    color: "var(--color-text-secondary)",
                    border: `1px solid color-mix(in srgb, ${ACCENT} 27%, transparent)`,
                  }}
                />
                <p className="text-[10px] mt-1" style={{ color: "var(--color-text-dim)" }}>
                  {formatTime12(scheduledTime)}
                </p>
              </div>
            )}

            {/* Duration */}
            <div className="mb-4">
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                Duration (optional)
              </label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setDuration(undefined)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer
                             transition-all duration-100"
                  style={{
                    backgroundColor: duration === undefined ? ACCENT : "var(--color-bg-deep)",
                    color: duration === undefined ? "var(--color-bg-deep)" : "var(--color-text-muted)",
                    border: duration === undefined ? "none" : "1px solid var(--color-border-subtle)",
                  }}
                >
                  —
                </button>
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer
                               transition-all duration-100"
                    style={{
                      backgroundColor: duration === d ? ACCENT : "var(--color-bg-deep)",
                      color: duration === d ? "var(--color-bg-deep)" : "var(--color-text-muted)",
                      border: duration === d ? "none" : "1px solid var(--color-border-subtle)",
                    }}
                  >
                    {d >= 60 ? `${d / 60}hr` : `${d}min`}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                style={{
                  backgroundColor: "var(--color-bg-deep)",
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <button
                  onClick={async () => { await onToggleCompleted(item.id); onClose(); }}
                  className="text-xs px-3 py-1.5 rounded-full cursor-pointer
                             transition-colors duration-100"
                  style={{
                    backgroundColor: item.completed
                      ? "color-mix(in srgb, var(--color-success) 15%, transparent)"
                      : "var(--color-surface-raised)",
                    color: item.completed ? "var(--color-success)" : "var(--color-text-muted)",
                  }}
                >
                  {item.completed ? "✅ Done" : "⬜ Mark Done"}
                </button>
                <button
                  onClick={async () => { await onRemove(item.id); onClose(); }}
                  className="text-xs px-3 py-1.5 rounded-full cursor-pointer
                             transition-colors duration-100"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)",
                    color: "var(--color-error)",
                  }}
                >
                  Remove
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="text-xs px-3 py-1.5 cursor-pointer"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Cancel
                </button>
                {hasChanges && (
                  <button
                    onClick={handleSave}
                    className="text-xs px-4 py-1.5 rounded-full font-semibold cursor-pointer
                               transition-all duration-100 hover:brightness-110"
                    style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
