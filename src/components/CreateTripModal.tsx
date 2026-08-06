"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { Trip } from "@/lib/db";

interface CreateTripModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateTrip: (data: {
    name: string;
    startDate: string;
    endDate: string;
    isTemplate?: boolean;
  }) => Promise<void>;
  onCreateFromTemplate?: (
    templateId: string,
    name: string,
    startDate: string,
    endDate: string
  ) => Promise<string | null>;
  templates?: Trip[];
}

export default function CreateTripModal({
  visible,
  onClose,
  onCreateTrip,
  onCreateFromTemplate,
  templates = [],
}: CreateTripModalProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave =
    name.trim() &&
    (isTemplate || (startDate && endDate)) &&
    !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (selectedTemplateId && onCreateFromTemplate && !isTemplate) {
        await onCreateFromTemplate(
          selectedTemplateId,
          name.trim(),
          startDate,
          endDate
        );
      } else {
        await onCreateTrip({
          name: name.trim(),
          startDate: isTemplate ? "" : startDate,
          endDate: isTemplate ? "" : endDate,
          isTemplate,
        });
      }
      resetForm();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setIsTemplate(false);
    setSelectedTemplateId("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const focusRef = useFocusTrap(visible, handleClose);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setName(template.name.replace(/ \(Template\)$/, ""));
      }
    }
  };

  const inputClass =
    "w-full rounded-lg px-3 py-2.5 text-sm outline-none border border-white/10 focus:border-[var(--color-gold)] transition-colors duration-200";

  const inputStyle = {
    backgroundColor: "var(--color-bg-deep)",
    color: "var(--color-text-primary)",
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "var(--color-overlay)", willChange: "opacity" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={focusRef}
            className="w-full max-w-md rounded-2xl p-6 border border-white/10"
            style={{ backgroundColor: "var(--color-bg-card)", willChange: "transform, opacity" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            role="dialog"
            aria-modal="true"
            aria-label={`New ${isTemplate ? "Template" : "Trip"}`}
          >
            {/* Header */}
            <h2
              className="text-xl font-bold mb-6"
              style={{ color: "var(--color-heading)" }}
            >
              {"\u{1F3F0}"} New {isTemplate ? "Template" : "Trip"}
            </h2>

            {/* Form */}
            <div className="flex flex-col gap-4">
              {/* Template toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsTemplate(!isTemplate);
                    if (!isTemplate) {
                      setSelectedTemplateId("");
                    }
                  }}
                  role="switch"
                  aria-checked={isTemplate}
                  aria-label="Create as template (no dates)"
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                    isTemplate ? "bg-[var(--color-gold)]" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                      isTemplate ? "translate-x-5" : ""
                    }`}
                  />
                </button>
                <span
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Create as template (no dates)
                </span>
              </div>

              {/* Create from template dropdown */}
              {!isTemplate && templates.length > 0 && onCreateFromTemplate && (
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Start from Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className={inputClass}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="">Blank trip</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Trip Name */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {isTemplate ? "Template" : "Trip"} Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    isTemplate
                      ? "e.g., Family DL Trip Template"
                      : "e.g., Summer 2026 Disneyland"
                  }
                  className={inputClass}
                  style={inputStyle}
                  autoFocus
                />
              </div>

              {/* Dates — only shown for non-templates */}
              {!isTemplate && (
                <>
                  {/* Start Date */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer
                           transition-colors duration-200 hover:bg-white/5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="px-5 py-2 rounded-full text-sm font-semibold cursor-pointer
                           transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                           hover:brightness-110"
                style={{
                  backgroundColor: "var(--color-gold)",
                  color: "var(--color-bg-deep)",
                }}
              >
                {saving
                  ? "Creating..."
                  : isTemplate
                    ? "Create Template"
                    : "Create Trip"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
