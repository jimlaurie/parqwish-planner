import { notFound } from "next/navigation";
import Link from "next/link";
import { PWA_SCREENS, getPwaScreen } from "@/lib/guide-data/features-pwa";
import AnnotatedScreen from "@/components/guide/AnnotatedScreen";

interface Props {
  params: { screen: string };
}

// Static generation for all PWA screens
export function generateStaticParams() {
  return PWA_SCREENS.map((s) => ({ screen: s.slug }));
}

export default function PwaScreenPage({ params }: Props) {
  const screen = getPwaScreen(params.screen);
  if (!screen) notFound();

  const currentIndex = PWA_SCREENS.findIndex((s) => s.slug === params.screen);
  const prev = currentIndex > 0 ? PWA_SCREENS[currentIndex - 1] : null;
  const next = currentIndex < PWA_SCREENS.length - 1 ? PWA_SCREENS[currentIndex + 1] : null;

  return (
    <div style={{ paddingBottom: "48px" }}>

      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "20px",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-dim)",
        }}
      >
        <Link href="/guide" style={{ color: "var(--color-text-dim)", textDecoration: "none" }}>Guide</Link>
        <span>›</span>
        <Link href="/guide/features/pwa" style={{ color: "var(--color-text-dim)", textDecoration: "none" }}>Web Planner</Link>
        <span>›</span>
        <span style={{ color: "var(--color-text-muted)" }}>{screen.title}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "var(--text-2xl)",
            fontWeight: "var(--font-bold)",
            color: "var(--color-heading)",
          }}
        >
          {screen.title}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-base)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--leading-relaxed)",
            maxWidth: "640px",
          }}
        >
          {screen.subtitle}
        </p>
      </div>

      {/* Instruction hint */}
      <p
        style={{
          margin: "0 0 20px",
          fontSize: "var(--text-xs)",
          color: "var(--color-text-dim)",
          fontStyle: "italic",
        }}
      >
        Tap a number badge on the screenshot or its entry below to reveal details.
      </p>

      {/* Annotated screenshot + legend */}
      <AnnotatedScreen screen={screen} />

      {/* Prev / Next navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "40px",
          paddingTop: "24px",
          borderTop: "1px solid var(--color-border-subtle)",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {prev ? (
          <Link
            href={`/guide/features/pwa/${prev.slug}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
            }}
          >
            ← {prev.title}
          </Link>
        ) : <div />}

        <Link
          href="/guide/features/pwa"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-text-dim)",
            textDecoration: "none",
          }}
        >
          All screens
        </Link>

        {next ? (
          <Link
            href={`/guide/features/pwa/${next.slug}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
            }}
          >
            {next.title} →
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
