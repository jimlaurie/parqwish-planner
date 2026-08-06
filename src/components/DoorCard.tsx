"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface DoorCardProps {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  accentColor: string;
  icon: string;
  progress?: string;
  badge?: number;
  disabled?: boolean;
  onClick?: () => void;
}

export default function DoorCard({
  title,
  subtitle,
  description,
  href,
  accentColor,
  icon,
  progress,
  badge,
  disabled = false,
  onClick,
}: DoorCardProps) {
  const content = (
    <motion.div
      className="relative rounded-2xl border border-white/10 p-6
                 overflow-hidden flex flex-col items-center justify-center gap-3
                 min-h-[200px] md:min-h-[240px]"
      style={{
        backgroundColor: "var(--color-bg-card)",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
      whileHover={
        disabled
          ? undefined
          : {
              scale: 1.03,
              borderColor: accentColor,
              boxShadow: `0 0 30px ${accentColor}20`,
            }
      }
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-10 rounded-2xl"
        style={{
          background: `radial-gradient(circle at center, ${accentColor}, transparent 70%)`,
        }}
      />

      {/* Badge */}
      {badge !== undefined && badge >= 0 && !disabled && (
        <div
          className="absolute top-3 right-3 min-w-[24px] h-6 rounded-full
                     flex items-center justify-center px-1.5 text-xs font-bold z-10"
          style={{
            backgroundColor: accentColor,
            color: "var(--color-bg-deep)",
          }}
        >
          {badge}
        </div>
      )}

      {/* Content */}
      <span className="text-4xl md:text-5xl relative z-10">{icon}</span>
      <h2
        className="text-xl md:text-2xl font-bold relative z-10"
        style={{ color: accentColor }}
      >
        {title}
      </h2>
      <p
        className="text-sm relative z-10"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {subtitle}
      </p>
      <p
        className="text-xs text-center relative z-10"
        style={{ color: "var(--color-text-muted)" }}
      >
        {disabled ? "Coming soon" : description}
      </p>
      {progress && !disabled && (
        <span
          className="text-xs mt-1 relative z-10"
          style={{ color: "var(--color-text-dim)" }}
        >
          {progress}
        </span>
      )}
    </motion.div>
  );

  if (disabled) {
    return <div className="block">{content}</div>;
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
