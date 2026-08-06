"use client";

import { useState, useEffect } from "react";

/**
 * Shows a reload banner when a new app version is detected.
 *
 * Detection: AppInit's useVersionCheck() fetches /version.json on every
 * visibility change. When the fetched version differs from the build-time
 * APP_VERSION, it fires a "parqwish-update-available" window event.
 *
 * This works on iOS home-screen PWAs where service worker controllerchange
 * events are unreliable — the fetch bypasses the app's own cache.
 */
export default function UpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show immediately if a previous focus-check already found an update
    if (typeof localStorage !== "undefined" &&
        localStorage.getItem("parqwish-update-available")) {
      setVisible(true);
    }

    const handler = () => setVisible(true);
    window.addEventListener("parqwish-update-available", handler);
    return () => window.removeEventListener("parqwish-update-available", handler);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 px-4 py-2.5 flex items-center gap-3"
      style={{
        zIndex: 9999,
        background: "color-mix(in srgb, var(--color-accent-publish) 15%, var(--color-bg-card))",
        borderBottom: "1px solid color-mix(in srgb, var(--color-accent-publish) 40%, transparent)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span className="text-base flex-shrink-0">🔄</span>
      <p className="flex-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
          New version available.{" "}
        </span>
        Reload to get the latest updates.
      </p>
      <button
        onClick={() => {
        localStorage.removeItem("parqwish-update-available");
        window.location.reload();
      }}
        className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer
                   transition-all duration-200 hover:brightness-110"
        style={{
          backgroundColor: "var(--color-accent-publish)",
          color: "var(--color-bg-deep)",
        }}
      >
        Reload Now
      </button>
      <button
        onClick={() => setVisible(false)}
        className="flex-shrink-0 text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-white/5"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Dismiss update notification"
      >
        ✕
      </button>
    </div>
  );
}
