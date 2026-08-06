"use client";

import { useMemo, useState } from "react";
import { useParkData } from "@/hooks/use-park-data";
import { useTripWishes } from "@/hooks/use-trip-wishes";
import { PARK_DATA_TYPE_TO_TAG } from "@/lib/park-data";
import type { ParkDataItem } from "@/lib/park-data";
import ScheduleTipModal from "@/components/ScheduleTipModal";

const SCHEDULE_TIP_SEEN_KEY = "parqwish_seen_schedule_tip";

const ACCENT = "var(--color-accent-plan)";

// ==================== TYPES ====================

type TabType = ParkDataItem["type"];

interface Tab {
  id: TabType;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: "ride",   label: "Rides",  icon: "🎢" },
  { id: "show",   label: "Shows",  icon: "🎭" },
  { id: "dining", label: "Dining", icon: "🍽️" },
  { id: "shop",   label: "Shops",  icon: "🛍️" },
  { id: "place",  label: "Places", icon: "📍" },
];

// Matches PARK_LABELS values (web/src/lib/park-data.ts) — the exact strings
// item.park holds. Unmatched park names sort last rather than being dropped.
const PARK_DISPLAY_ORDER = ["Disneyland", "California Adventure", "Downtown Disney", "Hotels", "Disneyland Resort"];

// ==================== DETAIL PANEL ====================

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const isOpen = status === "operating";
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
      style={{
        backgroundColor: isOpen
          ? "color-mix(in srgb, var(--color-success) 15%, transparent)"
          : "color-mix(in srgb, var(--color-error) 15%, transparent)",
        color: isOpen ? "var(--color-success)" : "var(--color-error)",
      }}
    >
      {status === "operating" ? "Open" : status}
    </span>
  );
}

function DetailChips({ items, color }: { items: string[]; color?: string }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map((item) => (
        <span
          key={item}
          className="text-[10px] px-2 py-0.5 rounded-full capitalize"
          style={{
            backgroundColor: "var(--color-surface-raised)",
            color: color ?? "var(--color-text-muted)",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs">
      <span style={{ color: "var(--color-text-dim)", minWidth: 80 }}>{label}</span>
      <span style={{ color: "var(--color-text-primary)" }}>{value}</span>
    </div>
  );
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function ItemDetail({ item }: {
  item: ParkDataItem;
}) {
  const rows: React.ReactNode[] = [];

  if (item.status) {
    rows.push(<DetailRow key="status" label="Status" value={<StatusBadge status={item.status} />} />);
  }

  if (item.type === "ride") {
    if (item.rideType) rows.push(<DetailRow key="rideType" label="Type" value={item.rideType} />);
    if (item.heightCm != null) {
      const inches = Math.round(item.heightCm / 2.54);
      rows.push(<DetailRow key="height" label="Height" value={`${item.heightCm} cm (${inches}")`} />);
    } else if (item.heightRequirement) {
      rows.push(<DetailRow key="heightReq" label="Height" value={item.heightRequirement} />);
    }
    if (item.hasLL != null) {
      rows.push(<DetailRow key="ll" label="Lightning Lane" value={item.hasLL ? "Yes" : "No"} />);
    }
    if (item.warnings?.length) {
      rows.push(
        <div key="warn" className="flex gap-2 text-xs">
          <span style={{ color: "var(--color-text-dim)", minWidth: 80 }}>Warnings</span>
          <DetailChips items={item.warnings} />
        </div>
      );
    }
    if (item.closureReason) {
      rows.push(<DetailRow key="close" label="Note" value={item.closureReason} />);
    }
  }

  if (item.type === "show") {
    if (item.showTypes?.length) {
      rows.push(
        <div key="showType" className="flex gap-2 text-xs items-start">
          <span style={{ color: "var(--color-text-dim)", minWidth: 80 }}>Type</span>
          <DetailChips items={item.showTypes} />
        </div>
      );
    }
    if (item.duration != null) {
      rows.push(<DetailRow key="dur" label="Duration" value={`${item.duration} min`} />);
    }
    if (item.timeRanges?.length) {
      const rangeStr = item.timeRanges
        .map((r) => `${formatTime(r.start)} – ${formatTime(r.end)}`)
        .join(", ");
      rows.push(<DetailRow key="hours" label="Hours" value={rangeStr} />);
    } else if (item.times?.length) {
      rows.push(<DetailRow key="times" label="Times" value={item.times.map(formatTime).join(", ")} />);
    }
  }

  if (item.type === "dining") {
    if (item.diningType) rows.push(<DetailRow key="dType" label="Service" value={item.diningType} />);
    if (item.cuisine) rows.push(<DetailRow key="cuisine" label="Cuisine" value={item.cuisine} />);
    const needsRes = item.requiresReservations ?? (item.reservations === true);
    rows.push(<DetailRow key="res" label="Reservations" value={needsRes ? "Required" : "Not required"} />);
    if (item.url || item.menuUrl || item.reservationUrl) {
      rows.push(
        <div key="links" className="flex flex-wrap gap-2 pt-0.5">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--color-surface-raised)", color: ACCENT }}
              onClick={(e) => e.stopPropagation()}
            >
              🔗 Info
            </a>
          )}
          {item.menuUrl && (
            <a
              href={item.menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--color-surface-raised)", color: ACCENT }}
              onClick={(e) => e.stopPropagation()}
            >
              🍽️ Menu
            </a>
          )}
          {item.reservationUrl && (
            <a
              href={item.reservationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--color-surface-raised)", color: ACCENT }}
              onClick={(e) => e.stopPropagation()}
            >
              📅 Reserve
            </a>
          )}
        </div>
      );
    }
  }

  if (item.type === "shop") {
    if (item.shopType) rows.push(<DetailRow key="shopType" label="Type" value={item.shopType} />);
    if (item.hours) rows.push(<DetailRow key="hours" label="Hours" value={item.hours} />);
    if (item.acceptsAPDiscount != null) {
      rows.push(<DetailRow key="ap" label="AP Discount" value={item.acceptsAPDiscount ? "Yes" : "No"} />);
    }
    if (item.description) {
      rows.push(
        <div key="desc" className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {item.description}
        </div>
      );
    }
    if (item.merchandiseCategories?.length) {
      rows.push(
        <div key="merch" className="flex gap-2 text-xs items-start">
          <span style={{ color: "var(--color-text-dim)", minWidth: 80 }}>Sells</span>
          <DetailChips items={item.merchandiseCategories} />
        </div>
      );
    }
    if (item.notableItems) {
      rows.push(
        <div key="notable" className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          <span style={{ color: "var(--color-text-dim)" }}>Notable: </span>
          {item.notableItems}
        </div>
      );
    }
  }

  if (item.type === "place") {
    if (item.category) rows.push(<DetailRow key="cat" label="Category" value={item.category} />);
    if (item.description) {
      rows.push(
        <div key="desc" className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {item.description}
        </div>
      );
    }
  }

  return (
    <div
      className="mt-1 mx-1 rounded-lg p-3"
      style={{ backgroundColor: "var(--color-surface-sunken)", borderLeft: `3px solid ${ACCENT}` }}
    >
      <div className="flex flex-col gap-1.5">
        {rows.length > 0 ? rows : (
          <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>No additional details available.</p>
        )}
      </div>
    </div>
  );
}

// ==================== LIST ROW ====================

function CatalogRow({ item, alreadyAdded, selected, pending, onSelect, onAdd, onRemove }: {
  item: ParkDataItem;
  alreadyAdded: boolean;
  selected: boolean;
  pending: boolean;
  onSelect: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const tab = TABS.find((t) => t.id === item.type);
  return (
    <div>
      {/* Clickable row — clicking anywhere except the + Plan button toggles the detail */}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors"
        style={{
          backgroundColor: alreadyAdded
            ? `color-mix(in srgb, ${ACCENT} 8%, transparent)`
            : selected
            ? `color-mix(in srgb, ${ACCENT} 10%, transparent)`
            : "var(--color-surface-sunken)",
          borderLeft: alreadyAdded
            ? `3px solid ${ACCENT}`
            : selected
            ? `3px solid ${ACCENT}`
            : "3px solid transparent",
        }}
      >
        {/* Icon */}
        <span className="text-sm flex-shrink-0">{tab?.icon}</span>

        {/* Name + land */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm truncate font-medium"
            style={{ color: alreadyAdded ? ACCENT : "var(--color-text-primary)" }}
          >
            {item.name}
          </p>
          <p className="text-[10px] truncate" style={{ color: "var(--color-text-dim)" }}>
            {item.land}
            {item.status && item.status !== "operating" && (
              <span
                className="ml-1.5 font-semibold capitalize"
                style={{ color: "var(--color-error)" }}
              >
                · {item.status}
              </span>
            )}
          </p>
        </div>

        {/* Right side: Plan button + expand chevron */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {alreadyAdded ? (
            <div className="flex items-center gap-1">
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${ACCENT} 18%, transparent)`,
                  color: ACCENT,
                }}
              >
                ✓ In Plan
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                disabled={pending}
                aria-label="Remove from plan"
                title="Remove from plan"
                className="flex items-center justify-center w-5 h-5 rounded-full text-[11px]
                           cursor-pointer transition-all duration-150 hover:opacity-100 opacity-50
                           hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
                  color: "var(--color-error)",
                  opacity: pending ? 0.4 : undefined,
                }}
              >
                {pending ? "…" : "×"}
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              disabled={pending}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0
                         cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-95
                         disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100"
              style={{
                backgroundColor: ACCENT,
                color: "var(--color-bg-deep)",
                opacity: pending ? 0.6 : 1,
              }}
            >
              {pending ? "Adding…" : "+ Plan"}
            </button>
          )}
          <span
            className="text-[10px] w-4 text-center"
            style={{ color: selected ? ACCENT : "var(--color-text-dim)" }}
          >
            {selected ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {selected && (
        <ItemDetail item={item} />
      )}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function CatalogBrowser() {
  const { items, loading } = useParkData();
  const { allWishes, addOrSelectWish, unselectWish } = useTripWishes();

  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("ride");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [showScheduleTip, setShowScheduleTip] = useState(false);
  const [parksExpanded, setParksExpanded] = useState(false);
  const [selectedParks, setSelectedParks] = useState<Set<string>>(new Set());

  // Map parkDataId → wish.id so we can unselect by wish ID
  const parkDataIdToWishId = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of allWishes) {
      if (w.parkDataId) map.set(w.parkDataId, w.id);
    }
    return map;
  }, [allWishes]);

  const addedParkDataIds = useMemo(
    () => new Set(parkDataIdToWishId.keys()),
    [parkDataIdToWishId]
  );

  const tabItems = useMemo(
    () => items.filter((item) => item.type === activeTab),
    [items, activeTab]
  );

  // Parks present in the current tab — independent of search text, so the
  // chip list doesn't shift around as the user types.
  const availableParks = useMemo(() => {
    const set = new Set(tabItems.map((item) => item.park));
    return Array.from(set).sort((a, b) => {
      const idxA = PARK_DISPLAY_ORDER.indexOf(a);
      const idxB = PARK_DISPLAY_ORDER.indexOf(b);
      return (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB);
    });
  }, [tabItems]);

  const toggleParkFilter = (park: string) => {
    setSelectedParks((prev) => {
      const next = new Set(prev);
      if (next.has(park)) next.delete(park);
      else next.add(park);
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = tabItems;
    if (selectedParks.size > 0) {
      result = result.filter((item) => selectedParks.has(item.park));
    }
    if (q) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.land.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tabItems, searchQuery, selectedParks]);

  const groupedByPark = useMemo(() => {
    const groups: Record<string, ParkDataItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.park]) groups[item.park] = [];
      groups[item.park].push(item);
    }
    return groups;
  }, [filteredItems]);

  const withPending = async (itemId: string, op: () => Promise<void>) => {
    setPendingIds((prev) => new Set(prev).add(itemId));
    try {
      await op();
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleAdd = (item: ParkDataItem) => withPending(item.id, async () => {
    // addOrSelectWish reuses an existing wish for this catalog item rather
    // than creating a duplicate — the existence check and the write happen
    // in one transaction, so this is safe even if this fires twice in a row.
    const tag = PARK_DATA_TYPE_TO_TAG[item.type];
    await addOrSelectWish({
      title: item.name,
      tags: [tag],
      priority: "B",
      parkDataId: item.id,
      parkDataName: item.name,
      park: item.park,
      land: item.land,
    });

    if (tag === "shows" || tag === "eats") {
      try {
        if (!localStorage.getItem(SCHEDULE_TIP_SEEN_KEY)) {
          setShowScheduleTip(true);
        }
      } catch {
        // localStorage blocked — skip the tip rather than show it every time
      }
    }
  });

  const handleRemove = (item: ParkDataItem) => withPending(item.id, async () => {
    const wishId = parkDataIdToWishId.get(item.id);
    if (wishId) await unselectWish(wishId);
  });

  const totalCount = useMemo(() => items.length, [items]);

  if (loading) return null;

  return (
    <div className="mb-6">
      {/* Heading */}
      <div
        className="flex items-center gap-2 text-sm font-semibold mb-2"
        style={{ color: ACCENT }}
      >
        <span>🏰 Browse Park Catalog</span>
        <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>
          ({totalCount})
        </span>
      </div>

      <div
        className="rounded-xl border"
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {/* Tabs — always visible */}
        <div
          className="flex border-b"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {TABS.map((tab) => {
            const count = items.filter((i) => i.type === tab.id).length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedId(null); setSearchQuery(""); setSelectedParks(new Set()); }}
                className="flex-1 flex flex-col items-center py-2.5 text-xs font-medium
                           cursor-pointer transition-all duration-150"
                style={{
                  color: isActive ? ACCENT : "var(--color-text-muted)",
                  borderBottom: isActive ? `2px solid ${ACCENT}` : "2px solid transparent",
                  backgroundColor: isActive
                    ? `color-mix(in srgb, ${ACCENT} 6%, transparent)`
                    : "transparent",
                }}
              >
                <span className="text-base leading-none mb-0.5">{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className="text-[9px] mt-0.5"
                  style={{ color: isActive ? ACCENT : "var(--color-text-dim)" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search — always visible */}
        <div className="px-3 pt-3 pb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedId(null); }}
            placeholder={`Search ${TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}…`}
            aria-label={`Search ${activeTab}s`}
            className="w-full px-3 py-1.5 rounded-lg text-xs outline-none border transition-colors"
            style={{
              backgroundColor: "var(--color-surface-sunken)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-border-input)",
            }}
          />
        </div>

        {/* List toggle — list itself collapses by default */}
        <button
          onClick={() => { setExpanded(!expanded); setSelectedId(null); }}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold cursor-pointer
                     transition-colors hover:opacity-80 border-t"
          style={{ color: ACCENT, borderColor: "var(--color-border-subtle)" }}
        >
          <span>{expanded ? "▼" : "▶"}</span>
          <span>{expanded ? "Hide results" : "Show results"}</span>
          <span className="text-[10px]" style={{ color: "var(--color-text-dim)" }}>
            ({filteredItems.length})
          </span>
        </button>

        {expanded && availableParks.length > 1 && (
          <div className="border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
            <button
              onClick={() => setParksExpanded(!parksExpanded)}
              className="flex items-center gap-2 w-full pl-6 pr-3 py-1.5 text-[11px] font-semibold cursor-pointer
                         transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-dim)" }}
            >
              <span>{parksExpanded ? "▼" : "▶"}</span>
              <span>Parks</span>
              {selectedParks.size > 0 && (
                <span className="text-[10px]" style={{ color: ACCENT }}>
                  ({selectedParks.size} selected)
                </span>
              )}
            </button>

            {parksExpanded && (
              <div className="flex flex-wrap items-center gap-1.5 pl-6 pr-3 pb-2">
                {availableParks.map((park) => {
                  const isSelected = selectedParks.has(park);
                  return (
                    <button
                      key={park}
                      onClick={() => toggleParkFilter(park)}
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? `color-mix(in srgb, ${ACCENT} 18%, transparent)`
                          : "var(--color-surface-raised)",
                        color: isSelected ? ACCENT : "var(--color-text-muted)",
                        border: `1px solid ${isSelected ? ACCENT : "var(--color-border-subtle)"}`,
                      }}
                    >
                      {park}
                    </button>
                  );
                })}
                {selectedParks.size > 0 && (
                  <button
                    onClick={() => setSelectedParks(new Set())}
                    className="text-[10px] px-2 py-1 cursor-pointer transition-colors hover:opacity-80"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {expanded && (
          <div className="px-3 pb-3 max-h-[480px] overflow-y-auto flex flex-col gap-4">
            {Object.entries(groupedByPark).length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--color-text-dim)" }}>
                No results for &ldquo;{searchQuery}&rdquo;
              </p>
            ) : (
              Object.entries(groupedByPark)
                .sort(([parkA], [parkB]) => {
                  const idxA = PARK_DISPLAY_ORDER.indexOf(parkA);
                  const idxB = PARK_DISPLAY_ORDER.indexOf(parkB);
                  return (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB);
                })
                .map(([park, parkItems]) => (
                <div key={park}>
                  <h4
                    className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    {park} &middot; {parkItems.length}
                  </h4>
                  <div className="flex flex-col gap-1">
                    {parkItems.map((item) => (
                      <CatalogRow
                        key={item.id}
                        item={item}
                        alreadyAdded={addedParkDataIds.has(item.id)}
                        selected={selectedId === item.id}
                        pending={pendingIds.has(item.id)}
                        onSelect={() => setSelectedId(selectedId === item.id ? null : item.id)}
                        onAdd={() => handleAdd(item)}
                        onRemove={() => handleRemove(item)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <ScheduleTipModal
        visible={showScheduleTip}
        onClose={() => {
          setShowScheduleTip(false);
          try {
            localStorage.setItem(SCHEDULE_TIP_SEEN_KEY, "1");
          } catch {
            // ignore — worst case the tip shows again next time
          }
        }}
      />
    </div>
  );
}
