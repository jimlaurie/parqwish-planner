import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

// ==================== COMPONENT ====================
// Layout for Guide/Story/Blog — content someone can land on directly from
// an outside link (Reddit, a search result) without ever opening the
// planning tool. Deliberately excludes AppInit (Dexie migrations, Firebase
// auth/sync init), TopNavBar (trip-gated nav backed by a Dexie live query),
// and the install/update banners — none of that should load, or nag a
// reader, just to read a page.

export default function ContentGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <nav
        className="sticky top-0 z-40 w-full backdrop-blur-md"
        style={{
          backgroundColor: "var(--color-nav-bg)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between gap-3 h-14 flex-wrap">
            {/* Plain <a>, not <Link> — this app is deployed at app.parqwish.com,
                so a Next.js Link to "/" would land on the Planner's own
                dashboard. The logo on a content page should return the
                reader to the actual marketing site they arrived from. */}
            <a href="https://parqwish.com" className="shrink-0">
              <Image
                src="/images/parqwish-logo.png"
                alt="ParQwish"
                width={120}
                height={30}
                className="h-6 w-auto"
                priority
              />
            </a>

            <div className="flex items-center gap-1 text-sm font-medium">
              <Link
                href="/story"
                className="px-3 py-1.5 rounded-full hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
              >
                Story
              </Link>
              <Link
                href="/blog"
                className="px-3 py-1.5 rounded-full hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
              >
                Blog
              </Link>
              <Link
                href="/guide"
                className="px-3 py-1.5 rounded-full hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
              >
                Guide
              </Link>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <ThemeToggle />
              <Link
                href="/"
                className="px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
              >
                Plan a Trip
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main id="main-content">{children}</main>
    </>
  );
}
