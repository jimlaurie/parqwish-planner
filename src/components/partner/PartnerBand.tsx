"use client";

// ==================== PARTNER BAND ====================
// The one-line strip above the nav for a guest who arrived through a
// partner's link: "Planning with <name>", its tagline, and its phone. The
// name opens the partner info popup (on phones the sidebar card is behind
// the ☰ menu, so this is their way in). Colours come from the partner's
// published branding; the strip is its own coloured surface, so it reads
// the same in both themes. × hides the partner on this device.

import { useAppStore } from "@/lib/store";
import { usePartner } from "@/lib/partners";
import { telHref } from "./partner-style";

export default function PartnerBand() {
  const partner = usePartner();
  const setPartnerId = useAppStore((s) => s.setPartnerId);
  const setPartnerInfoOpen = useAppStore((s) => s.setPartnerInfoOpen);
  if (!partner) return null;

  return (
    <div
      className="w-full"
      style={{ backgroundColor: partner.colors.band, color: partner.colors.bandText }}
      role="region"
      aria-label={`Planning with ${partner.name}`}
      data-testid="partner-band"
    >
      <div className="max-w-7xl mx-auto px-3 md:px-4 h-8 flex items-center gap-2 text-xs">
        <span className="opacity-80 hidden sm:inline">Planning with</span>
        <button
          type="button"
          onClick={() => setPartnerInfoOpen(true)}
          className="font-semibold text-sm whitespace-nowrap underline-offset-2 hover:underline cursor-pointer"
          aria-haspopup="dialog"
        >
          {partner.name}
        </button>
        {partner.tagline && <span className="opacity-80 hidden md:inline truncate">· {partner.tagline}</span>}
        <span className="ml-auto flex items-center gap-3 shrink-0">
          {partner.contact.phone && (
            <a href={telHref(partner.contact.phone)} className="hidden sm:inline underline-offset-2 hover:underline">
              {partner.contact.label} {partner.contact.phone}
            </a>
          )}
          <button
            type="button"
            onClick={() => setPartnerId(null)}
            aria-label={`Stop showing ${partner.name}`}
            title="Not with them? Hide this"
            className="w-5 h-5 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer"
          >
            ×
          </button>
        </span>
      </div>
    </div>
  );
}
