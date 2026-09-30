"use client";

// ==================== ILLUSTRATION KIT ====================
// Shared pieces for the Home page's mid-century illustrations: the palette
// (CSS vars from globals.css, so day/night theming just works), a starburst
// and a sparkle, and the play-once-then-replay-on-hover behavior every scene
// uses. SVG fill/stroke attributes don't resolve CSS vars, so colors always
// go through `style`.

import { useCallback, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export const C = {
  sky: "var(--illo-sky)",
  sky2: "var(--illo-sky-2)",
  wall: "var(--illo-wall)",
  floor: "var(--illo-floor)",
  paper: "var(--illo-paper)",
  ink: "var(--illo-ink)",
  teal: "var(--illo-teal)",
  orange: "var(--illo-orange)",
  mustard: "var(--illo-mustard)",
  coral: "var(--illo-coral)",
  sage: "var(--illo-sage)",
  skin: "var(--illo-skin)",
  orb: "var(--illo-orb)",
  star: "var(--illo-star)",
} as const;

/** A scene's animations run once on mount; a replay waits for the last one. */
const REPLAY_COOLDOWN_MS = 2600;

/**
 * Wraps a scene: renders it with a `play` token that changes on hover
 * (remounting the animated parts so they run again), and tells it whether
 * to skip motion entirely for people who prefer reduced motion.
 */
export function SceneFrame({ label, children }: {
  label: string;
  children: (play: number, still: boolean) => ReactNode;
}) {
  const still = useReducedMotion() ?? false;
  const [play, setPlay] = useState(0);
  const lastPlay = useRef(0);

  const replay = useCallback(() => {
    if (still) return;
    const now = Date.now();
    if (now - lastPlay.current < REPLAY_COOLDOWN_MS) return;
    lastPlay.current = now;
    setPlay((n) => n + 1);
  }, [still]);

  return (
    <div className="absolute inset-0" onMouseEnter={replay} role="img" aria-label={label}>
      {children(play, still)}
    </div>
  );
}

/** Mid-century "atomic" starburst: four long spikes, four short. */
export function Starburst({ x, y, r, color = C.mustard, delay = 0, still, play }: {
  x: number; y: number; r: number; color?: string; delay?: number; still: boolean; play: number;
}) {
  const spikes = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4;
    const len = i % 2 === 0 ? r : r * 0.55;
    return { x2: Math.cos(angle) * len, y2: Math.sin(angle) * len };
  });
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g
        key={play}
        initial={still ? false : { scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay, type: "spring", stiffness: 180, damping: 12 }}
      >
        {spikes.map((s, i) => (
          <line key={i} x1={0} y1={0} x2={s.x2} y2={s.y2} style={{ stroke: color, strokeWidth: 2.5, strokeLinecap: "round" }} />
        ))}
        <circle r={r * 0.14} style={{ fill: color }} />
      </motion.g>
    </g>
  );
}

/** Four-point sparkle, drawn centered on (x, y). */
export function Sparkle({ x, y, size, color = C.paper, opacity = 1 }: {
  x: number; y: number; size: number; color?: string; opacity?: number | string;
}) {
  const s = size;
  const w = size * 0.22;
  const d = `M0 ${-s} Q${w} ${-w} ${s} 0 Q${w} ${w} 0 ${s} Q${-w} ${w} ${-s} 0 Q${-w} ${-w} 0 ${-s} Z`;
  return <path d={d} transform={`translate(${x} ${y})`} style={{ fill: color, opacity }} />;
}
