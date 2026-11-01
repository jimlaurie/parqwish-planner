// ==================== PARTNER BRANDING ====================
// A guest who opens a partner's link (/with/<id>) keeps the partner's id on
// this device (store.partnerId). Its branding is a small public file the
// partner's admin-only record is published to, data/partners/<id>.json,
// while the partnership runs; the band, sidebar card and info popup show it
// (components/partner/). Nothing about the guest leaves the device.
//
// The file carries its first and last day, and branding shows only in
// between (shared/partners.ts brandingShowing): it disappears by itself on
// the day after the last, even from the copy cached here for offline use.
// A missing file (403/404: never published, paused or ended) means none,
// and drops the cached copy; a file that can't be reached falls back to
// that copy, reported as cached on the Play page.

import { useEffect, useState } from "react";
import { brandingShowing, PARTNER_ID } from "@shared/partners";
import type { PartnerBranding } from "@shared/types/partner";
import type { HotelStay } from "@/lib/db";
import { parkToday } from "@/lib/dates";
import { liveUrl, LIVE_TIMEOUT_MS } from "@/lib/park-data";
import { reportSource } from "@/lib/data-sources";
import { useAppStore } from "@/lib/store";

const CACHE_PREFIX = "parqwish:partner:";

// ==================== CACHE ====================

function readCached(id: string): PartnerBranding | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + id);
    return raw ? (JSON.parse(raw) as PartnerBranding) : null;
  } catch {
    return null;
  }
}

function writeCached(id: string, branding: PartnerBranding | null): void {
  try {
    if (branding) localStorage.setItem(CACHE_PREFIX + id, JSON.stringify(branding));
    else localStorage.removeItem(CACHE_PREFIX + id);
  } catch {
    // Storage blocked: the live file still works, there's just no offline copy
  }
}

// ==================== LOADING ====================

/** The published file, null when there is none (403/404); throws when it can't be reached. */
async function fetchBranding(id: string): Promise<PartnerBranding | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);
  try {
    const res = await fetch(liveUrl(`partners/${id}.json`), { signal: controller.signal });
    if (res.status === 403 || res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as PartnerBranding;
  } finally {
    clearTimeout(timer);
  }
}

const loads = new Map<string, Promise<PartnerBranding | null>>();

/** The partner's branding if it shows today, else null. Loaded once per page load. */
export function loadPartner(id: string): Promise<PartnerBranding | null> {
  if (!PARTNER_ID.test(id)) return Promise.resolve(null);
  let load = loads.get(id);
  if (!load) {
    load = resolveBranding(id);
    loads.set(id, load);
  }
  return load;
}

async function resolveBranding(id: string): Promise<PartnerBranding | null> {
  const today = parkToday();
  try {
    const live = await fetchBranding(id);
    const showing = live && live.id === id && brandingShowing(live, today) ? live : null;
    writeCached(id, showing);
    // Not published or outside its dates is "no partner", not a failure
    if (showing) reportSource({ key: "partnerBranding", kind: "live", asOf: showing.publishedAt ?? null });
    else console.info(`[partners] ${id}: ${live ? "outside its dates" : "not published"}`);
    return showing;
  } catch (err) {
    const cached = readCached(id);
    const showing = cached && brandingShowing(cached, today) ? cached : null;
    reportSource({ key: "partnerBranding", kind: showing ? "cached" : "failed", asOf: cached?.publishedAt ?? null,
      detail: `live copy unavailable (${err instanceof Error ? err.message : "network"})` });
    return showing;
  }
}

/** The branding for this device's partner link, or null (none, not showing, or still loading). */
export function usePartner(): PartnerBranding | null {
  const partnerId = useAppStore((s) => s.partnerId);
  const [branding, setBranding] = useState<PartnerBranding | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!partnerId) { setBranding(null); return; }
    loadPartner(partnerId)
      .then((b) => { if (!cancelled) setBranding(b); })
      .catch((err) => console.error("[partners] loading failed:", err));
    return () => { cancelled = true; };
  }, [partnerId]);
  return branding;
}

// ==================== "PLAN A STAY HERE" ====================

/**
 * The hotel stay and notes for a new trip from a partner's card: booked for
 * the trip's dates (today until they're set; the stay follows the dates,
 * see use-trip-form.ts), with the partner's address, contact and services.
 */
export function partnerStayDetails(b: PartnerBranding, today: string): { hotels: HotelStay[]; notes: string } {
  const contact = b.contact.phone ? `${b.contact.label || "Phone"}: ${b.contact.phone}` : "";
  const hotel: HotelStay = {
    name: b.stay.name || b.name,
    checkIn: today,
    checkOut: today,
    notes: [b.stay.address, contact].filter(Boolean).join("\n") || undefined,
  };
  const services = b.services.map((s) => `${s.icon} ${s.title}${s.detail ? ` — ${s.detail}` : ""}`.trim());
  return { hotels: [hotel], notes: [b.stay.notes, ...services].filter(Boolean).join("\n") };
}
