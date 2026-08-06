"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import db, { type Wish } from "@/lib/db";
import PriorityPicker from "@/components/PriorityPicker";
import TagSelector from "@/components/TagSelector";
import PhotoPicker from "@/components/PhotoPicker";
import ParkDataAutocomplete, { PARK_DATA_TYPE_TO_TAG } from "@/components/ParkDataAutocomplete";
import ParkLandSelector from "@/components/ParkLandSelector";
import { useParkData } from "@/hooks/use-park-data";
import { PACKING_TABS } from "@/lib/constants";
import type { ParkDataItem } from "@/lib/park-data";

export interface WishFormData {
  title: string;
  notes?: string;
  url?: string;
  tags: string[];
  priority: string;
  photos?: string[];
  photoSets?: import("@/lib/db").PhotoSet[];
  parkDataId?: string;
  parkDataName?: string;
  park?: string;
  land?: string;
  maxWaitTime?: number;
}

interface WishFormModalProps {
  visible: boolean;
  wishId?: string;
  getWishById?: (id: string) => Promise<Wish | undefined>;
  onClose: () => void;
  onSave: (data: WishFormData) => Promise<void>;
  onUnselectFromTrip?: () => Promise<void>;
  onDeleteForever?: () => Promise<void>;
}

const TYPE_ICONS: Record<string, string> = {
  ride: "\u{1F3A2}",
  show: "\u{1F3AD}",
  dining: "\u{1F37D}\uFE0F",
  shop: "\u{1F6CD}\uFE0F",
};

const PACKING_TYPE_ICONS: Record<string, string> = {};
for (const tab of PACKING_TABS) {
  PACKING_TYPE_ICONS[tab.id] = tab.icon;
}

export default function WishFormModal({
  visible,
  wishId,
  getWishById,
  onClose,
  onSave,
  onUnselectFromTrip,
  onDeleteForever,
}: WishFormModalProps) {
  const isEditMode = !!wishId;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [priority, setPriority] = useState("C");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoSets, setPhotoSets] = useState<import("@/lib/db").PhotoSet[]>([]);
  const [parkDataId, setParkDataId] = useState<string | undefined>();
  const [parkDataName, setParkDataName] = useState<string | undefined>();
  const [park, setPark] = useState("");
  const [land, setLand] = useState("");
  const [maxWaitTime, setMaxWaitTime] = useState<number | undefined>();
  // Read-only GPS capture, present only on custom places synced from mobile's
  // ParkMap "Create Place" quick-add — never set/edited from this modal.
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [capturedAt, setCapturedAt] = useState<string | undefined>();
  const [parkDataSearch, setParkDataSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteMode, setDeleteMode] = useState<null | "choose" | "confirm-forever">(null);

  const focusRef = useFocusTrap(visible, onClose);
  const { items: parkData } = useParkData();

  // Resolve linked park data item for display
  const linkedParkDataItem = parkDataId
    ? parkData.find((item) => item.id === parkDataId)
    : undefined;

  // Referenced by: packing items that link to this wish (edit mode only)
  const referencedByItems = useLiveQuery(
    async () => {
      if (!wishId) return [];
      const allItems = await db.packingItems.toArray();
      return allItems.filter((item) => item.linkedWishIds?.includes(wishId));
    },
    [wishId]
  );

  // Load existing wish data in edit mode
  const loadWish = useCallback(async () => {
    if (wishId && getWishById) {
      const wish = await getWishById(wishId);
      if (wish) {
        setTitle(wish.title);
        setNotes(wish.notes ?? "");
        setUrl(wish.url ?? "");
        setTags(wish.tags ?? []);
        setPriority(wish.priority ?? "C");
        setPhotos(wish.photos ?? []);
        setPhotoSets(wish.photoSets ?? []);
        setParkDataId(wish.parkDataId);
        setParkDataName(wish.parkDataName);
        setPark(wish.park ?? "");
        setLand(wish.land ?? "");
        setMaxWaitTime(wish.maxWaitTime);
        setLatitude(wish.latitude);
        setLongitude(wish.longitude);
        setCapturedAt(wish.capturedAt);
      }
    }
  }, [wishId, getWishById]);

  useEffect(() => {
    if (visible && isEditMode) {
      loadWish();
    } else if (visible && !isEditMode) {
      setTitle("");
      setNotes("");
      setUrl("");
      setTags([]);
      setPriority("C");
      setPhotos([]);
      setPhotoSets([]);
      setParkDataId(undefined);
      setParkDataName(undefined);
      setPark("");
      setLand("");
      setMaxWaitTime(undefined);
      setLatitude(undefined);
      setLongitude(undefined);
      setCapturedAt(undefined);
      setParkDataSearch("");
    }
    setDeleteMode(null);
  }, [visible, isEditMode, loadWish]);

  const canSave = title.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        notes: notes.trim() || undefined,
        url: url.trim() || undefined,
        tags,
        priority,
        photos: photoSets.length > 0
          ? photoSets.map((ps) => ps.thumbnail)
          : photos.length > 0 ? photos : undefined,
        photoSets: photoSets.length > 0 ? photoSets : undefined,
        parkDataId: parkDataId || undefined,
        parkDataName: parkDataName || undefined,
        park: park || undefined,
        land: land || undefined,
        maxWaitTime: maxWaitTime || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleParkDataSelect = (item: ParkDataItem) => {
    setParkDataId(item.id);
    setParkDataName(item.name);
    setPark(item.park);
    setLand(item.land);
    setParkDataSearch("");
    const autoTag = PARK_DATA_TYPE_TO_TAG[item.type];
    if (autoTag && !tags.includes(autoTag)) {
      setTags([...tags, autoTag]);
    }
  };

  const handleClearParkDataLink = () => {
    setParkDataId(undefined);
    setParkDataSearch("");
  };

  const handleUnselectFromTrip = async () => {
    if (onUnselectFromTrip) {
      setSaving(true);
      try {
        await onUnselectFromTrip();
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeleteForever = async () => {
    if (onDeleteForever) {
      setSaving(true);
      try {
        await onDeleteForever();
      } finally {
        setSaving(false);
      }
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
            aria-label={isEditMode ? "Edit Wish" : "Add Wish"}
          >
            {/* Header */}
            <h2
              className="text-xl font-bold mb-5"
              style={{ color: "var(--color-gold)" }}
            >
              {"\u2B50"} {isEditMode ? "Edit Wish" : "Add Wish"}
            </h2>

            {/* Form */}
            <div className="flex flex-col gap-4">
              {/* Photos */}
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

              {/* Title — plain text */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  What do you wish for? *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Ride Space Mountain, Try Dole Whip..."
                  autoFocus
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none
                             border border-white/10 focus:border-[var(--color-gold)]
                             transition-colors duration-200"
                  style={{
                    backgroundColor: "var(--color-bg-deep)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              {/* Park Data Link (optional) */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Link to Park Location
                </label>
                {parkDataId && linkedParkDataItem ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--color-gold) 12%, transparent)",
                        color: "var(--color-gold)",
                      }}
                    >
                      {TYPE_ICONS[linkedParkDataItem.type] ?? ""}{" "}
                      {linkedParkDataItem.name}
                      <span className="opacity-60">
                        {linkedParkDataItem.park}
                      </span>
                    </span>
                    <button
                      onClick={handleClearParkDataLink}
                      className="text-xs cursor-pointer hover:opacity-70"
                      style={{ color: "var(--color-error)" }}
                      aria-label="Remove park location link"
                    >
                      {"\u2715"}
                    </button>
                  </div>
                ) : (
                  <ParkDataAutocomplete
                    value={parkDataSearch}
                    onChange={setParkDataSearch}
                    onSelect={handleParkDataSelect}
                    placeholder="Search rides, shows, dining, shops..."
                  />
                )}
              </div>

              {/* Park & Land */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Park & Land
                </label>
                <ParkLandSelector
                  park={park}
                  land={land}
                  onParkChange={setPark}
                  onLandChange={setLand}
                />
                {/* Coordinates from park data — hidden by default, future: Settings toggle
                {linkedParkDataItem && linkedParkDataItem.latitude != null && linkedParkDataItem.longitude != null && (
                  <div
                    className="mt-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--color-gold) 6%, transparent)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Coordinates: {linkedParkDataItem.latitude.toFixed(7)}, {linkedParkDataItem.longitude.toFixed(7)}
                  </div>
                )}
                */}
              </div>

              {/* Max Wait Time — shown when tagged as a ride or linked to a ride */}
              {(tags.includes("ride") || linkedParkDataItem?.type === "ride") && (
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Max Wait Time (minutes)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={maxWaitTime ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMaxWaitTime(v ? parseInt(v, 10) : undefined);
                      }}
                      min={0}
                      max={300}
                      placeholder="e.g., 45"
                      className="w-32 rounded-lg px-3 py-2.5 text-sm outline-none
                                 border border-white/10 focus:border-[var(--color-gold)]
                                 transition-colors duration-200"
                      style={{
                        backgroundColor: "var(--color-bg-deep)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-text-dim)" }}
                    >
                      Skip if wait exceeds this
                    </span>
                  </div>
                </div>
              )}

              {/* URL */}
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
                               border border-white/10 focus:border-[var(--color-gold)]
                               transition-colors duration-200"
                    style={{
                      backgroundColor: "var(--color-bg-deep)",
                      color: "var(--color-text-primary)",
                    }}
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
                        color: "var(--color-gold)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open {"\u2197"}
                    </a>
                  )}
                </div>
              </div>

              {/* GPS capture — only present on custom places created via mobile's
                  ParkMap "Create Place" quick-add; read-only, never edited here. */}
              {latitude !== undefined && longitude !== undefined && (
                <div
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: "var(--color-surface-sunken)",
                    color: "var(--color-text-dim)",
                  }}
                >
                  {"\u{1F4CD}"} GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  {capturedAt && ` · captured ${new Date(capturedAt).toLocaleDateString()}`}
                </div>
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
                             border border-white/10 focus:border-[var(--color-gold)]
                             transition-colors duration-200"
                  style={{
                    backgroundColor: "var(--color-bg-deep)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              {/* Tags */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Tags
                </label>
                <TagSelector value={tags} onChange={setTags} />
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

              {/* Referenced by (edit mode, read-only) */}
              {isEditMode &&
                referencedByItems &&
                referencedByItems.length > 0 && (
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Referenced by
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {referencedByItems.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--color-accent-prepare) 12%, transparent)",
                            color: "var(--color-accent-prepare)",
                          }}
                        >
                          {PACKING_TYPE_ICONS[item.type] ?? ""} {item.name}
                        </span>
                      ))}
                    </div>
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
                {/* Delete (edit mode only) — dual delete */}
                {isEditMode && (onUnselectFromTrip || onDeleteForever) && (
                  <>
                    {deleteMode === "choose" && (
                      <div className="flex items-center gap-1.5">
                        {onUnselectFromTrip && (
                          <button
                            onClick={handleUnselectFromTrip}
                            disabled={saving}
                            className="px-3 py-2 rounded-full text-xs font-medium cursor-pointer
                                       transition-colors duration-200"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)",
                              color: "var(--color-error)",
                            }}
                          >
                            This trip
                          </button>
                        )}
                        {onDeleteForever && (
                          <button
                            onClick={() => setDeleteMode("confirm-forever")}
                            disabled={saving}
                            className="px-3 py-2 rounded-full text-xs font-medium cursor-pointer
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
                          onClick={() => setDeleteMode(null)}
                          className="px-2 py-2 rounded-full text-xs font-medium cursor-pointer
                                     transition-colors duration-200 hover:bg-white/5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {deleteMode === "confirm-forever" && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          Delete from all trips?
                        </span>
                        <button
                          onClick={handleDeleteForever}
                          disabled={saving}
                          className="px-3 py-2 rounded-full text-xs font-medium cursor-pointer
                                     transition-colors duration-200"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
                            color: "var(--color-error)",
                          }}
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setDeleteMode("choose")}
                          className="px-2 py-2 rounded-full text-xs font-medium cursor-pointer
                                     transition-colors duration-200 hover:bg-white/5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          No
                        </button>
                      </div>
                    )}
                    {deleteMode === null && (
                      <button
                        onClick={() => setDeleteMode("choose")}
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
                    backgroundColor: "var(--color-gold)",
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
