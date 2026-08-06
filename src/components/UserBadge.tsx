"use client";

// ==================== USER BADGE ====================
// Reusable colored dot + name pill for identifying item ownership

interface UserBadgeProps {
  color: string;
  name: string;
  size?: "sm" | "md";
  className?: string;
}

export default function UserBadge({
  color,
  name,
  size = "sm",
  className = "",
}: UserBadgeProps) {
  const dotSize = size === "sm" ? "w-2 h-2" : "w-3 h-3";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 ${padding} rounded-full ${textSize} font-medium ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color,
      }}
      title={name}
    >
      <span
        className={`${dotSize} rounded-full shrink-0`}
        style={{ backgroundColor: color }}
      />
      <span className="truncate max-w-[80px]">{name}</span>
    </span>
  );
}
