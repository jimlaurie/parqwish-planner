import Link from "next/link";
import AppBadge from "@/components/guide/AppBadge";
import TipBox from "@/components/guide/TipBox";

// ==================== SHARED STEP CARD ====================

function Step({
  number,
  screen,
  app,
  action,
  detail,
  tip,
}: {
  number: number;
  screen: string;
  app: "mobile" | "pwa" | "both";
  action: string;
  detail?: string;
  tip?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "20px 24px",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--color-border-subtle)",
        background: "var(--color-bg-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flexWrap: "wrap" }}>
        {/* Number bubble */}
        <div
          style={{
            width: "34px",
            height: "34px",
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
          {number}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-text-muted)" }}>
              {screen}
            </span>
            <AppBadge app={app} />
          </div>
          <p style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--color-text-primary)", lineHeight: "var(--leading-snug)" }}>
            {action}
          </p>
        </div>
      </div>
      {(detail || tip) && (
        <div style={{ paddingLeft: "48px" }}>
          {detail && (
            <p style={{ margin: "0 0 0 0", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
              {detail}
            </p>
          )}
          {tip && <TipBox tip={tip} />}
        </div>
      )}
    </div>
  );
}

// ==================== SECTION HEADER ====================

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ margin: "36px 0 16px" }}>
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: "var(--text-xl)",
          fontWeight: "var(--font-bold)",
          color: "var(--color-heading)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span>{icon}</span> {title}
      </h2>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        {subtitle}
      </p>
    </div>
  );
}

// ==================== STAT CARD ====================

function StatCard({ icon, label, detail }: { icon: string; label: string; detail: string }) {
  return (
    <div
      style={{
        flex: "1 1 160px",
        padding: "16px",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-subtle)",
        background: "var(--color-bg-card)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "28px", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{detail}</div>
    </div>
  );
}

// ==================== PAGE ====================

export default function GpsTrailPage() {
  return (
    <div style={{ paddingBottom: "48px" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px" }}>
        <Link href="/guide" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-dim)", textDecoration: "none" }}>Guide</Link>
        <span style={{ color: "var(--color-text-dim)" }}>›</span>
        <Link href="/guide/features/mobile" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-dim)", textDecoration: "none" }}>Feature Reference</Link>
        <span style={{ color: "var(--color-text-dim)" }}>›</span>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>GPS Trail</span>
      </div>

      {/* Header */}
      <h1 style={{ margin: "0 0 12px", fontSize: "var(--text-3xl)", fontWeight: "var(--font-bold)", color: "var(--color-heading)" }}>
        📍 GPS Trail
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: "var(--text-base)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)", maxWidth: "640px" }}>
        The GPS Trail records a breadcrumb path of everywhere you walk during your park day —
        entirely on your device, with no data sent to any server. After your trip, sync the trail
        to the web planner to watch an animated playback of your day on an interactive map.
      </p>

      {/* VIP callout */}
      <div
        style={{
          padding: "14px 18px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid color-mix(in srgb, var(--color-gold) 35%, transparent)",
          background: "color-mix(in srgb, var(--color-gold) 8%, transparent)",
          marginBottom: "32px",
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: "20px", flexShrink: 0 }}>👑</span>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
          <strong style={{ color: "var(--color-gold)" }}>VIP feature:</strong> Recording a new trail requires an active VIP subscription.
          Previously recorded trails are always viewable, even if your subscription has lapsed.
          The web planner trail visualization is free for everyone.
        </p>
      </div>

      {/* Resolution stat cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
        <StatCard icon="🎯" label="High Resolution" detail="Point every 30 sec / 10 m — best accuracy, higher battery use" />
        <StatCard icon="⚖️" label="Medium Resolution" detail="Point every 60 sec / 20 m — recommended for all-day recording" />
        <StatCard icon="🔋" label="Low Resolution" detail="Point every 3 min / 50 m — minimal battery impact" />
      </div>

      {/* ── SECTION 1: Start Recording ── */}
      <SectionHeader
        icon="▶️"
        title="Starting the Trail"
        subtitle="Set up and begin recording before you enter the park."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Step
          number={1}
          screen="Home Screen"
          app="mobile"
          action="Tap the trail toggle (📍) near the top of the Home screen to open the setup sheet."
          detail="The toggle appears in the status bar area alongside the date selector. If you don't see it, make sure you're on the Home screen (not Rides or Dining)."
        />
        <Step
          number={2}
          screen="Home Screen › Trail Setup"
          app="mobile"
          action="Choose a resolution and tap Start Recording."
          detail="Medium is recommended for a full park day — it records a point roughly every minute while you're moving, balancing accuracy and battery life."
          tip="Start recording before you pass through the gate so your trail includes the entrance plaza. You can always trim the start/end when reviewing in the web planner."
        />
        <Step
          number={3}
          screen="iOS Settings"
          app="mobile"
          action={`When prompted, grant "Always" location permission.`}
          detail={`iOS requires "Always" permission for background location recording — "While Using" will stop the trail whenever you switch apps to check a wait time. Go to Settings › ParQwish Pal › Location and select Always if you missed the prompt.`}
          tip="Background location is used only for trail recording. The app will never use it for anything else, and recording stops the moment you tap the trail toggle off."
        />
        <Step
          number={4}
          screen="Home Screen"
          app="mobile"
          action="The trail indicator turns green with a pulse animation — you're recording."
          detail="A live stat line below the toggle shows distance walked, points recorded, and elapsed time. These update every 30 seconds."
        />
      </div>

      {/* ── SECTION 2: During the Day ── */}
      <SectionHeader
        icon="🎢"
        title="During Your Park Day"
        subtitle="Trail recording runs fully in the background — just enjoy your day."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Step
          number={1}
          screen="Home Screen"
          app="mobile"
          action="Use the app normally — adding items, checking wait times, scheduling shows."
          detail="Recording continues in the background while you use any part of the app, and even when the app is not in the foreground."
        />
        <Step
          number={2}
          screen="Home Screen"
          app="mobile"
          action="Tap the trail toggle at any time to pause or stop recording."
          detail="Pausing is useful during long sit-down meals or shows where you won't be moving. The trail resumes exactly where it left off when you tap Start again."
          tip="iOS may occasionally suspend background tasks to save battery. If the trail indicator appears stale when you re-open the app, tap the toggle off and on again to resume."
        />
      </div>

      {/* ── SECTION 3: Stop & Export ── */}
      <SectionHeader
        icon="⏹️"
        title="Stopping and Exporting Your Trail"
        subtitle="At the end of your day, stop recording and export the trail data to the web planner."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Step
          number={1}
          screen="Home Screen"
          app="mobile"
          action="Tap the trail toggle to stop recording. Your final stats appear."
          detail="Stats shown: total distance (miles), total time, number of GPS points recorded, and average speed."
        />
        <Step
          number={2}
          screen="Settings › Data & Sync"
          app="mobile"
          action="Go to Settings › Data & Sync › Export. Make sure GPS Trail is toggled on."
          detail="Set the date range to include today (or all your trip days if you recorded multiple days)."
        />
        <Step
          number={3}
          screen="Settings › Data & Sync"
          app="mobile"
          action="Tap Generate Export, note the 6-digit code, and share the file."
          tip="AirDrop to a nearby Mac is fastest. The trail data is embedded in the same .json file as your rides, shows, and other park day data."
        />
      </div>

      {/* ── SECTION 4: View in PWA ── */}
      <SectionHeader
        icon="🗺️"
        title="Viewing Your Trail in the Web Planner"
        subtitle="Import your sync file and explore the animated map in the Publish phase."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Step
          number={1}
          screen="Play › Import"
          app="pwa"
          action="Import the sync file on the web planner. Select your trip, tap Import, choose the file, enter the code."
          detail="See the Data Sync guide for full import instructions if this is your first time."
        />
        <Step
          number={2}
          screen="Publish"
          app="pwa"
          action='Open the Publish phase and scroll to the "Where You Walked" section.'
          detail="Each day you recorded appears as a card showing distance, time, and points. Tap a card to expand the map."
        />
        <Step
          number={3}
          screen="Publish › Trail Map"
          app="pwa"
          action="The Leaflet map renders your full path as a coloured line with a green start marker and red end marker."
          detail="Completed itinerary items (rides, shows, dining, places) appear as colour-coded dots on the map. Hover over a dot to see the item name and scheduled time."
          tip="The map auto-focuses on the densest cluster of points — usually the park itself — so commute legs to/from the hotel don't push the park off-screen."
        />
      </div>

      {/* ── SECTION 5: Animated Playback ── */}
      <SectionHeader
        icon="▶️"
        title="Animated Playback Controls"
        subtitle="Watch your day unfold step by step on the map."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Step
          number={1}
          screen="Publish › Trail Map"
          app="pwa"
          action='Tap ▶ Play to start the animation. A moving dot traces your path in real time.'
          detail="A ghost trail (20% opacity) shows your full route at all times. The active portion draws in at full opacity as the dot advances."
        />
        <Step
          number={2}
          screen="Publish › Trail Map"
          app="pwa"
          action="Use the speed selector to change playback rate: 1×, 2×, 5×, or 10×."
          detail="10× is useful for a quick overview of the whole day. 1× gives the most satisfying recreation of the actual pace of your visit."
        />
        <Step
          number={3}
          screen="Publish › Trail Map"
          app="pwa"
          action="Drag the timeline scrubber to jump to any moment. Timestamps show start, current, and end times."
          tip="Tap ↺ Reset at any time to return the animation to the beginning without losing your zoom level or position."
        />
        <Step
          number={4}
          screen="Publish › Trail Map"
          app="pwa"
          action='Tap ⛶ Expand for a fullscreen map overlay — scroll or pinch to zoom in on any area.'
          detail="Fullscreen mode is especially useful on a large monitor for sharing your trail during a trip recap conversation."
        />
      </div>

      {/* Tips box */}
      <div
        style={{
          margin: "36px 0 0",
          padding: "20px 24px",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border-subtle)",
          background: "var(--color-surface-sunken)",
        }}
      >
        <h3 style={{ margin: "0 0 14px", fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
          💡 Tips for best results
        </h3>
        <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            "Charge your phone fully the night before — background location recording uses extra battery on long days.",
            "Start recording before you enter the park so the entrance plaza is captured.",
            "Use Medium resolution for a typical 8–12 hour park day. Switch to High only if you want precise per-attraction paths.",
            "If the trail indicator looks stuck when you re-open the app, toggle it off and back on — iOS may have suspended the background task.",
            "Trail points are stored locally by date. You can record multiple trip days and they'll each appear as separate cards in the web planner.",
            "The trail is completely private — it never leaves your device unless you explicitly export and share the sync file.",
          ].map((tip) => (
            <li key={tip} style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
