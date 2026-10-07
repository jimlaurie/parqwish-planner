"use client";

// ==================== HOME BANNER ====================
// Title banner for the Home page: a generic mid-century skyline at dusk
// (a flying-saucer tower, an elevated train, palms, a wooden coaster, and
// fireworks at night) — deliberately not any real park, so it doesn't lean
// on Disney imagery —
// with the logo on a sign panel. The trip countdown lives in the top bar.

import Image from "next/image";
import { IlloArt } from "./illustrations/illo";
import bannerArt from "./illustrations/generated/banner";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function HomeBanner() {
  // Phones: the skyline is a strip above the sign, anchored left so the saucer
  // tower and the train stay in view. Wider screens: the sign sits over the full scene.
  const wide = useMediaQuery("(min-width: 768px)");
  return (
    <div
      className="relative w-full max-w-5xl rounded-2xl overflow-hidden mb-8"
      style={{ minHeight: 200, willChange: "transform", border: "3px solid var(--illo-ink)", backgroundColor: "var(--illo-ink)" }}
    >
      {wide ? (
        <IlloArt art={bannerArt} />
      ) : (
        <div className="relative h-[120px]"><IlloArt art={bannerArt} align="xMinYMax slice" /></div>
      )}
      <div className={`relative z-10 flex items-center justify-center px-4 ${wide ? "py-7" : "pb-5"}`}>
        <div
          className="flex flex-col items-center rounded-2xl px-6 py-4 md:px-10"
          style={{
            backgroundColor: "color-mix(in srgb, var(--illo-ink) 88%, transparent)",
            border: wide ? "2px solid var(--illo-mustard)" : "none",
          }}
        >
          <Image src="/images/parqwish-logo.png" alt="ParQwish" width={400} height={100} className="h-12 md:h-16 w-auto" priority />
          <p className="text-xs md:text-sm tracking-[0.3em] uppercase font-semibold mt-1" style={{ color: "var(--illo-mustard)" }}>
            Planner
          </p>
          <p className="text-xs md:text-sm mt-1" style={{ color: "var(--illo-paper)" }}>
            Your Theme Park and Resort Companion
          </p>
        </div>
      </div>
    </div>
  );
}
