import type { WorkflowStep as StepData } from "@/lib/guide-data/workflows";
import AppBadge from "./AppBadge";
import ScreenshotSlot from "./ScreenshotSlot";
import TipBox from "./TipBox";

interface WorkflowStepProps {
  step: StepData;
  index: number;
}

export default function WorkflowStep({ step, index }: WorkflowStepProps) {
  const isMobile  = step.app === "mobile";
  const isDesktop = step.screenshotAspect === "desktop";

  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        padding: "24px",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--color-border-subtle)",
        background: "var(--color-bg-card)",
        flexDirection: isDesktop ? "column" : "column",
      }}
    >
      {/* Step header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flexWrap: "wrap" }}>
        {/* Step number bubble */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-full)",
            background: "color-mix(in srgb, var(--color-gold) 20%, transparent)",
            border: "2px solid var(--color-gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-bold)",
            color: "var(--color-gold)",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>

        {/* Screen name + badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-semibold)",
                color: "var(--color-text-muted)",
              }}
            >
              {step.screen}
            </span>
            <AppBadge app={step.app} />
          </div>

          {/* Main action */}
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-medium)",
              color: "var(--color-text-primary)",
              lineHeight: "var(--leading-snug)",
            }}
          >
            {step.action}
          </p>
        </div>
      </div>

      {/* Body: screenshot + detail/tip */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {/* Screenshot — mobile shots sit beside detail; desktop shots go full-width below */}
        <div style={{ flexShrink: 0, display: "flex", justifyContent: isMobile ? undefined : "center", width: isMobile ? "auto" : "100%" }}>
          <ScreenshotSlot
            label={step.screenshotLabel}
            aspect={step.screenshotAspect}
            src={step.screenshot}
          />
        </div>

        {/* Detail text + tip */}
        {(step.detail || step.tip) && (
          <div style={{ flex: 1, minWidth: "200px" }}>
            {step.detail && (
              <p
                style={{
                  margin: "0 0 0 0",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--leading-relaxed)",
                }}
              >
                {step.detail}
              </p>
            )}
            {step.tip && <TipBox tip={step.tip} />}
          </div>
        )}
      </div>
    </div>
  );
}
