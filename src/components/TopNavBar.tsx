"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/lib/db";
import { useAppStore } from "@/lib/store";
import ThemeToggle from "@/components/ThemeToggle";
import SyncStatusIndicator from "@/components/SyncStatusIndicator";
import { marketingUrl } from "@/lib/marketing-links";

// ==================== NAVIGATION ====================
// The five trip phases follow the same journey as the marketing site's
// homepage: Plan → Preview → Prepare → Play → Publish. "Play" is the handoff
// to the park — sending the plan to your phone and keeping your group in
// sync — which is why it gets an explicit hint rather than being left to
// read as "a game" or "an in-park screen".
//
// Desktop (md+): one top bar — logo/trip, phases + Catalog + Help menu,
// sync status + theme toggle.
// Phone (<md): the top bar keeps logo/trip, a "More" menu (Catalog + help
// links) and the toggles;
// the phases move to a fixed bottom tab bar (MobilePhaseBar) instead of
// wrapping the top bar onto two rows. The (app) layout pads <main> so page
// content never sits under that bar.

// ==================== TYPES ====================

type NavPhase = "home" | "plan" | "preview" | "prepare" | "play" | "publish" | "catalog";

interface PhaseLink {
  id: NavPhase;
  label: string;
  icon: string;
  href: string;
  accent: string;
  requiresTrip: boolean;
  /** Tooltip / accessible description, for phases whose name alone is ambiguous. */
  hint?: string;
}

// ==================== CONFIG ====================

const PHASE_LINKS: PhaseLink[] = [
  { id: "home", label: "Home", icon: "\u{1F3E0}", href: "/", accent: "var(--color-gold)", requiresTrip: false },
  { id: "plan", label: "Plan", icon: "⭐", href: "/plan", accent: "var(--color-accent-plan)", requiresTrip: true, hint: "Gather your wishes" },
  { id: "preview", label: "Preview", icon: "\u{1F5D3}️", href: "/preview", accent: "var(--color-accent-preview)", requiresTrip: true, hint: "Lay out each day" },
  { id: "prepare", label: "Prepare", icon: "\u{1F392}", href: "/prepare", accent: "var(--color-accent-prepare)", requiresTrip: true, hint: "Pack and get ready" },
  { id: "play", label: "Play", icon: "\u{1F4F2}", href: "/play", accent: "var(--color-accent-play)", requiresTrip: false, hint: "Send your plan to your phone and keep your group in sync" },
  { id: "publish", label: "Publish", icon: "\u{1F4F8}", href: "/publish", accent: "var(--color-accent-publish)", requiresTrip: true, hint: "Relive the trip" },
];

const CATALOG_LINK: PhaseLink = {
  id: "catalog", label: "Catalog", icon: "\u{1F4E6}", href: "/catalog", accent: "var(--color-accent-catalog)", requiresTrip: false,
};

const HELP_LINKS = [
  { label: "Guide", description: "How everything works", href: marketingUrl("/guide") },
  { label: "Story", description: "Why ParQwish exists", href: marketingUrl("/story") },
  { label: "Blog", description: "What's new", href: marketingUrl("/blog") },
];

// ==================== HELPERS ====================

function getActivePhase(pathname: string): NavPhase {
  if (pathname === "/") return "home";
  for (const id of ["catalog", "plan", "prepare", "preview", "play", "publish"] as const) {
    if (pathname.startsWith(`/${id}`)) return id;
  }
  return "home";
}

function formatDateRange(start?: string, end?: string): string {
  if (!start || !end) return "";
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (s.getMonth() === e.getMonth()) {
    return `${months[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}`;
}

function linkLabel(link: PhaseLink, disabled: boolean): string {
  if (disabled) return `${link.label} — select a trip first`;
  return link.hint ? `${link.label}: ${link.hint}` : link.label;
}

// ==================== TOP BAR LINK ====================

function TopLink({ link, isActive, disabled }: { link: PhaseLink; isActive: boolean; disabled: boolean }) {
  return (
    <Link
      href={disabled ? "#" : link.href}
      aria-disabled={disabled}
      aria-current={isActive ? "page" : undefined}
      aria-label={linkLabel(link, disabled)}
      title={disabled ? "Select a trip first" : link.hint}
      onClick={(e) => { if (disabled) e.preventDefault(); }}
      className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                 transition-all duration-200
                 ${disabled ? "opacity-30 cursor-default" : isActive ? "" : "hover:bg-white/5"}`}
      style={{
        color: isActive ? link.accent : "var(--color-text-muted)",
        backgroundColor: isActive ? `color-mix(in srgb, ${link.accent} 15%, transparent)` : "transparent",
      }}
    >
      {link.label}
    </Link>
  );
}

// ==================== HELP MENU ====================

/** Help links (Guide / Story / Blog). On phones the same menu is labelled
 *  "More" and also carries Catalog, which the desktop bar shows inline. */
function HelpMenu({ label = "Help", includeCatalog = false }: { label?: string; includeCatalog?: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 px-2.5 md:px-3 py-1.5 rounded-full text-xs md:text-sm font-medium
                   whitespace-nowrap cursor-pointer transition-colors duration-200 hover:bg-white/5"
        style={{ color: open ? "var(--color-gold)" : "var(--color-text-muted)" }}
      >
        {label}
        <span aria-hidden="true" className="text-[10px]">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl py-1.5 shadow-lg z-50"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-strong)" }}
        >
          {includeCatalog && (
            <Link
              href={CATALOG_LINK.href}
              onClick={() => setOpen(false)}
              className="flex flex-col px-4 py-2 transition-colors duration-150 hover:bg-white/5"
              style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {CATALOG_LINK.label}
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>Your saved wishes and packing items</span>
            </Link>
          )}
          {HELP_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex flex-col px-4 py-2 transition-colors duration-150 hover:bg-white/5"
            >
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {item.label} <span aria-hidden="true" style={{ color: "var(--color-text-dim)" }}>{"↗"}</span>
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-dim)" }}>{item.description}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== MOBILE PHASE BAR ====================

function MobilePhaseBar({ activePhase, hasTrip }: { activePhase: NavPhase; hasTrip: boolean }) {
  return (
    <nav
      aria-label="Trip phases"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 backdrop-blur-md"
      style={{
        backgroundColor: "var(--color-nav-bg)",
        borderTop: "1px solid var(--color-border-subtle)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex h-14">
        {PHASE_LINKS.map((link) => {
          const isActive = activePhase === link.id;
          const disabled = link.requiresTrip && !hasTrip;
          return (
            <Link
              key={link.id}
              href={disabled ? "#" : link.href}
              aria-disabled={disabled}
              aria-current={isActive ? "page" : undefined}
              aria-label={linkLabel(link, disabled)}
              onClick={(e) => { if (disabled) e.preventDefault(); }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150
                         ${disabled ? "opacity-30" : ""}`}
              style={{ color: isActive ? link.accent : "var(--color-text-muted)" }}
            >
              <span aria-hidden="true" className="text-lg leading-none">{link.icon}</span>
              <span className="text-[10px] font-medium leading-none">{link.label}</span>
              <span
                aria-hidden="true"
                className="h-0.5 w-6 rounded-full mt-0.5"
                style={{ backgroundColor: isActive ? link.accent : "transparent" }}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ==================== COMPONENT ====================

export default function TopNavBar() {
  const pathname = usePathname();
  const { currentTripId } = useAppStore();

  const currentTrip = useLiveQuery(
    () => (currentTripId ? db.trips.get(currentTripId) : undefined),
    [currentTripId]
  );

  // A collaborator landing on an invite link hasn't joined a trip yet and
  // may never have seen this app before — the full nav (mostly trip-gated
  // and irrelevant to them) is confusing clutter that pushes the actual
  // invite content below the fold on a phone. Skip it there. Placed after
  // all hooks so hook call order stays identical across renders.
  if (pathname === "/join") return null;

  const activePhase = getActivePhase(pathname);
  const hasTrip = !!currentTripId;

  return (
    <>
      <nav
        aria-label="Main"
        className="sticky top-0 z-40 w-full backdrop-blur-md"
        style={{
          backgroundColor: "var(--color-nav-bg)",
          borderBottom: "1px solid var(--color-border-subtle)",
          boxShadow: "var(--color-card-shadow) 0 1px 3px",
        }}
      >
        <div className="max-w-7xl mx-auto px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-4 h-14">
            {/* LEFT: Logo + trip info */}
            <div className="flex items-center gap-2 min-w-0 shrink md:shrink-0">
              <Link href="/" aria-label="ParQwish home" className="shrink-0">
                <Image
                  src="/images/parqwish-logo.png"
                  alt="ParQwish"
                  width={120}
                  height={30}
                  className="h-6 md:h-7 w-auto"
                  style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}
                  priority
                />
              </Link>
              {currentTrip && (
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-xs md:text-sm font-bold truncate max-w-[40vw] md:max-w-[160px]"
                    style={{ color: "var(--color-heading)" }}
                  >
                    {currentTrip.name}
                  </span>
                  {/* Dates are dropped on phones to leave the name room. */}
                  {currentTrip.startDate && (
                    <span className="hidden md:inline text-[10px] whitespace-nowrap" style={{ color: "var(--color-text-dim)" }}>
                      {formatDateRange(currentTrip.startDate, currentTrip.endDate)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CENTER (desktop): phases, then Catalog + Help after a divider */}
            <div className="hidden md:flex flex-1 items-center justify-center gap-1">
              {PHASE_LINKS.map((link) => (
                <TopLink
                  key={link.id}
                  link={link}
                  isActive={activePhase === link.id}
                  disabled={link.requiresTrip && !hasTrip}
                />
              ))}
              <span aria-hidden="true" className="mx-1.5 h-5 w-px" style={{ backgroundColor: "var(--color-border-default)" }} />
              <TopLink link={CATALOG_LINK} isActive={activePhase === "catalog"} disabled={false} />
              <HelpMenu />
            </div>

            {/* RIGHT: (phone) More menu, then sync status + theme toggle */}
            <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-auto md:ml-0">
              <div className="md:hidden">
                <HelpMenu label="More" includeCatalog />
              </div>
              <SyncStatusIndicator />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <MobilePhaseBar activePhase={activePhase} hasTrip={hasTrip} />
    </>
  );
}
