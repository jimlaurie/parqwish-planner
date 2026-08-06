"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { PackingItem, PackingType } from "@/lib/db";
import PriorityPicker from "@/components/PriorityPicker";
import CategoryPicker from "@/components/CategoryPicker";
import PhotoPicker from "@/components/PhotoPicker";
import WishLinker from "@/components/WishLinker";
import ParkDataLinker from "@/components/ParkDataLinker";
import { PACKING_CATEGORIES, PACKING_TABS } from "@/lib/constants";
import type { PackingFormData } from "@/hooks/use-packing-items";

// ==================== COMPONENT ====================

interface PackingFormModalProps {
  visible: boolean;
  itemId?: string;
  activeTab: PackingType;
  getItemById?: (id: string) => Promise<PackingItem | undefined>;
  onClose: () => void;
  onSave: (data: PackingFormData) => Promise<void>;
  onUnselectFromTrip?: () => Promise<void>;
  onDeleteForever?: () => Promise<void>;
}

const ACCENT = "var(--color-accent-prepare)";

export default function PackingFormModal({
  visible,
  itemId,
  activeTab,
  getItemById,
  onClose,
  onSave,
  onUnselectFromTrip,
  onDeleteForever,
}: PackingFormModalProps) {
  const isEditMode = !!itemId;
  const focusRef = useFocusTrap(visible, onClose);
  const isShopping = activeTab === "shopping";
  const isDining = activeTab === "dining";
  const isOutfit = activeTab === "outfit";
  const showPhoto = isOutfit || isShopping || isDining;
  const showParkDataLinker = isShopping || isDining;
  const tabInfo = PACKING_TABS.find((t) => t.id === activeTab);
  const categories = PACKING_CATEGORIES[activeTab];

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [priority, setPriority] = useState("C");
  const [price, setPrice] = useState("");
  const [url, setUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoSets, setPhotoSets] = useState<import("@/lib/db").PhotoSet[]>([]);
  const [linkedWishIds, setLinkedWishIds] = useState<string[]>([]);
  const [linkedParkDataIds, setLinkedParkDataIds] = useState<string[]>([]);
  const [reservationTime, setReservationTime] = useState("");
  const [reservationConfirmation, setReservationConfirmation] = useState("");
  const [partySize, setPartySize] = useState<number | undefined>();
  const [diningType, setDiningType] = useState<"reservation" | "walk-up" | "mobile-order">("walk-up");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteStep, setDeleteStep] = useState<null | "confirm" | "choose">(null);

  // Load existing item in edit mode
  const loadItem = useCallback(async () => {
    if (itemId && getItemById) {
      const item = await getItemById(itemId);
      if (item) {
        setName(item.name);
        setNotes(item.notes ?? "");
        setCategory(item.category);
        setPriority(item.priority ?? "C");
        setPrice(item.price ?? "");
        setUrl(item.url ?? "");
        setPhotos(item.photos ?? []);
        setPhotoSets(item.photoSets ?? []);
        setLinkedWishIds(item.linkedWishIds ?? []);
        setLinkedParkDataIds(item.linkedParkDataIds ?? []);
        setReservationTime(item.reservationTime ?? "");
        setReservationConfirmation(item.reservationConfirmation ?? "");
        setPartySize(item.partySize);
        setDiningType((item.diningType as "reservation" | "walk-up" | "mobile-order") ?? "walk-up");
        setDietaryNotes(item.dietaryNotes ?? "");
      }
    }
  }, [itemId, getItemById]);

  useEffect(() => {
    if (visible && isEditMode) {
      loadItem();
    } else if (visible && !isEditMode) {
      setName("");
      setNotes("");
      setCategory(categories[0]);
      setPriority("C");
      setPrice("");
      setUrl("");
      setPhotos([]);
      setPhotoSets([]);
      setLinkedWishIds([]);
      setLinkedParkDataIds([]);
      setReservationTime("");
      setReservationConfirmation("");
      setPartySize(undefined);
      setDiningType("walk-up");
      setDietaryNotes("");
    }
    setDeleteStep(null);
  }, [visible, isEditMode, loadItem, categories]);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        notes: notes.trim() || undefined,
        category,
        priority,
        price: isShopping ? price.trim() || undefined : undefined,
        url: isShopping ? url.trim() || undefined : undefined,
        photos: showPhoto && photoSets.length > 0
          ? photoSets.map((ps) => ps.thumbnail)
          : showPhoto && photos.length > 0 ? photos : undefined,
        photoSets: showPhoto && photoSets.length > 0 ? photoSets : undefined,
        linkedWishIds: linkedWishIds.length > 0 ? linkedWishIds : undefined,
        linkedParkDataIds:
          showParkDataLinker && linkedParkDataIds.length > 0
            ? linkedParkDataIds
            : undefined,
        reservationTime: isDining ? reservationTime.trim() || undefined : undefined,
        reservationConfirmation: isDining
          ? reservationConfirmation.trim() || undefined
          : undefined,
        partySize: isDining ? partySize || undefined : undefined,
        diningType: isDining ? diningType : undefined,
        dietaryNotes: isDining ? dietaryNotes.trim() || undefined : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      // Clipboard permission denied
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

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
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6
                       border border-white/10"
            style={{ backgroundColor: "var(--color-bg-card)", willChange: "transform, opacity" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${isEditMode ? "Edit" : "Add"} ${tabInfo?.label.replace(/s$/, "") ?? "Item"}`}
          >
            {/* Header */}
            <h2
              className="text-xl font-bold mb-5"
              style={{ color: ACCENT }}
            >
              {tabInfo?.icon ?? "\u{1F3D4}\uFE0F"}{" "}
              {isEditMode ? "Edit" : "Add"}{" "}
              {tabInfo?.label.replace(/s$/, "") ?? "Item"}
            </h2>

            {/* Form */}
            <div className="flex flex-col gap-4">
              {/* Photos */}
              {showPhoto && (
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Photos
                  </label>
                  <PhotoPicker
                    photoSets={photoSets}
                    photos={photos}
                    onChangeMultiRes={setPhotoSets}
                    onChange={setPhotos}
                  />
                </div>
              )}

              {/* Name */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    isDining
                      ? "e.g., Blue Bayou dinner"
                      : isShopping
                        ? "e.g., Mickey ears for the kids"
                        : "e.g., Rain poncho"
                  }
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none
                             border border-white/10 focus:border-[var(--color-accent-prepare)]
                             transition-colors duration-200"
                  style={inputStyle}
                  autoFocus={!showPhoto}
                />
              </div>

              {/* Category */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Category
                </label>
                <CategoryPicker
                  categories={categories}
                  value={category}
                  onChange={setCategory}
                  accentColor={ACCENT}
                />
              </div>

              {/* Dining-specific fields */}
              {isDining && (
                <>
                  {/* Dining Type toggle */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Dining Type
                    </label>
                    <div className="flex gap-2">
                      {(["walk-up", "reservation", "mobile-order"] as const).map((dt) => (
                        <button
                          key={dt}
                          onClick={() => setDiningType(dt)}
                          className="flex-1 px-3 py-2 rounded-full text-sm font-medium cursor-pointer
                                     transition-all duration-200"
                          style={{
                            backgroundColor: diningType === dt ? ACCENT : "var(--color-bg-deep)",
                            color:           diningType === dt ? "var(--color-bg-deep)" : "var(--color-text-muted)",
                            border:          diningType === dt ? `2px solid ${ACCENT}` : "2px solid transparent",
                          }}
                        >
                          {dt === "walk-up" ? "Walk-up" : dt === "reservation" ? "Reservation" : "Mobile Order"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time field — shown for reservation and mobile order */}
                  {(diningType === "reservation" || diningType === "mobile-order") && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label
                          className="block text-sm font-medium mb-1.5"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          Time
                        </label>
                        <input
                          type="text"
                          value={reservationTime}
                          onChange={(e) => setReservationTime(e.target.value)}
                          placeholder="e.g., 6:30 PM"
                          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none
                                     border border-white/10 focus:border-[var(--color-accent-prepare)]
                                     transition-colors duration-200"
                          style={inputStyle}
                        />
                      </div>
                      {/* Confirmation # only for reservations */}
                      {diningType === "reservation" && (
                        <div className="flex-1">
                          <label
                            className="block text-sm font-medium mb-1.5"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            Confirmation #
                          </label>
                          <input
                            type="text"
                            value={reservationConfirmation}
                            onChange={(e) => setReservationConfirmation(e.target.value)}
                            placeholder="ABC123"
                            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none
                                       border border-white/10 focus:border-[var(--color-accent-prepare)]
                                       transition-colors duration-200"
                            style={inputStyle}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Party Size */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Party Size
                    </label>
                    <input
                      type="number"
                      value={partySize ?? ""}
                      onChange={(e) =>
                        setPartySize(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      min={1}
                      placeholder="e.g., 4"
                      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none
                                 border border-white/10 focus:border-[var(--color-accent-prepare)]
                                 transition-colors duration-200"
                      style={inputStyle}
                    />
                  </div>

                  {/* Dietary Notes */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Dietary Notes
                    </label>
                    <textarea
                      value={dietaryNotes}
                      onChange={(e) => setDietaryNotes(e.target.value)}
                      placeholder="Allergies, dietary restrictions..."
                      rows={2}
                      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none
                                 border border-white/10 focus:border-[var(--color-accent-prepare)]
                                 transition-colors duration-200"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {/* Notes */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tips, reminders..."
                  rows={2}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none
                             border border-white/10 focus:border-[var(--color-accent-prepare)]
                             transition-colors duration-200"
                  style={inputStyle}
                />
              </div>

              {/* Priority */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Priority
                </label>
                <PriorityPicker value={priority} onChange={setPriority} />
              </div>

              {/* Shopping-only fields */}
              {isShopping && (
                <>
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Price (optional)
                    </label>
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g., $29.99"
                      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none
                                 border border-white/10 focus:border-[var(--color-accent-prepare)]
                                 transition-colors duration-200"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Link (optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none
                                   border border-white/10 focus:border-[var(--color-accent-prepare)]
                                   transition-colors duration-200"
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={handlePaste}
                        className="px-3 py-2.5 rounded-lg text-xs font-medium border border-white/10
                                   cursor-pointer hover:border-white/20 transition-colors duration-150"
                        style={{
                          backgroundColor: "var(--color-bg-deep)",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        Paste
                      </button>
                      {url.trim() && (
                        <a
                          href={url.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2.5 rounded-lg text-xs font-medium border border-white/10
                                     hover:border-white/20 transition-colors duration-150
                                     flex items-center"
                          style={{
                            backgroundColor: "var(--color-bg-deep)",
                            color: ACCENT,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open {"\u2197"}
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Linked Wishes (all types) */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Linked Wishes
                </label>
                <WishLinker
                  linkedWishIds={linkedWishIds}
                  onChange={setLinkedWishIds}
                />
              </div>

              {/* Park Data Linker (shopping + dining) */}
              {showParkDataLinker && (
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {isDining ? "Restaurants" : "Shops & Restaurants"}
                  </label>
                  <ParkDataLinker
                    linkedParkDataIds={linkedParkDataIds}
                    onChange={setLinkedParkDataIds}
                    filterTypes={isDining ? ["dining"] : ["shop", "dining"]}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer
                           transition-colors duration-200 hover:bg-white/5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {/* Delete / Remove (edit mode only) */}
                {isEditMode && (onUnselectFromTrip || onDeleteForever) && (
                  <>
                    {deleteStep === "choose" ? (
                      <div className="flex items-center gap-1.5">
                        {onUnselectFromTrip && (
                          <button
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await onUnselectFromTrip();
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving}
                            className="px-2.5 py-1.5 rounded-full text-[11px] font-medium cursor-pointer
                                       transition-colors duration-200"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--color-accent-preview) 12%, transparent)",
                              color: "var(--color-accent-preview)",
                            }}
                          >
                            This trip
                          </button>
                        )}
                        {onDeleteForever && (
                          <button
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await onDeleteForever();
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving}
                            className="px-2.5 py-1.5 rounded-full text-[11px] font-medium cursor-pointer
                                       transition-colors duration-200"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
                              color: "var(--color-error)",
                            }}
                          >
                            Forever
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteStep(null)}
                          className="px-2.5 py-1.5 rounded-full text-[11px] font-medium cursor-pointer
                                     transition-colors duration-200 hover:bg-white/5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteStep("choose")}
                        className="px-3 py-2 rounded-full text-xs font-medium cursor-pointer
                                   transition-colors duration-200 hover:bg-white/5"
                        style={{ color: "var(--color-error)" }}
                      >
                        Remove
                      </button>
                    )}
                  </>
                )}

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="px-5 py-2 rounded-full text-sm font-semibold cursor-pointer
                             transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                             hover:brightness-110"
                  style={{
                    backgroundColor: ACCENT,
                    color: "var(--color-bg-deep)",
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
