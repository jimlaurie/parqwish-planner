"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import { useAppStore } from "@/lib/store";
import ThemeToggle from "@/components/ThemeToggle";
import SyncStatusIndicator from "@/components/SyncStatusIndicator";

// ==================== TYPES ====================

type NavPhase = "home" | "catalog" | "plan" | "prepare" | "preview" | "play" | "publish" | "guide";

interface NavLink {
  id: NavPhase;
  label: string;
  icon: string;
  href: string;
  accent: string;
  requiresTrip: boolean;
}

// ==================== CONFIG ====================

const NAV_LINKS: NavLink[] = [
  { id: "home", label: "Home", icon: "\u{1F3E0}", href: "/", accent: "var(--color-gold)", requiresTrip: false },
  { id: "plan", label: "Plan", icon: "\u{1F3F0}", href: "/plan", accent: "var(--color-accent-plan)", requiresTrip: true },
  { id: "preview", label: "Preview", icon: "\u{1F525}", href: "/preview", accent: "var(--color-accent-preview)", requiresTrip: true },
  { id: "prepare", label: "Prepare", icon: "\u{1F392}", href: "/prepare", accent: "var(--color-accent-prepare)", requiresTrip: true },
  { id: "play", label: "Play", icon: "\u{1F504}", href: "/play", accent: "var(--color-accent-play)", requiresTrip: false },
  { id: "publish", label: "Publish", icon: "\u{1F680}", href: "/publish", accent: "var(--color-accent-publish)", requiresTrip: true },
  { id: "catalog", label: "Catalog", icon: "\u{1F4E6}", href: "/catalog", accent: "var(--color-accent-catalog)", requiresTrip: false },
  { id: "guide",   label: "Guide",   icon: "\u{1F4D6}", href: "/guide",   accent: "var(--color-gold)",           requiresTrip: false },
];

// ==================== COMPONENT ====================

export default function TopNavBar() {
  const pathname = usePathname();
  const { currentTripId } = useAppStore();

  // Load current trip for display
  const currentTrip = useLiveQuery(
    () => (currentTripId ? db.trips.get(currentTripId) : undefined),
    [currentTripId]
  );

  // A collaborator landing on an invite link hasn't joined a trip yet and
  // may never have seen this app before — the full 8-item nav (mostly
  // trip-gated and irrelevant to them) is confusing clutter that pushes the
  // actual invite content below the fold on a phone. Skip it there. Placed
  // after all hooks so hook call order stays identical across renders.
  if (pathname === "/join") return null;

  // Determine active phase from pathname
  const activePhase: NavPhase = (() => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/catalog")) return "catalog";
    if (pathname.startsWith("/plan")) return "plan";
    if (pathname.startsWith("/prepare")) return "prepare";
    if (pathname.startsWith("/preview")) return "preview";
    if (pathname.startsWith("/play")) return "play";
    if (pathname.startsWith("/publish")) return "publish";
    if (pathname.startsWith("/guide"))   return "guide";
    return "home";
  })();

  // Format trip date range
  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return "";
    const s = new Date(start + "T12:00:00");
    const e = new Date(end + "T12:00:00");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (s.getMonth() === e.getMonth()) {
      return `${months[s.getMonth()]} ${s.getDate()}\u2013${e.getDate()}`;
    }
    return `${months[s.getMonth()]} ${s.getDate()} \u2013 ${months[e.getMonth()]} ${e.getDate()}`;
  };

  return (
    <nav
      className="sticky top-0 z-40 w-full backdrop-blur-md"
      style={{
        backgroundColor: "var(--color-nav-bg)",
        borderBottom: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--color-card-shadow) 0 1px 3px",
      }}
    >
      <div className="max-w-7xl mx-auto px-2 md:px-4">
        <div className="flex items-center gap-2 md:gap-4 h-14">
          {/* LEFT: Logo + trip info */}
          <div className="hidden md:flex items-center gap-2 min-w-0 shrink-0">
            <Link href="/">
              <Image
                src="/images/parqwish-logo.png"
                alt="ParQwish"
                width={120}
                height={30}
                className="h-7 w-auto"
                style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}
                priority
              />
            </Link>
            {currentTrip && (
              <div className="flex flex-col min-w-0">
                <span
                  className="text-sm font-bold truncate max-w-[160px]"
                  style={{ color: "var(--color-heading)" }}
                >
                  {currentTrip.name}
                </span>
                {currentTrip.startDate && (
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    {formatDateRange(currentTrip.startDate, currentTrip.endDate)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* CENTER: Nav links — wrap on small screens */}
          <div className="flex-1 flex items-center justify-center flex-wrap gap-0.5 md:gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = activePhase === link.id;
              const disabled = link.requiresTrip && !currentTripId;

              return (
                <Link
                  key={link.id}
                  href={disabled ? "#" : link.href}
                  aria-disabled={disabled}
                  aria-label={disabled ? `${link.label} — select a trip first` : link.label}
                  onClick={(e) => {
                    if (disabled) e.preventDefault();
                  }}
                  className={`flex items-center gap-0.5 md:gap-1 px-1.5 md:px-3 py-1 md:py-1.5 rounded-full
                             text-[11px] md:text-sm font-medium whitespace-nowrap
                             transition-all duration-200
                             ${disabled ? "opacity-30 cursor-default" : ""}
                             ${isActive ? "" : disabled ? "" : "hover:bg-white/5"}`}
                  style={{
                    color: isActive ? link.accent : "var(--color-text-muted)",
                    backgroundColor: isActive
                      ? `color-mix(in srgb, ${link.accent} 15%, transparent)`
                      : "transparent",
                    transform: isActive ? "scale(1.05)" : undefined,
                  }}
                >
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* RIGHT: Sync status + theme toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <SyncStatusIndicator />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
