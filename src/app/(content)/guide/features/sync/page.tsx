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

// ==================== PAGE ====================

export default function DataSyncPage() {
  return (
    <div style={{ paddingBottom: "48px" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px" }}>
        <Link href="/guide" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-dim)", textDecoration: "none" }}>Guide</Link>
        <span style={{ color: "var(--color-text-dim)" }}>›</span>
        <Link href="/guide/features/mobile" style={{ fontSize: "var(--text-sm)", color: "var(--color-text-dim)", textDecoration: "none" }}>Feature Reference</Link>
        <span style={{ color: "var(--color-text-dim)" }}>›</span>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Data Sync</span>
      </div>

      {/* Header */}
      <h1 style={{ margin: "0 0 12px", fontSize: "var(--text-3xl)", fontWeight: "var(--font-bold)", color: "var(--color-heading)" }}>
        🔄 Data Sync
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: "var(--text-base)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)", maxWidth: "640px" }}>
        ParQwish&apos;s main sync method is <strong style={{ color: "var(--color-text-primary)" }}>file-based data transfer</strong> — no Wi-Fi pairing, no accounts required.
        You export a JSON file from one app and import it on the other. The same format works in both directions between the mobile app and the web planner.
        There&apos;s also an optional real-time <strong style={{ color: "var(--color-text-primary)" }}>Cloud Sync</strong> — see the callout below.
      </p>

      {/* How it works callout */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid color-mix(in srgb, var(--color-gold) 35%, transparent)",
          background: "color-mix(in srgb, var(--color-gold) 8%, transparent)",
          marginBottom: "8px",
        }}
      >
        <p style={{ margin: "0 0 10px", fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-gold)" }}>
          🔑 How the verification code works
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
          <strong style={{ color: "var(--color-text-primary)" }}>Sync exports</strong> include a 6-digit code shown as both a number and a QR code.
          The receiving device must enter or scan this code to confirm the file is genuine.
          <br /><br />
          <strong style={{ color: "var(--color-text-primary)" }}>Archive exports</strong> skip the code — useful for personal backups where verification is not needed.
        </p>
      </div>

      {/* Cloud Sync callout */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid color-mix(in srgb, var(--color-accent-play) 35%, transparent)",
          background: "color-mix(in srgb, var(--color-accent-play) 8%, transparent)",
          marginBottom: "8px",
          marginTop: "12px",
        }}
      >
        <p style={{ margin: "0 0 10px", fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-accent-play)" }}>
          ☁️ Also available: Cloud Sync
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
          To turn on <strong style={{ color: "var(--color-text-primary)" }}>your own Cloud Sync</strong> from the Play page, sign in with your <strong style={{ color: "var(--color-text-primary)" }}>Apple ID</strong> — the one identity that stays consistent across your devices, on both mobile and web. Your wish catalog, day plan, and (for shared trips) collaborators&apos; changes then stay in sync automatically and end-to-end encrypted, no file transfer needed.
          Joining <strong style={{ color: "var(--color-text-primary)" }}>someone else&apos;s</strong> trip as a collaborator has a lower bar — Apple, Google, an email link, or just &ldquo;continue without an account&rdquo; all work for that, since you&apos;re not the one who needs a durable identity to own the sync.
          <strong style={{ color: "var(--color-text-primary)" }}> It&apos;s free</strong> either way — no subscription required on either platform, on top of file-based transfer which always works without an account.
          It&apos;s a separate mechanism from the file export/import/archive flow described below: importing a file only updates the device you import it on, it does <strong style={{ color: "var(--color-text-primary)" }}>not</strong> automatically reach Cloud Sync collaborators on a shared trip.
          Use file transfer for a one-time device-to-device catch-up or a personal backup; use Cloud Sync for ongoing, real-time collaboration on a shared trip. The two can be used together.
          Planning with other people? See <Link href="#collaboration" style={{ color: "var(--color-accent-play)", textDecoration: "underline" }}>Inviting Collaborators</Link> below.
        </p>
      </div>

      {/* ── SECTION 1: Mobile → PWA ── */}
      <SectionHeader
        icon="📱→🖥️"
        title="Export from Mobile, Import to Web Planner"
        subtitle="Use after a park day to bring your data into the web planner for stats, photos, and GPS trail."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Step
          number={1}
          screen="Settings › Data & Sync"
          app="mobile"
          action="Tap Export to open the export sheet."
          detail="Found at the bottom of the Settings screen. Tap the Export tab if it isn't already selected."
        />
        <Step
          number={2}
          screen="Settings › Data & Sync"
          app="mobile"
          action="Select which categories and date range to include."
          detail="Toggle on Rides, Shows, Dining, Outfits, Shopping, Wishes, and GPS Trail as needed. Set the date range to match your trip days."
          tip="Selecting fewer categories makes the file smaller and the import faster — only include what you need."
        />
        <Step
          number={3}
          screen="Settings › Data & Sync"
          app="mobile"
          action="Tap Generate Export. Note the 6-digit code that appears."
          detail="The code is also shown as a QR code — the web planner can scan it with your device camera instead of typing it in."
        />
        <Step
          number={4}
          screen="Settings › Data & Sync"
          app="mobile"
          action="Tap Share File and send it to yourself — AirDrop, email, Files, or Messages all work."
          detail="On iPhone, AirDrop to a nearby Mac is the fastest option. The file is named parqwish-export-YYYY-MM-DD.json."
        />
        <Step
          number={5}
          screen="Play › Import"
          app="pwa"
          action="Open the Play page on the web planner. Tap Import and select your trip."
          detail="You must have a trip selected before importing. If you haven't created one yet, tap + New Trip from the home screen first."
        />
        <Step
          number={6}
          screen="Play › Import"
          app="pwa"
          action="Tap Choose File and select the .json file you shared from mobile."
          detail="The web planner reads the file locally — nothing is uploaded to any server."
        />
        <Step
          number={7}
          screen="Play › Import"
          app="pwa"
          action="Enter the 6-digit code (or scan the QR code on your phone) and tap Import."
          detail="Choose Merge to add to existing data, or Replace to overwrite the trip's current data."
          tip="If you're importing for the first time, Replace is safe. For subsequent imports on the same trip, use Merge to avoid losing manually-added items."
        />
      </div>

      {/* ── SECTION 2: PWA → Mobile ── */}
      <SectionHeader
        icon="🖥️→📱"
        title="Export from Web Planner, Import to Mobile"
        subtitle="Use to push a trip plan you built on the web planner down to your phone before a park day."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Step
          number={1}
          screen="Play › Export"
          app="pwa"
          action="Open the Play page on the web planner. Select your trip and tap Export."
          detail="Choose the categories you want to send — typically Wishes and Packing for pre-trip planning."
        />
        <Step
          number={2}
          screen="Play › Export"
          app="pwa"
          action="Choose Sync (generates a 6-digit code) or Archive (no code). Tap Generate."
          detail="Use Sync when transferring to your phone. Use Archive for a personal backup copy."
        />
        <Step
          number={3}
          screen="Play › Export"
          app="pwa"
          action="Download the file and share it to your iPhone — AirDrop, email, or iCloud Drive."
        />
        <Step
          number={4}
          screen="Settings › Data & Sync"
          app="mobile"
          action="On the mobile app, go to Settings › Data & Sync and tap Import."
        />
        <Step
          number={5}
          screen="Settings › Data & Sync"
          app="mobile"
          action="Select the .json file from Files. Enter the code and choose Merge or Replace."
          tip="If you have existing mobile data you want to keep, always choose Merge. Replace will clear all existing data for the selected categories and date range."
        />
      </div>

      {/* ── SECTION 3: Archive ── */}
      <SectionHeader
        icon="🗄️"
        title="Creating an Archive (Backup)"
        subtitle="Archive exports have no verification code — ideal for personal backups you import later on the same device."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Step
          number={1}
          screen="Settings › Data & Sync  or  Play › Export"
          app="both"
          action="Open the export sheet and select the Archive tab."
        />
        <Step
          number={2}
          screen="Settings › Data & Sync  or  Play › Export"
          app="both"
          action="Select categories and date range, then tap Generate Archive."
          detail="The archive file is identical in format to a sync export, but does not include a verification code hash. You can import it without entering a code."
        />
        <Step
          number={3}
          screen="Settings › Data & Sync  or  Play › Import"
          app="both"
          action="To restore, open Import, select the archive file, and tap Import — no code required."
          tip="Save archive files to iCloud Drive or a folder you'll remember. Name them by trip date so you can find them easily months later."
        />
      </div>

      {/* ── SECTION 4: Collaboration ── */}
      <div id="collaboration" style={{ scrollMarginTop: "24px" }} />
      <SectionHeader
        icon="👥"
        title="Inviting Collaborators"
        subtitle="Plan a trip together — free, no subscription required. Invites are sent from the web planner; anyone can accept one, on any device."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Step
          number={1}
          screen="Home › Edit Trip › Collaborate"
          app="pwa"
          action="Open your trip's Edit Trip modal and select the Collaborate tab."
          detail="Only the trip's Owner can invite people or change anyone's access — this tab is invite-only management for owners, everyone else sees a read-only roster."
        />
        <Step
          number={2}
          screen="Edit Trip › Collaborate"
          app="pwa"
          action="Choose a role for the person you're inviting — Editor or Viewer."
          detail="Editors can add, edit, and check off items but can't change trip dates, flight, or hotel details. Viewers can see everything but can't make changes. Every trip also has exactly one Owner (whoever created it), who can do both plus manage collaborators — ownership can't currently be transferred."
        />
        <Step
          number={3}
          screen="Edit Trip › Collaborate"
          app="pwa"
          action="Tap Generate Invite Link, then Copy or Share it — text, email, whatever's easiest."
          detail="The link works for 48 hours. It carries its own encryption key in the part after the # — that key is never sent to or stored on any server, so the link itself is the only way to unlock the trip's data."
        />
        <Step
          number={4}
          screen="/join (opens in any browser)"
          app="both"
          action="The person you invited opens the link and picks how to continue: Apple, Google, an email link, or just continue without an account."
          detail="This works from a phone, tablet, or computer — the link opens the web planner in a browser, not the ParQwish Pal app. “Continue without an account” is quick but only works on that one device; adding an email afterward makes the access recoverable if they switch devices."
        />
        <Step
          number={5}
          screen="/join"
          app="both"
          action="They enter their name and tap Accept & Join Trip."
          detail="They're immediately taken into the shared trip with the role you set. Their name and a color badge now show up on items they add or edit, so everyone can see who did what."
        />
        <Step
          number={6}
          screen="Edit Trip › Collaborate"
          app="pwa"
          action="Manage the roster any time — promote or demote between Editor and Viewer, or remove someone's access."
          tip="Removing someone stops future syncing to them, but any data already on their device stays there — the same tradeoff as sharing an exported file. If that matters for a specific trip, keep that in mind before inviting."
        />
      </div>

      {/* ── Troubleshooting ── */}
      <div style={{ margin: "36px 0 16px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "var(--text-xl)", fontWeight: "var(--font-bold)", color: "var(--color-heading)" }}>
          🛠️ Troubleshooting
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            {
              q: "\"Invalid code\" error on import",
              a: "Double-check the 6 digits — it's easy to misread 0/O or 1/I. Try scanning the QR code instead of typing. If the file was modified after export, the code will fail.",
            },
            {
              q: "Import button is greyed out on the web planner",
              a: "You must select a trip before importing. Tap the trip selector on the home screen or Play page first.",
            },
            {
              q: "Categories are missing after import",
              a: "Check that the categories were toggled on at export time. Categories not selected at export won't appear in the import file.",
            },
            {
              q: "GPS Trail category appears but trail doesn't show in Publish",
              a: "Make sure the trail was recorded on the same date range as the export. Open Publish › Where You Walked and check the correct date card.",
            },
            {
              q: "The invite link doesn't work",
              a: "Invite links expire after 48 hours — generate a fresh one from Edit Trip › Collaborate. If it still fails, the trip may not have finished its initial cloud sync yet; wait a moment and try again.",
            },
            {
              q: "I can't find the Collaborate tab on mobile",
              a: "Inviting and managing collaborators is a web planner feature only. Mobile can join a trip (open the invite link in Safari) and sync content once you're a member, but generating invites and changing roles both happen from Edit Trip on parqwish.com.",
            },
          ].map(({ q, a }) => (
            <div
              key={q}
              style={{
                padding: "14px 18px",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border-subtle)",
                background: "var(--color-surface-sunken)",
              }}
            >
              <p style={{ margin: "0 0 6px", fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--color-text-primary)" }}>
                {q}
              </p>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
                {a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
