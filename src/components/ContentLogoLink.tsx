"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IN_APP_SESSION_KEY } from "@/lib/in-app-session";

// ==================== COMPONENT ====================
// The logo in the Guide/Story/Blog header (see (content)/layout.tsx).
// "Home" is ambiguous here: a visitor who arrived from outside (Reddit, a
// search result) expects the logo to go to the marketing site at
// parqwish.com; a visitor already using the Planner (deployed separately
// at app.parqwish.com) who clicked through to a content page expects it
// to return to the Planner's own dashboard. Decided client-side after
// mount via AppInit's session marker — defaults to the marketing site
// (the external-visitor case, and the safe fallback if sessionStorage is
// unavailable) until proven otherwise.

export default function ContentLogoLink() {
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    try {
      setInApp(sessionStorage.getItem(IN_APP_SESSION_KEY) === "1");
    } catch {
      // sessionStorage may be blocked — stay on the marketing-site default
    }
  }, []);

  const logo = (
    <Image
      src="/images/parqwish-logo.png"
      alt="ParQwish"
      width={120}
      height={30}
      className="h-6 w-auto"
      priority
    />
  );

  if (inApp) {
    return (
      <Link href="/" className="shrink-0">
        {logo}
      </Link>
    );
  }

  return (
    <a href="https://parqwish.com" className="shrink-0">
      {logo}
    </a>
  );
}
