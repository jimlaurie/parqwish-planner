"use client";

import Link from "next/link";
import { useContentHomeHref } from "@/hooks/use-content-home-href";

// ==================== COMPONENT ====================
// An explicit "Home" nav item for the Guide/Story/Blog header, alongside
// Story/Blog/Guide — added after a reader reported not realizing the logo
// itself was clickable to get back. Same target logic as ContentLogoLink
// (see useContentHomeHref), just a second, more discoverable affordance.

const linkClass = "px-3 py-1.5 rounded-full hover:bg-white/5";
const linkStyle = { color: "var(--color-text-muted)" };

export default function ContentHomeLink() {
  const { href, internal } = useContentHomeHref();

  if (internal) {
    return (
      <Link href={href} className={linkClass} style={linkStyle}>
        Home
      </Link>
    );
  }

  return (
    <a href={href} className={linkClass} style={linkStyle}>
      Home
    </a>
  );
}
