// ==================== BLOG POST REGISTRY ====================
// Single source of truth for the /blog index listing. Each post itself is a
// hand-authored page at src/app/blog/<slug>/page.tsx (same pattern as the
// guide's feature pages) — this file only holds what's needed to list and
// link to them. Keep entries sorted newest first isn't required; the index
// page sorts by date.

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  excerpt: string;
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "2026-09-09-photo-gallery-and-testflight",
    title: "The Planner gets a Photo Gallery, and Pal heads to TestFlight",
    date: "2026-09-09",
    excerpt:
      "ParQ Wish Pal build 68 is in Apple's queue, a date-formatting bug that was quietly breaking the Ready Now list and park hours, plus a catch-up on what shipped on the web planner: a real Photo Gallery, a proper Story intro, and some navigation fixes.",
  },
  {
    slug: "2026-08-17-trip-maps-and-ai-recaps",
    title: "Trip maps, photo imports, and a smarter Preview sidebar",
    date: "2026-08-17",
    excerpt:
      "GPS trails you can correct by hand, an AI-assisted trip recap, pulling photos straight from your camera roll, and a Preview page that finally shows everything you can schedule.",
  },
];

export function getSortedPosts(): BlogPostMeta[] {
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}
