"use client";

// ==================== HOME BANNER ====================
// Title banner for the Home page: a generic mid-century "tomorrow-land"
// skyline (rocket, palms, a boomerang-roofed pavilion, a Ferris wheel) —
// deliberately not any real park, so it doesn't lean on Disney imagery —
// with the logo on a sign panel and a countdown for the active trip.

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { C, Sparkle } from "./illustrations/illo";
import { tripCountdown, type CountdownTrip } from "@/lib/trip-countdown";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function HomeBanner({ trip }: { trip: CountdownTrip | null }) {
  // Phones: the skyline is a strip above the sign, anchored left so the rocket
  // and palms stay in view. Wider screens: the sign sits over the full scene.
  const wide = useMediaQuery("(min-width: 768px)");
  return (
    <div
      className="relative w-full max-w-5xl rounded-2xl overflow-hidden mb-8"
      style={{ minHeight: 200, willChange: "transform", border: "3px solid var(--illo-ink)", backgroundColor: "var(--illo-ink)" }}
    >
      {wide ? (
        <Skyline align="xMidYMax slice" />
      ) : (
        <div className="relative h-[120px]"><Skyline align="xMinYMax slice" /></div>
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
            Plan it. Live it. Relive it.
          </p>
          <p
            className="text-[11px] md:text-xs font-semibold mt-2 px-3 py-1 rounded-full text-center"
            style={{ backgroundColor: "var(--illo-mustard)", color: "var(--illo-ink)" }}
          >
            {tripCountdown(trip)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== SKYLINE ====================

const STARS = [[60, 30, 5], [300, 22, 4], [390, 60, 3], [560, 28, 4], [640, 70, 3], [760, 36, 5], [470, 40, 3]] as const;

function Skyline({ align }: { align: string }) {
  return (
    <svg
      viewBox="0 0 1000 220"
      preserveAspectRatio={align}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    >
      <rect width={1000} height={220} style={{ fill: C.sky }} />
      <rect y={150} width={1000} height={70} style={{ fill: C.sky2, opacity: 0.6 }} />
      {STARS.map(([x, y, s]) => (
        <Sparkle key={`${x}-${y}`} x={x} y={y} size={s} color={C.star} opacity="var(--illo-star-opacity)" />
      ))}
      <circle cx={862} cy={52} r={24} style={{ fill: C.orb }} />
      <path d="M0 186 Q120 150 240 172 T480 168 T720 174 T1000 160 V220 H0 Z" style={{ fill: C.sage, opacity: 0.55 }} />
      <Rocket />
      <Palm x={196} lean={-6} />
      <Palm x={236} lean={8} />
      <Pavilion />
      <FerrisWheel />
      <rect y={196} width={1000} height={24} style={{ fill: C.floor }} />
      <line x1={0} y1={196} x2={1000} y2={196} style={{ stroke: C.ink, strokeWidth: 3 }} />
    </svg>
  );
}

function Rocket() {
  return (
    <g style={{ stroke: C.ink, strokeWidth: 3, strokeLinejoin: "round" }}>
      <path d="M96 130 L84 196 M124 130 L136 196 M110 132 L110 196" style={{ fill: "none" }} />
      <path d="M110 34 Q128 66 126 132 L94 132 Q92 66 110 34 Z" style={{ fill: C.paper }} />
      <path d="M95 104 L125 104 L126 116 L94 116 Z" style={{ fill: C.coral }} />
      <path d="M94 110 L78 140 L95 132 Z M126 110 L142 140 L125 132 Z" style={{ fill: C.coral }} />
      <circle cx={110} cy={78} r={8} style={{ fill: C.teal }} />
    </g>
  );
}

function Palm({ x, lean }: { x: number; lean: number }) {
  const top = { x: x + lean, y: 112 };
  const fronds = [-150, -115, -65, -30, 10, 170].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const ex = top.x + Math.cos(rad) * 30;
    const ey = top.y + Math.sin(rad) * 30 + 10;
    return `M${top.x} ${top.y} Q${(top.x + ex) / 2} ${top.y - 14} ${ex} ${ey}`;
  });
  return (
    <g>
      <path d={`M${x} 196 Q${x + lean * 0.3} 150 ${top.x} ${top.y}`} style={{ fill: "none", stroke: C.ink, strokeWidth: 5, strokeLinecap: "round" }} />
      {fronds.map((d) => <path key={d} d={d} style={{ fill: "none", stroke: C.teal, strokeWidth: 6, strokeLinecap: "round" }} />)}
    </g>
  );
}

function Pavilion() {
  return (
    <g style={{ stroke: C.ink, strokeWidth: 3, strokeLinejoin: "round" }}>
      <path d="M690 196 L690 146 M790 196 L790 140" style={{ fill: "none" }} />
      <rect x={700} y={156} width={80} height={40} style={{ fill: C.mustard, opacity: 0.85 }} />
      <path d="M672 150 L738 128 L808 138 L804 146 L738 138 L676 158 Z" style={{ fill: C.coral }} />
    </g>
  );
}

function FerrisWheel() {
  const still = useReducedMotion() ?? false;
  const cx = 930;
  const cy = 116;
  const r = 62;
  const cars = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, color: [C.coral, C.teal, C.mustard, C.orange][i % 4] };
  });
  return (
    <g>
      <path d={`M${cx - 44} 196 L${cx} ${cy} L${cx + 44} 196`} style={{ fill: "none", stroke: C.ink, strokeWidth: 4 }} />
      <motion.g
        style={{ originX: `${cx}px`, originY: `${cy}px`, transformBox: "view-box" }}
        animate={still ? undefined : { rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      >
        <circle cx={cx} cy={cy} r={r} style={{ fill: "none", stroke: C.ink, strokeWidth: 3 }} />
        {cars.map((c) => (
          <g key={`${c.x}-${c.y}`}>
            <line x1={cx} y1={cy} x2={c.x} y2={c.y} style={{ stroke: C.ink, strokeWidth: 1.5 }} />
            <circle cx={c.x} cy={c.y} r={8} style={{ fill: c.color, stroke: C.ink, strokeWidth: 2 }} />
          </g>
        ))}
      </motion.g>
      <circle cx={cx} cy={cy} r={6} style={{ fill: C.ink }} />
    </g>
  );
}
