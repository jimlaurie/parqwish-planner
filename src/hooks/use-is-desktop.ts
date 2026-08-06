"use client";

import { useState, useEffect } from "react";

/**
 * Returns true when the viewport is >= 1024px (Tailwind `lg` breakpoint).
 * Uses synchronous window check for correct first render (static export = no SSR).
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}
