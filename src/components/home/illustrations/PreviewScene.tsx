"use client";

// ==================== PREVIEW SCENE ====================
// Home card illustration for Preview: a park map pinned to the wall with a
// route drawing itself and pins dropping on it, a wall calendar filling in,
// and a planner tapping the map with a pointer. Mid-century limited-
// animation style — flat shapes, a few moving parts, then it holds still.

import { motion } from "framer-motion";
import { C, SceneFrame, Sparkle, Starburst } from "./illo";

// Viewbox matches the card's 3:4 image area.
const W = 300;
const H = 400;
const FLOOR_Y = 350;

export default function PreviewScene() {
  return (
    <SceneFrame label="A planner at a wall map, marking the day's route and filling in a calendar">
      {(play, still) => (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="w-full h-full">
          <rect width={W} height={H} style={{ fill: C.wall }} />
          <rect y={FLOOR_Y} width={W} height={H - FLOOR_Y} style={{ fill: C.floor }} />
          <line x1={0} y1={FLOOR_Y} x2={W} y2={FLOOR_Y} style={{ stroke: C.ink, strokeWidth: 3 }} />
          <Sparkle x={18} y={22} size={7} color={C.mustard} />
          <Starburst x={250} y={196} r={20} delay={1.9} still={still} play={play} />
          <MapBoard play={play} still={still} />
          <WallCalendar play={play} still={still} />
          <Plant />
          <Presenter play={play} still={still} />
        </svg>
      )}
    </SceneFrame>
  );
}

// ==================== MAP ====================

const LANDS = [
  { d: "M40 60 Q80 48 110 66 Q122 96 92 110 Q58 116 44 96 Z", color: C.teal },
  { d: "M120 58 Q170 46 200 70 Q206 104 176 112 Q140 110 126 90 Z", color: C.sage },
  { d: "M44 120 Q84 112 108 130 Q112 164 76 176 Q46 172 40 150 Z", color: C.mustard },
  { d: "M118 122 Q160 114 198 128 Q204 166 168 176 Q128 178 120 152 Z", color: C.coral },
];
const ROUTE = "M66 88 C100 100 130 80 158 84 S172 140 150 148 S90 152 74 142";
const PINS = [
  { x: 158, y: 84, delay: 0.9 },
  { x: 150, y: 148, delay: 1.4 },
  { x: 74, y: 142, delay: 1.9 },
];

function MapBoard({ play, still }: { play: number; still: boolean }) {
  return (
    <g>
      <rect x={28} y={36} width={184} height={150} rx={4} style={{ fill: C.paper, stroke: C.ink, strokeWidth: 3 }} />
      {LANDS.map((l) => <path key={l.d} d={l.d} style={{ fill: l.color, opacity: 0.55 }} />)}
      <motion.path
        key={`route-${play}`}
        d={ROUTE}
        style={{ fill: "none", stroke: C.ink, strokeWidth: 3, strokeLinecap: "round" }}
        initial={still ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.7, ease: "easeInOut", opacity: { delay: 0.3, duration: 0.1 } }}
      />
      {PINS.map((p) => (
        <g key={p.x} transform={`translate(${p.x} ${p.y})`}>
          <motion.g
            key={`pin-${play}`}
            initial={still ? false : { y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: p.delay, type: "spring", stiffness: 260, damping: 14 }}
          >
            <path d="M0 0 C-7 -10 -8 -19 0 -19 C8 -19 7 -10 0 0 Z" style={{ fill: C.coral, stroke: C.ink, strokeWidth: 2 }} />
            <circle cy={-12} r={3} style={{ fill: C.paper }} />
          </motion.g>
        </g>
      ))}
      <circle cx={38} cy={45} r={4} style={{ fill: C.coral }} />
      <circle cx={202} cy={45} r={4} style={{ fill: C.coral }} />
    </g>
  );
}

// ==================== CALENDAR ====================

const CAL_X = 224;
const CAL_Y = 52;
// Which grid cells (row-major, 3 × 4) get filled, and in what color.
const FILLED = [C.mustard, C.teal, C.coral, C.teal, C.mustard, null, C.coral, C.teal, null, C.mustard, null, null];

function WallCalendar({ play, still }: { play: number; still: boolean }) {
  return (
    <g>
      <rect x={CAL_X} y={CAL_Y} width={58} height={92} rx={3} style={{ fill: C.paper, stroke: C.ink, strokeWidth: 3 }} />
      <rect x={CAL_X} y={CAL_Y} width={58} height={16} rx={3} style={{ fill: C.coral, stroke: C.ink, strokeWidth: 3 }} />
      <rect x={CAL_X + 12} y={CAL_Y - 7} width={5} height={12} rx={2} style={{ fill: C.ink }} />
      <rect x={CAL_X + 41} y={CAL_Y - 7} width={5} height={12} rx={2} style={{ fill: C.ink }} />
      {FILLED.map((color, i) => {
        const x = CAL_X + 6 + (i % 3) * 16;
        const y = CAL_Y + 24 + Math.floor(i / 3) * 16;
        return (
          <g key={i}>
            <rect x={x} y={y} width={13} height={13} rx={2} style={{ fill: "none", stroke: C.ink, strokeWidth: 1.2, opacity: 0.35 }} />
            {color && (
              <motion.rect
                key={`cell-${play}`}
                x={x} y={y} width={13} height={13} rx={2}
                style={{ fill: color }}
                initial={still ? false : { opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.14, duration: 0.25 }}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

// ==================== PROPS ====================

function Plant() {
  return (
    <g>
      <path d="M224 318 L204 262 L236 314 L240 250 L248 314 L276 266 L256 320 Z" style={{ fill: C.teal, stroke: C.ink, strokeWidth: 2 }} />
      <path d="M220 318 L274 318 L266 350 L228 350 Z" style={{ fill: C.coral, stroke: C.ink, strokeWidth: 2.5 }} />
    </g>
  );
}

// ==================== PRESENTER ====================

function Presenter({ play, still }: { play: number; still: boolean }) {
  return (
    <g>
      {/* legs + shoes */}
      <rect x={72} y={298} width={8} height={50} style={{ fill: C.ink }} />
      <rect x={90} y={298} width={8} height={50} style={{ fill: C.ink }} />
      <ellipse cx={80} cy={349} rx={10} ry={4} style={{ fill: C.ink }} />
      <ellipse cx={100} cy={349} rx={10} ry={4} style={{ fill: C.ink }} />
      {/* resting arm, behind the body */}
      <path d="M68 246 L56 286" style={{ stroke: C.teal, strokeWidth: 8, strokeLinecap: "round" }} />
      {/* body */}
      <path d="M64 302 L70 238 Q84 228 100 238 L106 302 Z" style={{ fill: C.teal, stroke: C.ink, strokeWidth: 2.5 }} />
      {/* head */}
      <circle cx={86} cy={214} r={16} style={{ fill: C.skin, stroke: C.ink, strokeWidth: 2.5 }} />
      <path d="M70 212 Q70 194 88 195 Q102 197 102 208 Q90 202 78 210 Z" style={{ fill: C.ink }} />
      <circle cx={95} cy={214} r={2} style={{ fill: C.ink }} />
      {/* pointer arm: pivots at the shoulder (the group's bottom-left) */}
      <motion.g
        key={`arm-${play}`}
        style={{ originX: 0, originY: 1 }}
        initial={still ? false : { rotate: 0 }}
        animate={{ rotate: [0, -14, 0, -14, 0] }}
        transition={{ delay: 0.5, duration: 1.4, ease: "easeInOut" }}
      >
        <path d="M96 242 L118 222" style={{ stroke: C.teal, strokeWidth: 8, strokeLinecap: "round" }} />
        <circle cx={119} cy={221} r={4.5} style={{ fill: C.skin, stroke: C.ink, strokeWidth: 1.5 }} />
        <path d="M120 220 L160 178" style={{ stroke: C.ink, strokeWidth: 2.5, strokeLinecap: "round" }} />
      </motion.g>
    </g>
  );
}
