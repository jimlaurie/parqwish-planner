"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

// ==================== TYPES ====================

interface PlayPortalProps {
  state: "closed" | "opening" | "open";
  onAnimationComplete?: () => void;
}

// ==================== COMPONENT ====================

export default function PlayPortal({ state, onAnimationComplete }: PlayPortalProps) {
  const torchControls = useAnimation();
  const sceneControls = useAnimation();

  useEffect(() => {
    if (state === "opening") {
      const animate = async () => {
        // Torches ignite
        await torchControls.start({
          opacity: 1,
          scale: 1,
          transition: { duration: 0.8, ease: "easeOut" },
        });
        // Scene illuminated
        await sceneControls.start({
          opacity: 1,
          transition: { duration: 0.8 },
        });
        onAnimationComplete?.();
      };
      animate();
    }
  }, [state, torchControls, sceneControls, onAnimationComplete]);

  const isOpen = state === "open";
  const isClosed = state === "closed";

  return (
    <svg viewBox="0 0 280 320" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="torch-glow-l" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFA500" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#FFA500" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="torch-glow-r" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFA500" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#FFA500" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bamboo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6B8E23" />
          <stop offset="50%" stopColor="#8FBC3A" />
          <stop offset="100%" stopColor="#6B8E23" />
        </linearGradient>
        <linearGradient id="jungle-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1a0a" />
          <stop offset="100%" stopColor="#1a2a1a" />
        </linearGradient>
      </defs>

      {/* Dark jungle background */}
      <rect width="280" height="320" fill={isClosed ? "#0a0a1e" : "url(#jungle-bg)"} rx="16" />

      {/* Background jungle scene (visible when lit) */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={isOpen ? { opacity: 1 } : sceneControls}
      >
        {/* Dense foliage */}
        <ellipse cx="50" cy="120" rx="40" ry="35" fill="#1a3a1a" />
        <ellipse cx="230" cy="130" rx="45" ry="30" fill="#1a3a1a" />
        <ellipse cx="140" cy="100" rx="50" ry="25" fill="#0a2a0a" />

        {/* Hanging vines */}
        <path d="M 60 100 Q 55 140 65 170" fill="none" stroke="#2a5a2a" strokeWidth="2" />
        <path d="M 220 110 Q 225 150 215 180" fill="none" stroke="#2a5a2a" strokeWidth="2" />
        <path d="M 100 95 Q 95 125 105 155" fill="none" stroke="#2a5a2a" strokeWidth="1.5" />

        {/* Water/river */}
        <path
          d="M 0 250 Q 70 240 140 255 Q 210 270 280 250 L 280 320 L 0 320 Z"
          fill="#1a3a5a"
          opacity="0.6"
        />

        {/* Boat at dock */}
        <g transform="translate(130, 255)">
          <path d="M -25 5 Q -20 15 0 15 Q 20 15 25 5 L 20 0 L -20 0 Z" fill="#5a3a1a" />
          <rect x="-15" y="-10" width="30" height="12" rx="2" fill="#6B4914" />
          <rect x="-2" y="-25" width="4" height="18" fill="#5a3a1a" />
        </g>

        {/* Dock planks */}
        <rect x="80" y="248" width="40" height="6" rx="1" fill="#6B4914" />
        <rect x="85" y="254" width="4" height="12" fill="#5a3a1a" />
        <rect x="110" y="254" width="4" height="12" fill="#5a3a1a" />
      </motion.g>

      {/* Bamboo archway frame */}
      <g>
        {/* Left bamboo posts */}
        <rect x="30" y="60" width="12" height="250" rx="4" fill="url(#bamboo)" />
        <rect x="45" y="80" width="10" height="230" rx="3" fill="url(#bamboo)" opacity="0.8" />
        {/* Bamboo joints */}
        {[100, 150, 200, 250].map((y) => (
          <rect key={`lj${y}`} x="28" y={y} width="16" height="3" rx="1" fill="#5a7a1a" />
        ))}

        {/* Right bamboo posts */}
        <rect x="238" y="60" width="12" height="250" rx="4" fill="url(#bamboo)" />
        <rect x="225" y="80" width="10" height="230" rx="3" fill="url(#bamboo)" opacity="0.8" />
        {[100, 150, 200, 250].map((y) => (
          <rect key={`rj${y}`} x="236" y={y} width="16" height="3" rx="1" fill="#5a7a1a" />
        ))}

        {/* Top cross bamboo */}
        <rect x="25" y="60" width="230" height="14" rx="5" fill="url(#bamboo)" />
        <rect x="25" y="76" width="230" height="10" rx="4" fill="url(#bamboo)" opacity="0.7" />

        {/* Decorative bamboo cross */}
        <line x1="55" y1="60" x2="225" y2="60" stroke="#5a7a1a" strokeWidth="2" />
      </g>

      {/* Tiki torch — Left */}
      <g transform="translate(55, 90)">
        {/* Torch pole */}
        <rect x="-3" y="10" width="6" height="80" rx="2" fill="#5a3a1a" />
        {/* Torch head */}
        <rect x="-8" y="0" width="16" height="14" rx="3" fill="#3a2a1a" />
        {/* Flame */}
        <motion.g
          initial={{ opacity: isClosed ? 0 : 1, scale: isClosed ? 0.3 : 1 }}
          animate={isOpen ? { opacity: 1, scale: 1 } : torchControls}
        >
          <ellipse cx="0" cy="-4" rx="8" ry="12" fill="#FFA500" opacity="0.8" />
          <ellipse cx="0" cy="-6" rx="5" ry="8" fill="#FFD700" opacity="0.9" />
          <ellipse cx="0" cy="-8" rx="3" ry="5" fill="#FFFF00" opacity="0.7" />
          {/* Glow */}
          <circle cx="0" cy="0" r="35" fill="url(#torch-glow-l)" />
        </motion.g>
      </g>

      {/* Tiki torch — Right */}
      <g transform="translate(225, 90)">
        <rect x="-3" y="10" width="6" height="80" rx="2" fill="#5a3a1a" />
        <rect x="-8" y="0" width="16" height="14" rx="3" fill="#3a2a1a" />
        <motion.g
          initial={{ opacity: isClosed ? 0 : 1, scale: isClosed ? 0.3 : 1 }}
          animate={isOpen ? { opacity: 1, scale: 1 } : torchControls}
        >
          <ellipse cx="0" cy="-4" rx="8" ry="12" fill="#FFA500" opacity="0.8" />
          <ellipse cx="0" cy="-6" rx="5" ry="8" fill="#FFD700" opacity="0.9" />
          <ellipse cx="0" cy="-8" rx="3" ry="5" fill="#FFFF00" opacity="0.7" />
          <circle cx="0" cy="0" r="35" fill="url(#torch-glow-r)" />
        </motion.g>
      </g>

      {/* Tiki faces on archway */}
      <g transform="translate(80, 62)">
        {/* Eyes */}
        <ellipse cx="0" cy="0" rx="3" ry="2.5" fill="#2a1a0a" />
        <ellipse cx="12" cy="0" rx="3" ry="2.5" fill="#2a1a0a" />
        {/* Mouth */}
        <path d="M -1 5 Q 6 10 13 5" fill="none" stroke="#2a1a0a" strokeWidth="2" />
      </g>
      <g transform="translate(180, 62)">
        <ellipse cx="0" cy="0" rx="3" ry="2.5" fill="#2a1a0a" />
        <ellipse cx="12" cy="0" rx="3" ry="2.5" fill="#2a1a0a" />
        <path d="M -1 5 Q 6 10 13 5" fill="none" stroke="#2a1a0a" strokeWidth="2" />
      </g>

      {/* "PLAY" text in bamboo lettering */}
      <text
        x="140"
        y="56"
        textAnchor="middle"
        fill={isOpen ? "#FFA500" : "#4a6a2a"}
        fontSize="18"
        fontWeight="bold"
        fontFamily="serif"
        letterSpacing="4"
      >
        PLAY
      </text>

      {/* Flickering torch animation for open state */}
      {isOpen && (
        <style>{`
          @keyframes flicker {
            0%, 100% { opacity: 0.8; transform: scaleY(1); }
            25% { opacity: 0.9; transform: scaleY(1.05); }
            50% { opacity: 0.7; transform: scaleY(0.95); }
            75% { opacity: 1; transform: scaleY(1.02); }
          }
        `}</style>
      )}

      {/* Closed state overlay */}
      {isClosed && (
        <rect width="280" height="320" fill="rgba(0,0,0,0.3)" rx="16" />
      )}
    </svg>
  );
}
