"use client";

import Link from "next/link";
import Image from "next/image";
import { useContentHomeHref } from "@/hooks/use-content-home-href";

// ==================== COMPONENT ====================
// The logo in the Guide/Story/Blog header (see (content)/layout.tsx).
// See useContentHomeHref for why the target depends on whether this tab
// has been inside the Planner app this session.

export default function ContentLogoLink() {
  const { href, internal } = useContentHomeHref();

  const logo = (
    <Image
      src="/images/parqwish-logo.png"
      alt="ParQwish"
      width={120}
      height={30}
      className="h-6 w-auto"
      priority
    />
  );

  if (internal) {
    return (
      <Link href={href} className="shrink-0">
        {logo}
      </Link>
    );
  }

  return (
    <a href={href} className="shrink-0">
      {logo}
    </a>
  );
}
