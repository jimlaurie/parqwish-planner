import Link from "next/link";
import { MOBILE_SCREENS } from "@/lib/guide-data/features-mobile";
import MobileScreenCard from "@/components/guide/MobileScreenCard";

export default function MobileFeaturesIndex() {
  return (
    <div style={{ paddingBottom: "48px" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <Link href="/guide" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-dim)", textDecoration: "none" }}>Guide</Link>
          <span style={{ color: "var(--color-text-dim)" }}>›</span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Feature Reference</span>
        </div>
        <h1 style={{ margin: "0 0 10px", fontSize: "var(--text-3xl)", fontWeight: "var(--font-bold)", color: "var(--color-heading)" }}>
          📱 Mobile App — Feature Reference
        </h1>
        <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)", maxWidth: "600px" }}>
          Tap any screen below for an annotated view. Click a number badge on the screenshot
          or its entry in the legend to see what it does.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
        {MOBILE_SCREENS.map((s) => (
          <MobileScreenCard key={s.slug} screen={s} />
        ))}
      </div>
    </div>
  );
}
