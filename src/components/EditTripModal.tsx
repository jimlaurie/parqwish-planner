"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { Trip, FlightLeg, HotelStay, TransportLeg } from "@/lib/db";
import { getDateRange, buildExportEnvelope, downloadExportFile } from "@/lib/universal-sync";
import { ALL_CATEGORIES } from "@/lib/sync-types";
import { printTripReport } from "@/lib/trip-report";
import { auth, canCollaborate } from "@/lib/auth";
import { createInvite, updateMemberRole, updateMemberDisplayName, removeMember } from "@/lib/wish-sync";
import type { TripMemberRole } from "@shared/types/trip";

// ==================== TYPES ====================

type TabId = "general" | "flight" | "hotel" | "transport" | "collaborate" | "notes";

interface EditTripModalProps {
  visible: boolean;
  trip: Trip | null | undefined;
  onClose: () => void;
  onSave: (id: string, data: Partial<Trip>) => Promise<void>;
  onSaveAsTemplate?: (tripId: string, templateName: string) => Promise<string | null>;
  onClear?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  /** Hides the trip from the main Recent/Future lists into TripSidebar's "Archived Trips" section. Reversible via onUnarchive. */
  onArchive?: (id: string) => Promise<void>;
  onUnarchive?: (id: string) => Promise<void>;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "\u{1F3F0}" },
  { id: "flight", label: "Flight", icon: "\u2708\uFE0F" },
  { id: "hotel", label: "Hotel", icon: "\u{1F3E8}" },
  { id: "transport", label: "Transport", icon: "\u{1F697}" },
  { id: "collaborate", label: "Collaborate", icon: "\u{1F465}" },
  { id: "notes", label: "Notes", icon: "\u{1F4DD}" },
];

// ==================== COMPONENT ====================

export default function EditTripModal({
  visible,
  trip,
  onClose,
  onSave,
  onSaveAsTemplate,
  onClear,
  onDelete,
  onArchive,
  onUnarchive,
}: EditTripModalProps) {
  const focusRef = useFocusTrap(visible, onClose);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Trip>>({});

  // ==================== ARCHIVE TOGGLE STATE ====================
  const [archiveToggleBusy, setArchiveToggleBusy] = useState(false);

  // ==================== DANGER ZONE STATE ====================
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [archiveTime, setArchiveTime] = useState<Date | null>(null);
  const [dangerBusy, setDangerBusy] = useState(false);

  // ==================== COLLABORATE TAB STATE ====================
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [memberBusyUid, setMemberBusyUid] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [confirmRemoveUid, setConfirmRemoveUid] = useState<string | null>(null);
  const [editingNameUid, setEditingNameUid] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  // Keep the form in sync with the trip's latest data, including remote
  // edits arriving mid-session (e.g. another collaborator's change).
  useEffect(() => {
    if (trip) setForm({ ...trip });
  }, [trip]);

  // Reset tab + all transient UI state ONLY when switching to a genuinely
  // different trip — keyed on trip?.id, not the trip object itself. A
  // background sync write (e.g. the self-heal push sweep, or the trip
  // doc's own onSnapshot echoing back this device's writes) changes the
  // trip object's identity without changing which trip is open; keying on
  // the whole object here was snapping the modal back to the General tab
  // and wiping in-progress invite generation mid-flow.
  useEffect(() => {
    if (trip) {
      setActiveTab("general");
      setShowDangerZone(false);
      setArchiveTime(null);
      setDangerBusy(false);
      setInviteLink(null);
      setInviteError(null);
      setInviteCopied(false);
      setMemberBusyUid(null);
      setMemberError(null);
      setConfirmRemoveUid(null);
      setEditingNameUid(null);
    }
  }, [trip?.id]);

  const handleChange = useCallback(
    (field: keyof Trip, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSave = async () => {
    if (!trip || saving) return;
    setSaving(true);
    try {
      await onSave(trip.id, form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!trip || !onSaveAsTemplate) return;
    const name = `${trip.name} (Template)`;
    await onSaveAsTemplate(trip.id, name);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ==================== ARCHIVE TOGGLE HANDLER ====================

  const handleToggleArchive = async () => {
    if (!trip || archiveToggleBusy) return;
    setArchiveToggleBusy(true);
    try {
      if (trip.isArchived) {
        await onUnarchive?.(trip.id);
      } else {
        await onArchive?.(trip.id);
        onClose();
      }
    } finally {
      setArchiveToggleBusy(false);
    }
  };

  // ==================== DANGER ZONE HANDLERS ====================

  const handleArchiveForDeletion = async () => {
    if (!trip || dangerBusy) return;
    setDangerBusy(true);
    try {
      const dates = trip.startDate && trip.endDate
        ? getDateRange(trip.startDate, trip.endDate)
        : [];
      const { envelope } = await buildExportEnvelope(
        trip.id, dates, ALL_CATEGORIES, trip.name, "archive",
        undefined, "Export for Deletion"
      );
      await downloadExportFile(envelope, trip.name);
      setArchiveTime(new Date());
    } finally {
      setDangerBusy(false);
    }
  };

  const handleClear = async () => {
    if (!trip || !onClear || dangerBusy) return;
    setDangerBusy(true);
    try {
      await onClear(trip.id);
      onClose();
    } finally {
      setDangerBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!trip || !onDelete || dangerBusy) return;
    setDangerBusy(true);
    try {
      await onDelete(trip.id);
      onClose();
    } finally {
      setDangerBusy(false);
    }
  };

  // ==================== COLLABORATE HANDLERS ====================

  const handleGenerateInvite = async () => {
    if (!trip || inviteBusy) return;
    const user = auth.currentUser;
    if (!user) return;
    setInviteBusy(true);
    setInviteError(null);
    setInviteCopied(false);
    try {
      const link = await createInvite(trip.id, inviteRole, user.uid);
      setInviteLink(link);
    } catch {
      setInviteError("Couldn't generate an invite link — make sure this trip has finished syncing, then try again.");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      // Clipboard permission denied — link is still visible to copy manually
    }
  };

  const handleShareInvite = async () => {
    if (!inviteLink || !trip) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join "${trip.name}" on ParQwish`, url: inviteLink });
      } catch {
        // User cancelled the share sheet — no-op
      }
    } else {
      handleCopyInvite();
    }
  };

  const handleChangeMemberRole = async (targetUid: string, newRole: TripMemberRole) => {
    if (!trip || newRole === "owner" || memberBusyUid) return;
    setMemberBusyUid(targetUid);
    setMemberError(null);
    try {
      await updateMemberRole(trip.id, targetUid, newRole);
    } catch {
      setMemberError("Couldn't update that person's role — please try again.");
    } finally {
      setMemberBusyUid(null);
    }
  };

  const handleRemoveMember = async (targetUid: string) => {
    if (!trip) return;
    if (confirmRemoveUid !== targetUid) {
      setConfirmRemoveUid(targetUid);
      return;
    }
    setMemberBusyUid(targetUid);
    setMemberError(null);
    try {
      await removeMember(trip.id, targetUid);
      setConfirmRemoveUid(null);
    } catch {
      setMemberError("Couldn't remove that person — please try again.");
    } finally {
      setMemberBusyUid(null);
    }
  };

  const handleStartEditName = (uid: string, currentName: string) => {
    setEditingNameUid(uid);
    setNameDraft(currentName);
    setMemberError(null);
  };

  const handleSaveName = async (uid: string) => {
    if (!trip || !nameDraft.trim() || memberBusyUid) return;
    setMemberBusyUid(uid);
    setMemberError(null);
    try {
      await updateMemberDisplayName(trip.id, uid, nameDraft.trim());
      setEditingNameUid(null);
    } catch {
      setMemberError("Couldn't save that name — please try again.");
    } finally {
      setMemberBusyUid(null);
    }
  };

  // ==================== FIELD HELPERS ====================

  const inputStyle = {
    backgroundColor: "var(--color-bg-deep)",
    color: "var(--color-text-primary)",
  };

  const inputClass =
    "w-full rounded-lg px-3 py-2.5 text-sm outline-none border border-white/10 focus:border-[var(--color-gold)] transition-colors duration-200";

  const labelClass = "block text-sm font-medium mb-1.5";

  const renderInput = (
    label: string,
    field: keyof Trip,
    opts?: { type?: string; placeholder?: string; min?: string }
  ) => (
    <div>
      <label
        className={labelClass}
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </label>
      <input
        type={opts?.type || "text"}
        value={(form[field] as string) ?? ""}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={opts?.placeholder}
        min={opts?.min}
        className={inputClass}
        style={inputStyle}
      />
    </div>
  );

  const renderTextarea = (
    label: string,
    field: keyof Trip,
    placeholder?: string
  ) => (
    <div>
      <label
        className={labelClass}
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </label>
      <textarea
        value={(form[field] as string) ?? ""}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`${inputClass} resize-none`}
        style={inputStyle}
      />
    </div>
  );

  // ==================== TAB CONTENT ====================

  const renderGeneralTab = () => (
    <div className="flex flex-col gap-4">
      {renderInput("Trip Name", "name", { placeholder: "e.g., Summer 2026 Disneyland" })}
      {!form.isTemplate && (
        <>
          {renderInput("Start Date", "startDate", { type: "date" })}
          {renderInput("End Date", "endDate", {
            type: "date",
            min: (form.startDate as string) || undefined,
          })}
        </>
      )}
      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          onClick={() => handleChange("isTemplate", !form.isTemplate)}
          role="switch"
          aria-checked={!!form.isTemplate}
          aria-label="Template (no dates)"
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
            form.isTemplate ? "bg-[var(--color-gold)]" : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
              form.isTemplate ? "translate-x-5" : ""
            }`}
          />
        </button>
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Template (no dates)
        </span>
      </div>
      {/* Hides the trip from the main list, fully reversible — distinct from
          the Danger Zone's "Archive first" backup-file download below;
          see the comment there and docs/sync-architecture.md §6.6. */}
      {trip && !form.isTemplate && (onArchive || onUnarchive) && (
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={handleToggleArchive}
            disabled={archiveToggleBusy}
            role="switch"
            aria-checked={!!trip.isArchived}
            aria-label="Archive this trip"
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              trip.isArchived ? "bg-[var(--color-gold)]" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                trip.isArchived ? "translate-x-5" : ""
              }`}
            />
          </button>
          <span
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {trip.isArchived
              ? "Archived — hidden from your main trip list"
              : "Archive this trip (hide from main list, keeps all data)"}
          </span>
        </div>
      )}
    </div>
  );

  // ==================== ARRAY FIELD HELPERS ====================

  const updateArrayItem = <T,>(
    field: "flights" | "hotels" | "transports",
    index: number,
    key: keyof T,
    value: string
  ) => {
    setForm((prev) => {
      const arr = [...((prev[field] as T[]) || [])];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
  };

  const addArrayItem = <T,>(field: "flights" | "hotels" | "transports", blank: T) => {
    setForm((prev) => ({
      ...prev,
      [field]: [...((prev[field] as T[]) || []), blank],
    }));
  };

  const removeArrayItem = (field: "flights" | "hotels" | "transports", index: number) => {
    setForm((prev) => {
      const arr = [...((prev[field] as unknown[]) || [])];
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
  };

  const cardClass =
    "rounded-xl p-4 mb-3 border border-white/10 relative";
  const cardStyle = { backgroundColor: "var(--color-surface-raised)" };

  const removeBtn = (field: "flights" | "hotels" | "transports", index: number) => (
    <button
      type="button"
      onClick={() => removeArrayItem(field, index)}
      className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full cursor-pointer
                 transition-colors duration-200 hover:bg-white/10"
      style={{ color: "var(--color-error)" }}
      aria-label="Remove"
    >
      {"\u2715"}
    </button>
  );

  const addBtn = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium
                 cursor-pointer transition-colors duration-200 hover:bg-white/5"
      style={{
        borderColor: "var(--color-border-input)",
        color: "var(--color-text-muted)",
      }}
    >
      + {label}
    </button>
  );

  // ==================== FLIGHT TAB ====================

  const renderFlightTab = () => {
    const flights = (form.flights as FlightLeg[]) || [];
    return (
      <div className="flex flex-col gap-3">
        {flights.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--color-text-dim)" }}>
            No flights added yet.
          </p>
        )}
        {flights.map((leg, i) => (
          <div key={i} className={cardClass} style={cardStyle}>
            {removeBtn("flights", i)}
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>
              Flight {i + 1}
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>From</label>
                  <input
                    type="text"
                    value={leg.from ?? ""}
                    onChange={(e) => updateArrayItem<FlightLeg>("flights", i, "from", e.target.value)}
                    placeholder="LAX"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>To</label>
                  <input
                    type="text"
                    value={leg.to ?? ""}
                    onChange={(e) => updateArrayItem<FlightLeg>("flights", i, "to", e.target.value)}
                    placeholder="SNA"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Airline</label>
                  <input
                    type="text"
                    value={leg.airline ?? ""}
                    onChange={(e) => updateArrayItem<FlightLeg>("flights", i, "airline", e.target.value)}
                    placeholder="AA"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Flight #</label>
                  <input
                    type="text"
                    value={leg.flightNumber ?? ""}
                    onChange={(e) => updateArrayItem<FlightLeg>("flights", i, "flightNumber", e.target.value)}
                    placeholder="1234"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Date</label>
                  <input
                    type="date"
                    value={leg.date ?? ""}
                    onChange={(e) => updateArrayItem<FlightLeg>("flights", i, "date", e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Time</label>
                  <input
                    type="time"
                    value={leg.time ?? ""}
                    onChange={(e) => updateArrayItem<FlightLeg>("flights", i, "time", e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Confirmation #</label>
                <input
                  type="text"
                  value={leg.confirmation ?? ""}
                  onChange={(e) => updateArrayItem<FlightLeg>("flights", i, "confirmation", e.target.value)}
                  placeholder="ABC123"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Notes</label>
                <textarea
                  value={leg.notes ?? ""}
                  onChange={(e) => updateArrayItem<FlightLeg>("flights", i, "notes", e.target.value)}
                  placeholder="Seat, gate, layover..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        ))}
        {addBtn("Add Flight", () => addArrayItem<FlightLeg>("flights", {}))}
      </div>
    );
  };

  // ==================== HOTEL TAB ====================

  const renderHotelTab = () => {
    const hotels = (form.hotels as HotelStay[]) || [];
    return (
      <div className="flex flex-col gap-3">
        {hotels.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--color-text-dim)" }}>
            No hotels added yet.
          </p>
        )}
        {hotels.map((stay, i) => (
          <div key={i} className={cardClass} style={cardStyle}>
            {removeBtn("hotels", i)}
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>
              Hotel {i + 1}
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Hotel Name</label>
                <input
                  type="text"
                  value={stay.name ?? ""}
                  onChange={(e) => updateArrayItem<HotelStay>("hotels", i, "name", e.target.value)}
                  placeholder="Disney's Grand Californian"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Confirmation #</label>
                <input
                  type="text"
                  value={stay.confirmation ?? ""}
                  onChange={(e) => updateArrayItem<HotelStay>("hotels", i, "confirmation", e.target.value)}
                  placeholder="GC-789012"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Check-In</label>
                  <input
                    type="date"
                    value={stay.checkIn ?? ""}
                    onChange={(e) => updateArrayItem<HotelStay>("hotels", i, "checkIn", e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Check-Out</label>
                  <input
                    type="date"
                    value={stay.checkOut ?? ""}
                    onChange={(e) => updateArrayItem<HotelStay>("hotels", i, "checkOut", e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Notes</label>
                <textarea
                  value={stay.notes ?? ""}
                  onChange={(e) => updateArrayItem<HotelStay>("hotels", i, "notes", e.target.value)}
                  placeholder="Room requests, parking info..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        ))}
        {addBtn("Add Hotel", () => addArrayItem<HotelStay>("hotels", {}))}
      </div>
    );
  };

  // ==================== TRANSPORT TAB ====================

  const TRANSPORT_TYPES = [
    "Rental Car", "Uber/Lyft", "Hotel Shuttle", "Personal Vehicle", "Public Transit", "Other",
  ];

  const renderTransportTab = () => {
    const transports = (form.transports as TransportLeg[]) || [];
    return (
      <div className="flex flex-col gap-3">
        {transports.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--color-text-dim)" }}>
            No transportation added yet.
          </p>
        )}
        {transports.map((leg, i) => (
          <div key={i} className={cardClass} style={cardStyle}>
            {removeBtn("transports", i)}
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>
              Transport {i + 1}
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Type</label>
                <select
                  value={leg.type ?? ""}
                  onChange={(e) => updateArrayItem<TransportLeg>("transports", i, "type", e.target.value)}
                  className={inputClass}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">Select type...</option>
                  {TRANSPORT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Date</label>
                <input
                  type="date"
                  value={leg.date ?? ""}
                  onChange={(e) => updateArrayItem<TransportLeg>("transports", i, "date", e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Details</label>
                <input
                  type="text"
                  value={leg.details ?? ""}
                  onChange={(e) => updateArrayItem<TransportLeg>("transports", i, "details", e.target.value)}
                  placeholder="Confirmation #, pickup time..."
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Notes</label>
                <textarea
                  value={leg.notes ?? ""}
                  onChange={(e) => updateArrayItem<TransportLeg>("transports", i, "notes", e.target.value)}
                  placeholder="Parking info, shuttle times..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        ))}
        {addBtn("Add Transportation", () => addArrayItem<TransportLeg>("transports", {}))}
      </div>
    );
  };

  // ==================== COLLABORATE TAB ====================

  const ROLE_LABEL: Record<TripMemberRole, string> = { owner: "👑 Owner", editor: "✏️ Editor", viewer: "👀 Viewer" };

  const renderRoster = (isOwnerView: boolean) => {
    if (!trip?.members) return null;
    const user = auth.currentUser;
    const rows = Object.entries(trip.members).sort(([, a], [, b]) => {
      if (a.role === "owner") return -1;
      if (b.role === "owner") return 1;
      return a.joinedAt.localeCompare(b.joinedAt);
    });

    return (
      <div className="flex flex-col gap-2">
        <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
          Who has access
        </label>
        {rows.map(([uid, member]) => {
          const isMe = uid === user?.uid;
          const busy = memberBusyUid === uid;
          const canManage = isOwnerView && member.role !== "owner" && !isMe;
          const isEditingName = editingNameUid === uid;
          const label = isMe ? "You" : member.displayName || `…${uid.slice(-8)}`;
          return (
            <div
              key={uid}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: "var(--color-surface-raised)" }}
            >
              {isEditingName ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Your name"
                    autoFocus
                    className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-sm outline-none border"
                    style={{ backgroundColor: "var(--color-bg-deep)", color: "var(--color-text-primary)", borderColor: "var(--color-gold)" }}
                  />
                  <button
                    type="button"
                    disabled={busy || !nameDraft.trim()}
                    onClick={() => handleSaveName(uid)}
                    className="text-[11px] px-2.5 py-1.5 rounded-full cursor-pointer font-semibold disabled:opacity-40 flex-shrink-0"
                    style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNameUid(null)}
                    className="text-[11px] px-2 py-1.5 rounded-full cursor-pointer flex-shrink-0"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
                    {label}
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => handleStartEditName(uid, member.displayName ?? "")}
                        className="text-[10px] font-normal cursor-pointer underline decoration-dotted"
                        style={{ color: "var(--color-text-dim)" }}
                      >
                        edit
                      </button>
                    )}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
                    {ROLE_LABEL[member.role]} · joined {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {canManage && !isEditingName && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleChangeMemberRole(uid, member.role === "editor" ? "viewer" : "editor")}
                    className="text-[11px] px-2 py-1 rounded-full border cursor-pointer
                               transition-colors duration-200 hover:bg-white/5 disabled:opacity-40"
                    style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border-input)" }}
                  >
                    Make {member.role === "editor" ? "Viewer" : "Editor"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRemoveMember(uid)}
                    className="text-[11px] px-2 py-1 rounded-full cursor-pointer
                               transition-colors duration-200 disabled:opacity-40"
                    style={{
                      color: "var(--color-error)",
                      backgroundColor: confirmRemoveUid === uid ? "color-mix(in srgb, var(--color-error) 15%, transparent)" : "transparent",
                    }}
                  >
                    {confirmRemoveUid === uid ? "Confirm?" : "Remove"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {memberError && (
          <p className="text-xs text-center" style={{ color: "var(--color-error)" }}>
            {memberError}
          </p>
        )}
      </div>
    );
  };

  const renderCollaborateTab = () => {
    const user = auth.currentUser;
    // Viewing the roster (or being an invited collaborator) just needs any
    // signed-in identity. Generating invites as the Owner needs Apple — but
    // that's already implied by isOwner below, since role='owner' can only
    // ever be granted via Apple-gated trip creation (see auth.ts).
    const canViewTab = canCollaborate(user);

    if (!canViewTab) {
      return (
        <div className="flex flex-col gap-3 items-center text-center py-6">
          <span className="text-3xl">☁️</span>
          <p className="text-sm font-medium" style={{ color: "var(--color-heading)" }}>
            Sign in to invite collaborators
          </p>
          <p className="text-xs max-w-xs" style={{ color: "var(--color-text-muted)" }}>
            Inviting someone to plan a trip together needs Cloud Sync turned on.
            Head to the Play page and sign in, then come back here.
          </p>
        </div>
      );
    }

    // No members map yet = a solo trip that hasn't finished its first sync.
    // Treat the local user as the de facto owner rather than showing an
    // empty roster — createSharedTrip stamps this in as soon as sync runs.
    const myRole = trip?.members?.[user!.uid]?.role;
    const isOwner = !trip?.members || myRole === "owner";

    if (!isOwner) {
      return (
        <div className="flex flex-col gap-4">
          {renderRoster(false)}
          <p className="text-xs text-center" style={{ color: "var(--color-text-dim)" }}>
            Only the trip owner can invite people or change access.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        {renderRoster(true)}

        <div className="flex flex-col gap-4 pt-1 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div>
            <label className={labelClass} style={{ color: "var(--color-text-secondary)" }}>
              Invite as
            </label>
            <div className="flex gap-2">
              {(["editor", "viewer"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => { setInviteRole(role); setInviteLink(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer
                             transition-colors duration-200 border ${
                               inviteRole === role ? "bg-[var(--color-gold)]" : "hover:bg-white/5"
                             }`}
                  style={{
                    color: inviteRole === role ? "var(--color-bg-deep)" : "var(--color-text-secondary)",
                    borderColor: inviteRole === role ? "var(--color-gold)" : "var(--color-border-input)",
                  }}
                >
                  {role === "editor" ? "✏️ Editor" : "👀 Viewer"}
                </button>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--color-text-dim)" }}>
              {inviteRole === "editor"
                ? "Can add, edit, and check off items. Trip dates and travel details stay owner-only."
                : "Can view everything but can't make changes."}
            </p>
          </div>

          {!inviteLink ? (
            <button
              onClick={handleGenerateInvite}
              disabled={inviteBusy}
              className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer
                         transition-all duration-150 disabled:opacity-50"
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-gold) 15%, transparent)",
                color: "var(--color-gold)",
                border: "1px solid color-mix(in srgb, var(--color-gold) 40%, transparent)",
              }}
            >
              {inviteBusy ? "Generating…" : "Generate Invite Link"}
            </button>
          ) : (
            <div className="rounded-xl p-3" style={{ backgroundColor: "var(--color-surface-raised)" }}>
              <p className="text-xs mb-2 break-all font-mono" style={{ color: "var(--color-text-secondary)" }}>
                {inviteLink}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyInvite}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer
                             transition-colors duration-200 hover:brightness-110"
                  style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
                >
                  {inviteCopied ? "✓ Copied" : "Copy Link"}
                </button>
                <button
                  onClick={handleShareInvite}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer border
                             transition-colors duration-200 hover:bg-white/5"
                  style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-border-input)" }}
                >
                  Share…
                </button>
              </div>
              <p className="text-[10px] mt-2" style={{ color: "var(--color-text-dim)" }}>
                Expires in 48 hours. Anyone with this link can join as {inviteRole === "editor" ? "an editor" : "a viewer"} — share it only with people you trust.
              </p>
            </div>
          )}

          {inviteError && (
            <p className="text-xs text-center" style={{ color: "var(--color-error)" }}>
              {inviteError}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderNotesTab = () => (
    <div className="flex flex-col gap-4">
      <div>
        <label
          className={labelClass}
          style={{ color: "var(--color-text-secondary)" }}
        >
          Trip Notes
        </label>
        <textarea
          value={(form.notes as string) ?? ""}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="General trip notes, reminders, links..."
          rows={8}
          className={`${inputClass} resize-none`}
          style={inputStyle}
        />
      </div>
    </div>
  );

  // ==================== DANGER ZONE UI ====================

  const renderDangerZone = () => (
    <div className="space-y-5">
      {/* Warning header */}
      <div className="flex items-start gap-3 p-4 rounded-xl"
           style={{ backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-error) 25%, transparent)" }}>
        <span className="text-2xl leading-none">⚠️</span>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-error)" }}>
            Permanent action — cannot be undone
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            <strong>Clear</strong> removes all wishes, packing, itinerary, and GPS trails for this trip
            but keeps the trip name and dates.{" "}
            <strong>Delete</strong> removes everything including the trip itself.
            Catalog items are never deleted — only the links to this trip.
          </p>
        </div>
      </div>

      {/* Archive status — this is a BACKUP FILE download before permanent
          deletion, unrelated to the "Archive this trip" hide-from-view
          toggle on the General tab (see the isArchived switch above, near
          handleToggleArchive). Same word, two different features — see
          docs/sync-architecture.md §6.6 for the full disambiguation. */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--color-surface-raised)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
           style={{ color: "var(--color-text-muted)" }}>
          Archive first (recommended)
        </p>
        {archiveTime ? (
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-success)" }}>
                Archived
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {archiveTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — file saved to Downloads
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Download a backup before deleting. You can restore it later via the Play → Import Archive tab.
            </p>
            <button
              onClick={handleArchiveForDeletion}
              disabled={dangerBusy}
              className="px-4 py-2 rounded-full text-xs font-semibold cursor-pointer
                         transition-all duration-200 hover:brightness-110
                         disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
            >
              {dangerBusy ? "Archiving..." : "📥 Download Archive"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const TAB_CONTENT: Record<TabId, () => React.ReactNode> = {
    general: renderGeneralTab,
    flight: renderFlightTab,
    hotel: renderHotelTab,
    transport: renderTransportTab,
    collaborate: renderCollaborateTab,
    notes: renderNotesTab,
  };

  // ==================== RENDER ====================

  return (
    <AnimatePresence>
      {visible && trip && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          // Promote to its own compositing layer so the opacity fade animates
          // a cached layer instead of forcing a full-viewport repaint of
          // everything underneath (title banner, portal cards) on every frame.
          style={{ backgroundColor: "var(--color-overlay)", willChange: "opacity" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={focusRef}
            className="w-full max-w-lg rounded-2xl border border-white/10 flex flex-col max-h-[85vh]"
            style={{ backgroundColor: "var(--color-bg-card)", willChange: "transform, opacity" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            role="dialog"
            aria-modal="true"
            aria-label="Edit Trip"
          >
            {/* Header */}
            <div className="p-6 pb-0">
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: "var(--color-heading)" }}
              >
                {"\u270F\uFE0F"} Edit Trip
              </h2>

              {/* Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-2" role="tablist" aria-label="Trip details sections">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-label={`${tab.label} tab`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                               whitespace-nowrap transition-colors duration-200 cursor-pointer
                               ${
                                 activeTab === tab.id
                                   ? "bg-[var(--color-gold)]"
                                   : "hover:bg-white/5"
                               }`}
                    style={{
                      color:
                        activeTab === tab.id
                          ? "var(--color-bg-deep)"
                          : "var(--color-text-secondary)",
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content / Danger Zone */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              {showDangerZone ? renderDangerZone() : TAB_CONTENT[activeTab]()}
            </div>

            {/* Actions */}
            <div className="p-6 pt-3 border-t border-white/5 flex items-center gap-3">
              {showDangerZone ? (
                // ── Danger zone footer ──
                <>
                  <button
                    onClick={() => setShowDangerZone(false)}
                    className="text-xs px-3 py-1.5 rounded-full border border-white/10
                               transition-colors duration-200 hover:bg-white/5 cursor-pointer"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    ← Back
                  </button>
                  <div className="flex-1" />
                  {onClear && (
                    <button
                      onClick={handleClear}
                      disabled={dangerBusy}
                      className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer
                                 transition-all duration-200 hover:brightness-110
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "color-mix(in srgb, var(--color-warning) 20%, transparent)", color: "var(--color-warning)" }}
                    >
                      {dangerBusy ? "Working..." : "🧹 Clear Data"}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={dangerBusy}
                      className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer
                                 transition-all duration-200 hover:brightness-110
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "color-mix(in srgb, var(--color-error) 20%, transparent)", color: "var(--color-error)" }}
                    >
                      {dangerBusy ? "Working..." : "🗑 Delete Trip"}
                    </button>
                  )}
                </>
              ) : (
                // ── Normal footer ──
                <>
                  {(onDelete || onClear) && (
                    <button
                      onClick={() => setShowDangerZone(true)}
                      className="text-xs px-3 py-1.5 rounded-full border cursor-pointer
                                 transition-colors duration-200 hover:bg-white/5"
                      style={{
                        color: "var(--color-error)",
                        borderColor: "color-mix(in srgb, var(--color-error) 30%, transparent)",
                      }}
                    >
                      🗑 Delete…
                    </button>
                  )}
                  {onSaveAsTemplate && !form.isTemplate && (
                    <button
                      onClick={handleSaveAsTemplate}
                      className="text-xs px-3 py-1.5 rounded-full border border-white/10
                                 transition-colors duration-200 hover:bg-white/5 cursor-pointer"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Save as Template
                    </button>
                  )}
                  {!form.isTemplate && (
                    <button
                      onClick={() => printTripReport(form as Trip)}
                      className="text-xs px-3 py-1.5 rounded-full border border-white/10
                                 transition-colors duration-200 hover:bg-white/5 cursor-pointer"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      🖨 Print
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer
                               transition-colors duration-200 hover:bg-white/5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 rounded-full text-sm font-semibold cursor-pointer
                               transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                               hover:brightness-110"
                    style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
