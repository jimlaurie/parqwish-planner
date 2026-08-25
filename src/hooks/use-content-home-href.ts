"use client";

import { useEffect, useState } from "react";
import { IN_APP_SESSION_KEY } from "@/lib/in-app-session";

// ==================== HOOK ====================
// "Home" is ambiguous on a Guide/Story/Blog content page: a visitor who
// arrived from outside (Reddit, a search result) expects it to mean the
// marketing site at parqwish.com; a visitor already using the Planner
// (deployed separately at app.parqwish.com) who clicked through to a
// content page expects it to mean the Planner's own dashboard. Decided
// client-side after mount via AppInit's session marker — defaults to the
// marketing site (the external-visitor case, and the safe fallback if
// sessionStorage is unavailable) until proven otherwise. Shared by
// ContentLogoLink and the "Home" nav link so both agree.

interface ContentHomeHref {
  href: string;
  internal: boolean;
}

export function useContentHomeHref(): ContentHomeHref {
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    try {
      setInApp(sessionStorage.getItem(IN_APP_SESSION_KEY) === "1");
    } catch {
      // sessionStorage may be blocked — stay on the marketing-site default
    }
  }, []);

  return inApp ? { href: "/", internal: true } : { href: "https://parqwish.com", internal: false };
}
