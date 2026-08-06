"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

// ==================== TYPES ====================

interface PreparePortalProps {
  state: "closed" | "opening" | "open";
  onAnimationComplete?: () => void;
}

// ==================== COMPONENT ====================

export default function PreparePortal({ state, onAnimationComplete }: PreparePortalProps) {
  const leftGateControls = useAnimation();
  const rightGateControls = useAnimation();
  const sceneControls = useAnimation();

  useEffect(() => {
    if (state === "opening") {
      const animate = async () => {
        // Gates swing outward simultaneously
        await Promise.all([
          leftGateControls.start({
            rotateY: -70,
            transition: { duration: 1.4, ease: "easeInOut" },
          }),
          rightGateControls.start({
            rotateY: 70,
            transition: { duration: 1.4, ease: "easeInOut" },
          }),
        ]);
        // Scene fades in
        await sceneControls.start({
          opacity: 1,
          transition: { duration: 0.6 },
        });
        onAnimationComplete?.();
      };
      animate();
    }
  }, [state, leftGateControls, rightGateControls, sceneControls, onAnimationComplete]);

  const isOpen = state === "open";
  const isClosed = state === "closed";

  return (
    <svg viewBox="0 0 280 320" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fort-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#6B4914" />
        </linearGradient>
        <linearGradient id="fort-log" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A0784A" />
          <stop offset="50%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#7B5914" />
        </linearGradient>
        <linearGradient id="sunset-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1a1e" />
          <stop offset="60%" stopColor="#4a2a2e" />
          <stop offset="100%" stopColor="#6a3a28" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="280" height="320" fill={isClosed ? "#1a1a2e" : "url(#sunset-sky)"} rx="16" />

      {/* Background scene (visible when open) */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={isOpen ? { opacity: 1 } : sceneControls}
      >
        {/* Distant mountains */}
        <polygon points="0,200 60,140 120,180 180,130 240,170 280,150 280,200" fill="#3a2a1e" />

        {/* Mark Twain steamboat silhouette */}
        <g transform="translate(160, 200)">
          <rect x="-30" y="0" width="60" height="15" rx="3" fill="#2a1a1e" />
          <rect x="-20" y="-12" width="40" height="14" rx="2" fill="#3a2a1e" />
          <rect x="-10" y="-22" width="20" height="12" rx="2" fill="#3a2a1e" />
          {/* Smokestack */}
          <rect x="-3" y="-32" width="6" height="12" fill="#4a3a2e" />
          {/* Paddle wheel */}
          <circle cx="30" cy="5" r="8" fill="none" stroke="#5a4a3e" strokeWidth="1.5" />
        </g>

        {/* Covered wagons */}
        <g transform="translate(70, 230)">
          {/* Wagon body */}
          <rect x="0" y="10" width="40" height="15" rx="2" fill="#7B5914" />
          {/* Canvas cover */}
          <path d="M 0 10 Q 20 -8 40 10" fill="#DEB887" opacity="0.6" />
          {/* Wheels */}
          <circle cx="8" cy="28" r="6" fill="none" stroke="#6B4914" strokeWidth="2" />
          <circle cx="32" cy="28" r="6" fill="none" stroke="#6B4914" strokeWidth="2" />
        </g>

        {/* Supply barrels */}
        <ellipse cx="50" cy="262" rx="10" ry="12" fill="#6B4914" stroke="#5a3a0a" strokeWidth="1" />
        <ellipse cx="70" cy="265" rx="8" ry="10" fill="#7B5914" stroke="#5a3a0a" strokeWidth="1" />
      </motion.g>

      {/* Fort walls */}
      <g>
        {/* Left wall */}
        <rect x="20" y="100" width="25" height="180" fill="url(#fort-log)" />
        {/* Log texture lines */}
        {[110, 125, 140, 155, 170, 185, 200, 215, 230, 245, 260].map((y) => (
          <line key={`lw${y}`} x1="20" y1={y} x2="45" y2={y} stroke="#5a3a0a" strokeWidth="0.5" opacity="0.4" />
        ))}

        {/* Right wall */}
        <rect x="235" y="100" width="25" height="180" fill="url(#fort-log)" />
        {[110, 125, 140, 155, 170, 185, 200, 215, 230, 245, 260].map((y) => (
          <line key={`rw${y}`} x1="235" y1={y} x2="260" y2={y} stroke="#5a3a0a" strokeWidth="0.5" opacity="0.4" />
        ))}

        {/* Left wall top — pointed stakes */}
        {[20, 28, 36].map((x) => (
          <polygon key={`ls${x}`} points={`${x},100 ${x + 4},88 ${x + 8},100`} fill="#A0784A" />
        ))}
        {/* Right wall top — pointed stakes */}
        {[235, 243, 251].map((x) => (
          <polygon key={`rs${x}`} points={`${x},100 ${x + 4},88 ${x + 8},100`} fill="#A0784A" />
        ))}

        {/* Gate frame — heavy timber arch */}
        <rect x="45" y="95" width="190" height="12" fill="#6B4914" />
        <rect x="45" y="95" width="8" height="190" fill="#6B4914" />
        <rect x="227" y="95" width="8" height="190" fill="#6B4914" />

        {/* Plank sign above gate */}
        <rect x="80" y="100" width="120" height="22" rx="3" fill="#8B6914" stroke="#5a3a0a" strokeWidth="1" />
        <text
          x="140"
          y="116"
          textAnchor="middle"
          fill={isOpen ? "#DEB887" : "#A0784A"}
          fontSize="14"
          fontFamily="serif"
          fontWeight="bold"
          letterSpacing="2"
        >
          PREPARE
        </text>
      </g>

      {/* Left gate */}
      <motion.g
        style={{ transformOrigin: "53px 190px" }}
        initial={{ rotateY: 0 }}
        animate={isOpen ? { rotateY: -70 } : leftGateControls}
      >
        {isClosed && (
          <g>
            <rect x="53" y="120" width="87" height="165" fill="url(#fort-wood)" />
            {/* Vertical planks */}
            {[63, 78, 93, 108, 123].map((x) => (
              <line key={`lg${x}`} x1={x} y1="120" x2={x} y2="285" stroke="#5a3a0a" strokeWidth="1" opacity="0.5" />
            ))}
            {/* Cross brace */}
            <line x1="53" y1="180" x2="140" y2="250" stroke="#5a3a0a" strokeWidth="3" opacity="0.4" />
            {/* Iron hinge */}
            <rect x="53" y="150" width="15" height="4" rx="1" fill="#4a4a4a" />
            <rect x="53" y="240" width="15" height="4" rx="1" fill="#4a4a4a" />
          </g>
        )}
      </motion.g>

      {/* Right gate */}
      <motion.g
        style={{ transformOrigin: "227px 190px" }}
        initial={{ rotateY: 0 }}
        animate={isOpen ? { rotateY: 70 } : rightGateControls}
      >
        {isClosed && (
          <g>
            <rect x="140" y="120" width="87" height="165" fill="url(#fort-wood)" />
            {[155, 170, 185, 200, 215].map((x) => (
              <line key={`rg${x}`} x1={x} y1="120" x2={x} y2="285" stroke="#5a3a0a" strokeWidth="1" opacity="0.5" />
            ))}
            <line x1="140" y1="250" x2="227" y2="180" stroke="#5a3a0a" strokeWidth="3" opacity="0.4" />
            <rect x="212" y="150" width="15" height="4" rx="1" fill="#4a4a4a" />
            <rect x="212" y="240" width="15" height="4" rx="1" fill="#4a4a4a" />
          </g>
        )}
      </motion.g>

      {/* Ground */}
      <rect x="0" y="280" width="280" height="40" fill="#3a2a1e" rx="0" />

      {/* Dirt path */}
      <path
        d="M 110 280 Q 140 290 170 280 Q 150 310 130 320 L 150 320 Q 160 300 170 280"
        fill="#5a4a3e"
        opacity="0.5"
      />

      {/* Closed state overlay */}
      {isClosed && (
        <rect width="280" height="320" fill="rgba(0,0,0,0.3)" rx="16" />
      )}
    </svg>
  );
}
