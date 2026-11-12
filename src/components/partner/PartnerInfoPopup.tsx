"use client";

// ==================== PARTNER INFO POPUP ====================
// Opened from the band's name and the sidebar card's "Info": what the
// partner offers and how to reach it, "Plan a stay here", and its website,
// which always opens in a new tab (many sites refuse to be shown inside
// another page, so there's no embedded view).

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DialogOverlay from "@/components/DialogOverlay";
import { useAppStore } from "@/lib/store";
import { usePartner } from "@/lib/partners";
import { usePlanPartnerStay } from "@/hooks/use-plan-partner-stay";
import { partnerScopeStyle, telHref } from "./partner-style";

export default function PartnerInfoPopup() {
  const partner = usePartner();
  const open = useAppStore((s) => s.partnerInfoOpen);
  const setOpen = useAppStore((s) => s.setPartnerInfoOpen);
  const planStay = usePlanPartnerStay();
  const visible = open && !!partner;

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, setOpen]);

  return (
    <AnimatePresence>
      {visible && partner && (
        <DialogOverlay
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "var(--color-overlay)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <motion.div
            className="partner-scope w-full max-w-md rounded-2xl p-6 border max-h-[85vh] overflow-y-auto"
            style={{ ...partnerScopeStyle(partner), backgroundColor: "var(--color-bg-card)", borderColor: "color-mix(in srgb, var(--partner-accent) 40%, transparent)" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-info-title"
          >
            <div className="flex items-start gap-3 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- a partner's logo URL from Admin; a static export can't optimise it */}
              {partner.logoUrl && <img src={partner.logoUrl} alt="" className="h-10 w-auto max-w-[96px] object-contain" />}
              <div className="flex-1 min-w-0">
                <h2 id="partner-info-title" className="text-xl font-bold" style={{ color: "var(--partner-accent)" }}>{partner.name}</h2>
                {partner.tagline && <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{partner.tagline}</p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10"
                style={{ color: "var(--color-text-muted)" }}>×</button>
            </div>

            {partner.services.length > 0 && (
              <ul className="flex flex-col gap-2 mb-5">
                {partner.services.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm" style={{ color: "var(--color-text-primary)" }}>
                    <span aria-hidden="true">{s.icon}</span>
                    <span><strong>{s.title}</strong>{s.detail && <span style={{ color: "var(--color-text-muted)" }}> — {s.detail}</span>}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="text-sm mb-5" style={{ color: "var(--color-text-primary)" }}>
              {partner.stay.address && <p>{partner.stay.address}</p>}
              {partner.contact.phone && (
                <p><a href={telHref(partner.contact.phone)} style={{ color: "var(--partner-accent)" }} className="hover:underline">
                  {partner.contact.label ? `${partner.contact.label}: ` : ""}{partner.contact.phone}</a></p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => planStay(partner)}
                className="w-full rounded-full py-2.5 font-semibold cursor-pointer"
                style={{ backgroundColor: "var(--partner-accent)", color: "var(--color-bg-card)" }}>
                Plan a stay here
              </button>
              {partner.website && (
                <a href={partner.website} target="_blank" rel="noopener noreferrer"
                  className="w-full rounded-full py-2.5 font-semibold text-center border"
                  style={{ borderColor: "var(--partner-accent)", color: "var(--partner-accent)" }}>
                  Visit their website ↗
                </a>
              )}
            </div>
            <p className="text-xs mt-4" style={{ color: "var(--color-text-dim)" }}>
              Shown because you opened their ParQwish link. Nothing you plan is shared with them.
            </p>
          </motion.div>
        </DialogOverlay>
      )}
    </AnimatePresence>
  );
}
