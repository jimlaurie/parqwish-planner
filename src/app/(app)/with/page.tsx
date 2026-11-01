"use client";

// ==================== PARTNER LINK ====================
// /with/<partnerId> — the link a partner gives its guests. Remembers the
// partner on this device (lib/partners.ts), then opens Home. Partners come
// from Admin, not the build, so this is one static page: Firebase Hosting
// rewrites /with/** to it (firebase.json), and it reads the id from the
// address. /with?id=<partnerId> works too (the dev server has no rewrite).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PARTNER_ID } from "@shared/partners";
import { useAppStore } from "@/lib/store";

/** The partner id in /with/<id> or /with?id=<id>, or null. */
function partnerIdFromAddress(): string | null {
  const fromPath = window.location.pathname.match(/^\/with\/([^/?#]+)/)?.[1];
  const id = decodeURIComponent(fromPath ?? new URLSearchParams(window.location.search).get("id") ?? "").toLowerCase();
  return PARTNER_ID.test(id) ? id : null;
}

export default function PartnerLinkPage() {
  const router = useRouter();
  const setPartnerId = useAppStore((s) => s.setPartnerId);

  useEffect(() => {
    const id = partnerIdFromAddress();
    if (id) setPartnerId(id);
    router.replace("/");
  }, [router, setPartnerId]);

  return (
    <p className="text-center text-sm py-20" style={{ color: "var(--color-text-muted)" }}>
      Opening ParQwish Planner…
    </p>
  );
}
