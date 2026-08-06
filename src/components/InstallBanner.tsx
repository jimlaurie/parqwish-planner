"use client";

import { useState, useEffect } from "react";

const DISMISSED_KEY = "pwa-install-dismissed";

/**
 * Detects if the app is running in a browser (not installed as PWA)
 * and shows a banner prompting the user to install it.
 */
export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    try {
      // Already dismissed?
      if (localStorage.getItem(DISMISSED_KEY)) return;

      // Already running as installed PWA?
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (isStandalone) return;

      // Detect iOS for install instructions
      const ua = navigator.userAgent;
      const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setIsIOS(ios);
      setShow(true);
    } catch {
      // localStorage blocked — don't show
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 px-4 py-3 backdrop-blur-md"
      style={{
        zIndex: "var(--z-overlay)",
        background: "var(--color-bg-card)",
        borderTop: "1px solid color-mix(in srgb, var(--color-gold) 30%, transparent)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">✨</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>
            Install ParQwish Planner
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {isIOS
              ? "Tap the Share button, then \"Add to Home Screen\" for the best experience."
              : "Install this app for faster loading and smoother navigation."}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full cursor-pointer"
          style={{
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border-input)",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
