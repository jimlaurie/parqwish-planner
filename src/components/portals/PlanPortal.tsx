"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

// ==================== TYPES ====================

interface PlanPortalProps {
  state: "closed" | "opening" | "open";
  onAnimationComplete?: () => void;
}

// ==================== COMPONENT ====================

export default function PlanPortal({ state, onAnimationComplete }: PlanPortalProps) {
  const drawbridgeControls = useAnimation();
  const portcullisControls = useAnimation();
  const glowControls = useAnimation();

  useEffect(() => {
    if (state === "opening") {
      // Sequence: drawbridge lowers, portcullis rises, glow appears
      const animate = async () => {
        await drawbridgeControls.start({
          rotateX: 80,
          transition: { duration: 1.2, ease: "easeInOut" },
        });
        await portcullisControls.start({
          y: -60,
          transition: { duration: 0.8, ease: "easeOut" },
        });
        await glowControls.start({
          opacity: 1,
          transition: { duration: 0.6 },
        });
        onAnimationComplete?.();
      };
      animate();
    }
  }, [state, drawbridgeControls, portcullisControls, glowControls, onAnimationComplete]);

  const isOpen = state === "open";
  const isClosed = state === "closed";

  return (
    <svg viewBox="0 0 280 320" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="plan-glow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="castle-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B7D6B" />
          <stop offset="100%" stopColor="#6B5B4B" />
        </linearGradient>
        <linearGradient id="tower-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A6FA5" />
          <stop offset="100%" stopColor="#3A5A8A" />
        </linearGradient>
        <clipPath id="archway-clip">
          <path d="M 110 220 Q 110 170 140 165 Q 170 170 170 220 L 170 280 L 110 280 Z" />
        </clipPath>
      </defs>

      {/* Sky background */}
      <rect width="280" height="320" fill={isClosed ? "#1a1a2e" : "#1e2a4a"} rx="16" />

      {/* Stars (only visible when open) */}
      {(isOpen || state === "opening") && (
        <g opacity={isOpen ? 0.7 : 0}>
          <circle cx="30" cy="30" r="1.5" fill="white" opacity="0.8" />
          <circle cx="250" cy="50" r="1" fill="white" opacity="0.6" />
          <circle cx="60" cy="70" r="1.2" fill="white" opacity="0.7" />
          <circle cx="220" cy="25" r="1" fill="white" opacity="0.5" />
          <circle cx="170" cy="60" r="1.5" fill="white" opacity="0.6" />
        </g>
      )}

      {/* Castle Main Body */}
      <g>
        {/* Left tower */}
        <rect x="55" y="100" width="35" height="180" fill="url(#castle-wall)" />
        <polygon points="52,100 72,55 92,100" fill="url(#tower-top)" />
        <rect x="52" y="95" width="40" height="8" fill="#7B6D5B" />
        {/* Left tower battlements */}
        <rect x="52" y="87" width="8" height="12" fill="#7B6D5B" />
        <rect x="66" y="87" width="8" height="12" fill="#7B6D5B" />
        <rect x="80" y="87" width="8" height="12" fill="#7B6D5B" />
        {/* Tower window */}
        <ellipse cx="72" cy="130" rx="6" ry="8" fill={isOpen ? "#FFD70040" : "#1a1a2e"} />

        {/* Right tower */}
        <rect x="190" y="100" width="35" height="180" fill="url(#castle-wall)" />
        <polygon points="188,100 207,55 228,100" fill="url(#tower-top)" />
        <rect x="188" y="95" width="40" height="8" fill="#7B6D5B" />
        {/* Right tower battlements */}
        <rect x="188" y="87" width="8" height="12" fill="#7B6D5B" />
        <rect x="202" y="87" width="8" height="12" fill="#7B6D5B" />
        <rect x="216" y="87" width="8" height="12" fill="#7B6D5B" />
        {/* Tower window */}
        <ellipse cx="207" cy="130" rx="6" ry="8" fill={isOpen ? "#FFD70040" : "#1a1a2e"} />

        {/* Center tower (taller) */}
        <rect x="110" y="90" width="60" height="190" fill="url(#castle-wall)" />
        <polygon points="108,90 140,30 172,90" fill="url(#tower-top)" />
        <rect x="108" y="85" width="64" height="8" fill="#7B6D5B" />
        {/* Center battlements */}
        <rect x="110" y="78" width="8" height="10" fill="#7B6D5B" />
        <rect x="128" y="78" width="8" height="10" fill="#7B6D5B" />
        <rect x="146" y="78" width="8" height="10" fill="#7B6D5B" />
        <rect x="162" y="78" width="8" height="10" fill="#7B6D5B" />

        {/* Connecting walls */}
        <rect x="90" y="140" width="20" height="140" fill="#7B6D5B" />
        <rect x="170" y="140" width="20" height="140" fill="#7B6D5B" />
        {/* Wall battlements */}
        <rect x="90" y="133" width="8" height="10" fill="#7B6D5B" />
        <rect x="102" y="133" width="8" height="10" fill="#7B6D5B" />
        <rect x="170" y="133" width="8" height="10" fill="#7B6D5B" />
        <rect x="182" y="133" width="8" height="10" fill="#7B6D5B" />

        {/* Archway */}
        <path
          d="M 110 280 L 110 210 Q 110 175 140 170 Q 170 175 170 210 L 170 280"
          fill={isOpen ? "transparent" : "#2a2a1e"}
          stroke="#6B5B4B"
          strokeWidth="3"
        />
      </g>

      {/* Golden glow through archway (visible when open) */}
      <motion.g
        clipPath="url(#archway-clip)"
        initial={{ opacity: 0 }}
        animate={isOpen ? { opacity: 1 } : glowControls}
      >
        <rect x="105" y="160" width="70" height="130" fill="url(#plan-glow)" />
        {/* Carousel silhouette inside */}
        <circle cx="140" cy="240" r="18" fill="none" stroke="#FFD70060" strokeWidth="1.5" />
        <line x1="140" y1="222" x2="140" y2="210" stroke="#FFD70060" strokeWidth="1.5" />
        {/* Carousel horses */}
        <rect x="128" y="232" width="4" height="12" rx="1" fill="#FFD70040" />
        <rect x="148" y="228" width="4" height="12" rx="1" fill="#FFD70040" />
      </motion.g>

      {/* Portcullis (gate bars) */}
      <motion.g
        clipPath="url(#archway-clip)"
        initial={{ y: 0 }}
        animate={isOpen ? { y: -60 } : portcullisControls}
      >
        {isClosed && (
          <g>
            {/* Vertical bars */}
            {[118, 126, 134, 142, 150, 158].map((x) => (
              <line key={x} x1={x} y1="170" x2={x} y2="280" stroke="#4a4a3a" strokeWidth="2.5" />
            ))}
            {/* Horizontal bars */}
            {[190, 210, 230, 250, 270].map((y) => (
              <line key={y} x1="110" y1={y} x2="170" y2={y} stroke="#4a4a3a" strokeWidth="2" />
            ))}
            {/* Portcullis points at bottom */}
            {[118, 126, 134, 142, 150, 158].map((x) => (
              <polygon key={`p${x}`} points={`${x - 2},280 ${x},286 ${x + 2},280`} fill="#4a4a3a" />
            ))}
          </g>
        )}
      </motion.g>

      {/* Drawbridge */}
      <motion.rect
        x="112"
        y="260"
        width="56"
        height="24"
        rx="2"
        fill="#8B7355"
        stroke="#6B5335"
        strokeWidth="1.5"
        style={{ transformOrigin: "140px 260px" }}
        initial={{ rotateX: 0 }}
        animate={isOpen ? { rotateX: 80 } : drawbridgeControls}
        opacity={isClosed ? 1 : 0.3}
      />

      {/* "Plan" text carved in stonework */}
      <text
        x="140"
        y="158"
        textAnchor="middle"
        className="text-sm font-bold"
        fill={isOpen ? "#FFD700" : "#9B8B7B"}
        fontSize="16"
        fontFamily="serif"
        letterSpacing="3"
      >
        PLAN
      </text>

      {/* Subtle overlay for closed state */}
      {isClosed && (
        <rect width="280" height="320" fill="rgba(0,0,0,0.3)" rx="16" />
      )}
    </svg>
  );
}
