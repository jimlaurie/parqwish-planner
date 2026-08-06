import Image from "next/image";

interface ScreenshotSlotProps {
  label: string;
  aspect: "mobile" | "desktop";
  src?: string;
}

const ASPECT: Record<"mobile" | "desktop", { ratio: string; maxWidth: string; width: number; height: number }> = {
  mobile:  { ratio: "9 / 19.5", maxWidth: "260px", width: 390,  height: 845 },
  desktop: { ratio: "16 / 9",   maxWidth: "520px", width: 1280, height: 720 },
};

export default function ScreenshotSlot({ label, aspect, src }: ScreenshotSlotProps) {
  const { ratio, maxWidth, width, height } = ASPECT[aspect];

  return (
    <figure
      style={{
        margin: "16px 0",
        width: "100%",
        maxWidth,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: ratio,
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          border: "1px solid var(--color-border-subtle)",
          background: "var(--color-surface-sunken)",
        }}
      >
        {src ? (
          <Image
            src={src}
            alt={label}
            fill
            style={{ objectFit: "contain" }}
            sizes={`(max-width: 600px) 100vw, ${maxWidth}`}
          />
        ) : (
          /* Placeholder — replaced by real screenshot when src is provided */
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "16px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "28px", opacity: 0.35 }}>📷</span>
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-dim)",
                fontWeight: "var(--font-medium)",
                lineHeight: "var(--leading-snug)",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: "var(--text-2xs)",
                color: "var(--color-text-dim)",
                opacity: 0.6,
              }}
            >
              screenshot coming soon
            </span>
          </div>
        )}
      </div>
      <figcaption
        style={{
          marginTop: "6px",
          fontSize: "var(--text-2xs)",
          color: "var(--color-text-dim)",
          textAlign: "center",
        }}
      >
        {label}
      </figcaption>
      {/* Hidden for Image component size hints */}
      <span style={{ display: "none" }}>{width}×{height}</span>
    </figure>
  );
}
