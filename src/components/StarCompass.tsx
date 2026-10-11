"use client";

import { motion } from "framer-motion";

// ==================== TYPES ====================

interface StarCompassProps {
  tripName: string | null;
  onClick?: () => void;
}

// ==================== COMPONENT ====================

export default function StarCompass({ tripName, onClick }: StarCompassProps) {
  const hasTrip = !!tripName;

  // 8-point compass rose path
  const compassPoints = () => {
    const cx = 140, cy = 160;
    const outerR = 100, innerR = 42, midR = 66;
    const points: string[] = [];

    for (let i = 0; i < 8; i++) {
      const angle = (i * 45 - 90) * (Math.PI / 180);
      const isCardinal = i % 2 === 0;
      const r = isCardinal ? outerR : midR;

      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      points.push(`${px},${py}`);

      const midAngle = ((i * 45 + 22.5) - 90) * (Math.PI / 180);
      const mpx = cx + innerR * Math.cos(midAngle);
      const mpy = cy + innerR * Math.sin(midAngle);
      points.push(`${mpx},${mpy}`);
    }

    return points.join(" ");
  };

  return (
    <motion.button
      onClick={onClick}
      className="relative w-full cursor-pointer"
      style={{ opacity: hasTrip ? 1 : 0.4 }}
      whileHover={hasTrip ? { scale: 1.04 } : undefined}
      whileTap={hasTrip ? { scale: 0.95 } : undefined}
    >
      <motion.svg
        viewBox="0 0 280 320"
        className="w-full h-full"
        whileHover={hasTrip ? { rotate: 8 } : undefined}
        transition={{ type: "spring", stiffness: 100, damping: 10 }}
      >
        <defs>
          <radialGradient id="compass-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-gold, #FFD700)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-gold, #FFD700)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="compass-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-gold, #FFD700)" />
            <stop offset="50%" stopColor="#DAA520" />
            <stop offset="100%" stopColor="var(--color-gold, #FFD700)" />
          </linearGradient>
        </defs>

        {/* Background to match portal aspect ratio */}
        <rect width="280" height="320" fill="transparent" rx="16" />

        {/* Outer glow */}
        <circle cx="140" cy="160" r="120" fill="url(#compass-glow)" />

        {/* Outer ring */}
        <circle
          cx="140" cy="160" r="110"
          fill="none"
          stroke={hasTrip ? "var(--color-gold, #FFD700)" : "var(--color-text-dim, #555)"}
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Middle ring */}
        <circle
          cx="140" cy="160" r="80"
          fill="none"
          stroke={hasTrip ? "var(--color-gold, #FFD700)" : "var(--color-text-dim, #555)"}
          strokeWidth="1"
          opacity="0.25"
        />

        {/* Inner ring */}
        <circle
          cx="140" cy="160" r="38"
          fill="none"
          stroke={hasTrip ? "var(--color-gold, #FFD700)" : "var(--color-text-dim, #555)"}
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Compass rose (8 points) — with dark outline for light mode visibility */}
        <polygon
          points={compassPoints()}
          fill={hasTrip ? "url(#compass-gold)" : "var(--color-text-dim, #444)"}
          opacity={hasTrip ? 0.85 : 0.5}
          stroke={hasTrip ? "#2C2850" : "var(--color-text-dim, #555)"}
          strokeWidth="1.5"
        />
        {/* Gold stroke on top for depth */}
        <polygon
          points={compassPoints()}
          fill="none"
          opacity={hasTrip ? 0.6 : 0}
          stroke={hasTrip ? "var(--color-gold, #FFD700)" : "transparent"}
          strokeWidth="0.5"
        />

        {/* Cardinal direction marks */}
        <text x="140" y="52" textAnchor="middle" fill={hasTrip ? "var(--color-heading, #FFD700)" : "var(--color-text-dim, #666)"} fontSize="16" fontWeight="bold" fontFamily="serif" stroke={hasTrip ? "#2C2850" : "none"} strokeWidth="0.3">N</text>
        <text x="140" y="278" textAnchor="middle" fill={hasTrip ? "var(--color-heading, #FFD700)" : "var(--color-text-dim, #666)"} fontSize="16" fontWeight="bold" fontFamily="serif" stroke={hasTrip ? "#2C2850" : "none"} strokeWidth="0.3">S</text>
        <text x="24" y="165" textAnchor="middle" fill={hasTrip ? "var(--color-heading, #FFD700)" : "var(--color-text-dim, #666)"} fontSize="16" fontWeight="bold" fontFamily="serif" stroke={hasTrip ? "#2C2850" : "none"} strokeWidth="0.3">W</text>
        <text x="256" y="165" textAnchor="middle" fill={hasTrip ? "var(--color-heading, #FFD700)" : "var(--color-text-dim, #666)"} fontSize="16" fontWeight="bold" fontFamily="serif" stroke={hasTrip ? "#2C2850" : "none"} strokeWidth="0.3">E</text>

        {/* Center circle with outline */}
        <circle
          cx="140" cy="160" r="10"
          fill={hasTrip ? "var(--color-gold, #FFD700)" : "var(--color-text-dim, #444)"}
          stroke="#2C2850"
          strokeWidth="1"
        />
      </motion.svg>
    </motion.button>
  );
}
