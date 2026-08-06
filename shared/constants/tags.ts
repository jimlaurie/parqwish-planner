// ==================== WISH TAGS ====================

import type { WishTagId } from "../types/wish";

export interface WishTag {
  id: WishTagId;
  label: string;
  icon: string;
}

export const WISH_TAGS: readonly WishTag[] = [
  { id: "rides", label: "Rides", icon: "🎢" },
  { id: "shows", label: "Shows", icon: "🎭" },
  { id: "eats", label: "Dining", icon: "🍽️" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "place", label: "Places", icon: "📍" },
  { id: "other", label: "Other", icon: "⭐" },
] as const;

export function getTagById(id: string): WishTag | undefined {
  return WISH_TAGS.find((t) => t.id === id);
}

export function getTagIcon(id: string): string {
  return getTagById(id)?.icon ?? "⭐";
}
