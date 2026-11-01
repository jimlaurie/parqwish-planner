"use client";

// ==================== PARTNER SIDEBAR CARD ====================
// Top of the trip sidebar (where the star compass used to be) for a guest
// who arrived through a partner's link: its name or logo, tagline, and
// three actions: Info (the popup), Call, and Plan a stay here.

import { useAppStore } from "@/lib/store";
import { usePartner } from "@/lib/partners";
import { usePlanPartnerStay } from "@/hooks/use-plan-partner-stay";
import { partnerScopeStyle, telHref } from "./partner-style";

/** "Front desk" reads "Call front desk"; a label that's all capitals (an acronym) is left as it is. */
function callLabel(label: string): string {
  return label && label !== label.toUpperCase() ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}

export default function PartnerSidebarCard() {
  const partner = usePartner();
  const setPartnerInfoOpen = useAppStore((s) => s.setPartnerInfoOpen);
  const planStay = usePlanPartnerStay();
  if (!partner) return null;

  const action = "text-xs font-semibold text-left hover:underline cursor-pointer";
  return (
    <section
      className="partner-scope mx-3 mb-4 rounded-xl p-3 border"
      style={{ ...partnerScopeStyle(partner), backgroundColor: "var(--color-bg-card)", borderColor: "color-mix(in srgb, var(--partner-accent) 45%, transparent)" }}
      aria-label={partner.name}
      data-testid="partner-card"
    >
      {partner.logoUrl
        // eslint-disable-next-line @next/next/no-img-element -- a partner's logo URL from Admin; a static export can't optimise it
        ? <img src={partner.logoUrl} alt={partner.name} className="h-8 w-auto max-w-full object-contain mb-1" />
        : <p className="font-bold text-sm leading-tight" style={{ color: "var(--partner-accent)" }}>{partner.name}</p>}
      {partner.tagline && <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--color-text-muted)" }}>{partner.tagline}</p>}
      <div className="flex flex-col gap-1 mt-2" style={{ color: "var(--partner-accent)" }}>
        <button type="button" className={action} onClick={() => setPartnerInfoOpen(true)} aria-haspopup="dialog">Info &amp; website</button>
        {partner.contact.phone && (
          <a className={action} href={telHref(partner.contact.phone)}>Call {callLabel(partner.contact.label) || partner.contact.phone}</a>
        )}
        <button type="button" className={action} onClick={() => planStay(partner)}>Plan a stay here</button>
      </div>
    </section>
  );
}
