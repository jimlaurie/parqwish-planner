import { notFound } from "next/navigation";
import Link from "next/link";
import { MOBILE_SCREENS, getMobileScreen } from "@/lib/guide-data/features-mobile";
import AnnotatedScreen from "@/components/guide/AnnotatedScreen";
import type { PwaScreen } from "@/lib/guide-data/features-pwa";

interface Props { params: { screen: string } }

export function generateStaticParams() {
  return MOBILE_SCREENS.map((s) => ({ screen: s.slug }));
}

// Adapt MobileScreen to PwaScreen shape so AnnotatedScreen can render it
function toAnnotated(screenshot: string, callouts: { id: number; x: number; y: number; title: string; description: string }[], title: string, subtitle: string): PwaScreen {
  return { slug: "", title, subtitle, screenshot, callouts };
}

export default function MobileScreenPage({ params }: Props) {
  const screen = getMobileScreen(params.screen);
  if (!screen) notFound();

  const currentIndex = MOBILE_SCREENS.findIndex((s) => s.slug === params.screen);
  const prev = currentIndex > 0 ? MOBILE_SCREENS[currentIndex - 1] : null;
  const next = currentIndex < MOBILE_SCREENS.length - 1 ? MOBILE_SCREENS[currentIndex + 1] : null;

  const mainScreen = toAnnotated(screen.screenshot, screen.callouts, screen.title, screen.subtitle);
  const editScreen = screen.editScreenshot
    ? toAnnotated(screen.editScreenshot, screen.editCallouts ?? [], screen.editTitle ?? "Edit Form", "")
    : null;

  return (
    <div style={{ paddingBottom: "48px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", fontSize: "var(--text-sm)", color: "var(--color-text-dim)" }}>
        <Link href="/guide" style={{ color: "var(--color-text-dim)", textDecoration: "none" }}>Guide</Link>
        <span>›</span>
        <Link href="/guide/features/mobile" style={{ color: "var(--color-text-dim)", textDecoration: "none" }}>Mobile App</Link>
        <span>›</span>
        <span style={{ color: "var(--color-text-muted)" }}>{screen.title}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "var(--text-2xl)", fontWeight: "var(--font-bold)", color: "var(--color-heading)" }}>
          {screen.title}
        </h1>
        <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)", maxWidth: "640px" }}>
          {screen.subtitle}
        </p>
      </div>

      <p style={{ margin: "0 0 20px", fontSize: "var(--text-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>
        Tap a number badge on the screenshot or its entry below to reveal details.
      </p>

      {/* Main screen — side-by-side: portrait screenshot left, legend right */}
      <AnnotatedScreen screen={mainScreen} layout="side-by-side" />

      {/* Edit modal section */}
      {editScreen && (
        <div style={{ marginTop: "48px" }}>
          <h2 style={{
            fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "1.5px",
            fontWeight: "var(--font-bold)", color: "var(--color-gold)",
            margin: "0 0 16px", borderLeft: "3px solid var(--color-gold)", paddingLeft: "8px",
          }}>
            {screen.editTitle}
          </h2>
          <AnnotatedScreen screen={editScreen} layout="side-by-side" />
        </div>
      )}

      {/* Prev / Next */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: "40px", paddingTop: "24px", borderTop: "1px solid var(--color-border-subtle)",
        gap: "12px", flexWrap: "wrap",
      }}>
        {prev ? (
          <Link href={`/guide/features/mobile/${prev.slug}`} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>
            ← {prev.title}
          </Link>
        ) : <div />}
        <Link href="/guide/features/mobile" style={{ fontSize: "var(--text-xs)", color: "var(--color-text-dim)", textDecoration: "none" }}>
          All screens
        </Link>
        {next ? (
          <Link href={`/guide/features/mobile/${next.slug}`} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)" }}>
            {next.title} →
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
