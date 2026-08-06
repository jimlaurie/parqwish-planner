"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

// ==================== TYPES ====================

interface PublishPortalProps {
  state: "closed" | "opening" | "open";
  onAnimationComplete?: () => void;
}

// ==================== COMPONENT ====================

export default function PublishPortal({ state, onAnimationComplete }: PublishPortalProps) {
  const starsControls = useAnimation();
  const planetControls = useAnimation();

  useEffect(() => {
    if (state === "opening") {
      const animate = async () => {
        // Stars streak into hyperspace
        await starsControls.start({
          scaleX: 8,
          opacity: 0.3,
          transition: { duration: 1.2, ease: "easeIn" },
        });
        // Stars resolve, planet appears
        await Promise.all([
          starsControls.start({
            scaleX: 1,
            opacity: 0.7,
            transition: { duration: 0.4 },
          }),
          planetControls.start({
            opacity: 1,
            scale: 1,
            transition: { duration: 0.8, ease: "easeOut" },
          }),
        ]);
        onAnimationComplete?.();
      };
      animate();
    }
  }, [state, starsControls, planetControls, onAnimationComplete]);

  const isOpen = state === "open";
  const isClosed = state === "closed";

  return (
    <svg viewBox="0 0 280 320" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="planet-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#64B5F6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#64B5F6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="earth-gradient" cx="40%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#4A90D9" />
          <stop offset="50%" stopColor="#2E6EB5" />
          <stop offset="100%" stopColor="#1A4A7A" />
        </radialGradient>
        <radialGradient id="alien-planet" cx="40%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#E8A87C" />
          <stop offset="50%" stopColor="#D4845A" />
          <stop offset="100%" stopColor="#8B5A3A" />
        </radialGradient>
        <linearGradient id="console-surface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a3e" />
          <stop offset="100%" stopColor="#1a1a2e" />
        </linearGradient>
      </defs>

      {/* Deep space background */}
      <rect width="280" height="320" fill="#050510" rx="16" />

      {/* Star field */}
      <motion.g
        initial={{ scaleX: 1, opacity: isClosed ? 0.3 : 0.7 }}
        animate={isOpen ? { scaleX: 1, opacity: 0.7 } : starsControls}
        style={{ transformOrigin: "140px 120px" }}
      >
        {/* Random stars */}
        {[
          [30, 30], [65, 55], [100, 20], [150, 45], [200, 30], [240, 60],
          [45, 90], [110, 75], [175, 85], [220, 40], [260, 80],
          [20, 130], [80, 110], [130, 130], [190, 115], [250, 135],
          [55, 160], [120, 155], [180, 145], [230, 165],
          [35, 70], [170, 25], [95, 140], [215, 100],
        ].map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={Math.random() > 0.7 ? 1.5 : 1}
            fill="white"
            opacity={0.3 + Math.random() * 0.5}
          />
        ))}
      </motion.g>

      {/* Earth (closed) or alien planet (open) through windshield */}
      {isClosed ? (
        /* Earth through windshield */
        <g>
          <circle cx="140" cy="120" r="45" fill="url(#earth-gradient)" />
          {/* Continents suggestion */}
          <path
            d="M 120 100 Q 130 95 140 100 Q 145 110 135 115 Q 125 110 120 100"
            fill="#3D8B37"
            opacity="0.6"
          />
          <path
            d="M 150 105 Q 160 100 165 110 Q 160 120 150 115 Z"
            fill="#3D8B37"
            opacity="0.5"
          />
          {/* Atmosphere glow */}
          <circle cx="140" cy="120" r="48" fill="none" stroke="#64B5F680" strokeWidth="2" />
        </g>
      ) : (
        /* Alien planet (after hyperspace) */
        <motion.g
          initial={{ opacity: 0, scale: 0.5 }}
          animate={planetControls}
          style={{ transformOrigin: "140px 120px" }}
        >
          <circle cx="140" cy="120" r="50" fill="url(#planet-glow)" />
          <circle cx="140" cy="120" r="40" fill="url(#alien-planet)" />
          {/* Planet rings */}
          <ellipse
            cx="140"
            cy="120"
            rx="60"
            ry="12"
            fill="none"
            stroke="#D4845A"
            strokeWidth="3"
            opacity="0.4"
            transform="rotate(-15, 140, 120)"
          />
          {/* Surface features */}
          <circle cx="130" cy="110" r="8" fill="#C4744A" opacity="0.5" />
          <circle cx="150" cy="125" r="5" fill="#B8644A" opacity="0.4" />
          <circle cx="138" cy="135" r="6" fill="#C4744A" opacity="0.3" />
        </motion.g>
      )}

      {/* Cockpit frame — windshield */}
      <g>
        {/* Windshield frame */}
        <path
          d="M 16 10 Q 16 0 30 0 L 250 0 Q 264 0 264 10 L 264 180 Q 200 200 140 195 Q 80 200 16 180 Z"
          fill="none"
          stroke="#3a3a5a"
          strokeWidth="4"
        />
        {/* Windshield divider */}
        <line x1="140" y1="0" x2="140" y2="195" stroke="#3a3a5a" strokeWidth="2" opacity="0.5" />

        {/* Top console */}
        <rect x="16" y="0" width="248" height="8" rx="4" fill="#2a2a3e" />

        {/* Console buttons along top */}
        <circle cx="60" cy="4" r="2" fill="#FF4444" opacity="0.7" />
        <circle cx="75" cy="4" r="2" fill="#44FF44" opacity="0.5" />
        <circle cx="90" cy="4" r="2" fill="#4444FF" opacity="0.6" />
        <circle cx="190" cy="4" r="2" fill="#FFFF44" opacity="0.5" />
        <circle cx="205" cy="4" r="2" fill="#44FFFF" opacity="0.6" />
        <circle cx="220" cy="4" r="2" fill="#FF44FF" opacity="0.5" />
      </g>

      {/* Lower console / dashboard */}
      <g>
        <path
          d="M 0 200 Q 80 190 140 195 Q 200 190 280 200 L 280 320 L 0 320 Z"
          fill="url(#console-surface)"
        />

        {/* Console edge highlight */}
        <path
          d="M 0 200 Q 80 190 140 195 Q 200 190 280 200"
          fill="none"
          stroke="#4a4a6a"
          strokeWidth="2"
        />

        {/* Switches row */}
        {[50, 80, 110, 170, 200, 230].map((x) => (
          <g key={`sw${x}`}>
            <rect x={x - 4} y="210" width="8" height="16" rx="2" fill="#1a1a2e" stroke="#4a4a6a" strokeWidth="0.5" />
            <rect
              x={x - 2}
              y={x % 60 === 0 ? 210 : 218}
              width="4"
              height="8"
              rx="1"
              fill={x % 60 === 0 ? "#44FF44" : "#666"}
            />
          </g>
        ))}

        {/* Gauges */}
        <circle cx="70" cy="255" r="18" fill="#0a0a1e" stroke="#4a4a6a" strokeWidth="1" />
        <circle cx="70" cy="255" r="14" fill="none" stroke="#3a3a5a" strokeWidth="0.5" />
        <line x1="70" y1="255" x2="70" y2="243" stroke="#FF4444" strokeWidth="1.5" transform="rotate(30, 70, 255)" />

        <circle cx="210" cy="255" r="18" fill="#0a0a1e" stroke="#4a4a6a" strokeWidth="1" />
        <circle cx="210" cy="255" r="14" fill="none" stroke="#3a3a5a" strokeWidth="0.5" />
        <line x1="210" y1="255" x2="210" y2="243" stroke="#64B5F6" strokeWidth="1.5" transform="rotate(-20, 210, 255)" />

        {/* Center display screen */}
        <rect x="105" y="235" width="70" height="40" rx="4" fill="#0a0a2e" stroke="#4a4a6a" strokeWidth="1" />
        {/* Display readout lines */}
        <line x1="112" y1="248" x2="168" y2="248" stroke="#64B5F6" strokeWidth="1" opacity="0.5" />
        <line x1="112" y1="255" x2="155" y2="255" stroke="#64B5F6" strokeWidth="1" opacity="0.3" />
        <line x1="112" y1="262" x2="162" y2="262" stroke="#64B5F6" strokeWidth="1" opacity="0.4" />

        {/* Status LEDs */}
        {[115, 130, 145, 160].map((x) => (
          <circle key={`led${x}`} x={x} cy="290" r="3" fill={x === 145 ? "#FF4444" : "#44FF44"} opacity="0.6" cx={x} />
        ))}
      </g>

      {/* "PUBLISH" neon text on overhead console */}
      <text
        x="140"
        y="218"
        textAnchor="middle"
        fill="#FF4444"
        fontSize="11"
        fontFamily="monospace"
        fontWeight="bold"
        letterSpacing="3"
        opacity={0.9}
      >
        PUBLISH
      </text>
      {/* Neon glow effect */}
      <text
        x="140"
        y="218"
        textAnchor="middle"
        fill="#FF4444"
        fontSize="11"
        fontFamily="monospace"
        fontWeight="bold"
        letterSpacing="3"
        opacity={0.3}
        filter="blur(3px)"
      >
        PUBLISH
      </text>

      {/* Closed state overlay */}
      {isClosed && (
        <rect width="280" height="320" fill="rgba(0,0,0,0.25)" rx="16" />
      )}
    </svg>
  );
}
