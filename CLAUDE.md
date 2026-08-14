# CLAUDE.md - ParQwish Planner

## Project Overview

ParQwish Planner is the web (PWA) half of ParQwish, a Disneyland Resort trip planning app. It's the desk-planning companion to **ParQwish Pal**, the in-park iOS app.

**This repo is the PWA only.** The mobile app lives in a separate, private repo (`dland-wishes`), typically checked out as a sibling directory (e.g. `../dland-wishes`). This repo was extracted from that monorepo in early Aug 2026 as a fresh, single-commit, public/MIT-licensed repo — no shared git history with the mobile repo. `shared/` (types, sync helpers/mappers, validation, constants) is **copied**, not a shared package: an identical copy lives in both repos. A bug fixed in `shared/` logic needs fixing in both places until/unless it gets split into its own versioned package — see `dland-wishes/CLAUDE.md`'s "Project Overview" for the mobile side of this note.

Six main sections: **Plan** (wish list), **Prepare** (packing), **Preview** (day-of itinerary + map), **Play** (data transfer — export/import/archive, and Cloud Sync status), **Publish** (trip stats/photos/GPS trail recap), and **Catalog** (browse the full rides/shows/dining/shops/places database, independent of any trip). Local-first IndexedDB storage (Dexie.js) with two independent sync paths to the mobile app: one-shot file-based transfer (always available, no account needed) and opt-in real-time Cloud Sync (E2E encrypted, requires sign-in).

Disney aesthetic — gold (#FFD700) accents on deep purple (#1e1b4b) backgrounds — with day/night theme switching.

See `README.md` for the public-facing pitch and `CONTRIBUTING.md` for setup/PR conventions; this file is deeper technical orientation.

## Tech Stack

- **Framework:** Next.js 15 (App Router, static export via `next build`)
- **UI:** React 19, Tailwind CSS 4, Framer Motion
- **State:** Zustand (persisted to localStorage — theme, currentTripId, currentUserId, portalOpened)
- **Database:** Dexie.js v4 (IndexedDB wrapper), currently at schema v22 — local-first, no server required for core planning features
- **Auth/Cloud:** Firebase Auth (anonymous/Apple/Google/email-link) + Firestore, opt-in only (Cloud Sync + park data catalog fetch)
- **Maps:** Leaflet + react-leaflet (GPS trail playback), plus a hand-authored abstract SVG park map (`resort-map-svg.ts`) for Plan/Preview
- **PDF/export:** jsPDF + html2canvas-pro (trip PDF recap), jszip (photo zip export/import), qrcode.react (sync pairing code)
- **Exploratory, not production:** `@mlc-ai/web-llm` (`src/lib/web-llm.ts`, `src/components/ai/WebLLMChat.tsx`, `/ai` route) — an in-browser local LLM experiment, gated behind WebGPU support, not linked from the main nav
- **Language:** TypeScript throughout
- **Node:** 20+ (per `CONTRIBUTING.md`)

## Commands

```bash
npm run dev      # Start Next.js dev server (port 3000, Turbopack)
npm run build    # Production build (static export to out/), writes out/version.json
npm run lint     # ESLint check
npm run start    # Serve the Next.js build (not the static export)
npm run serve    # Serve the static out/ dir directly (matches production hosting)
npm run deploy   # bump-version.mjs (patch-bump package.json) → download-park-data.mjs
                  #   → npm run build → firebase deploy --only hosting:pwa
```

**`npm run deploy` doesn't commit anything it changes.** The version bump and any refreshed `public/data/*.json` files are left as uncommitted changes after a deploy — the established pattern is: commit the actual feature/fix first and push, run `npm run deploy`, then commit whatever changed as a follow-up `Bump version to X.Y.Z (deploy)` commit. Firebase project `my-tour-guide-backend`, hosting target `parqwish-app` (`firebase.json`), live at `https://parqwish-app.web.app` (custom domain `parqwish.com`).

## Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx            # Root layout: ThemeProvider, TopNavBar, fonts
│   ├── page.tsx               # Home: portal cards, trip selector, WelcomeCard (no-trips state)
│   ├── globals.css            # Design tokens, theme variables, light/dark overrides
│   ├── plan/, prepare/, preview/, play/, publish/   # The five trip-phase pages
│   ├── catalog/               # Browse full park-data catalog, independent of any trip
│   ├── join/                  # Cross-account trip-collaboration invite acceptance
│   ├── share/                 # Web Share Target landing page
│   ├── ai/                    # Exploratory in-browser LLM chat (WebLLM) — not production
│   └── guide/                 # User guide: workflows, feature reference, FAQ
├── components/
│   ├── portals/                # Home screen portal SVG illustrations (Plan/Prepare/Play/Publish)
│   ├── play/                   # Preview-phase sub-components (Timeline, ParkMap, DayItemCard, etc. — named for the pre-rename /play route, see "Gotchas")
│   ├── publish/                # Publish-phase sub-components (stats, gallery, trail map, AIExportPanel)
│   ├── guide/                  # Guide-specific components
│   ├── ai/                     # WebLLMChat (exploratory)
│   └── ...                     # WishCard, PackingCard, EditTripModal, SidebarLayout, sync UI, etc.
├── hooks/                     # Data-access hooks (use-trips, use-publish-data, use-day-items, etc.)
└── lib/
    ├── db.ts                   # Dexie schema (trips, wishes, packingItems, dayItems, trails, photoMetadata, users, ensembles, syncHistory)
    ├── store.ts                 # Zustand store
    ├── auth.ts                  # Firebase Auth (anonymous/Apple/Google/email-link)
    ├── universal-sync.ts        # File-based data transfer (export/import/archive)
    ├── sync-translate.ts        # PWA ↔ sync-payload translation
    ├── wish-sync.ts              # Cloud Sync engine (push/pull/subscribe)
    ├── ai-export.ts              # AI-friendly trip data package + photo zip + prompt templates (Publish page)
    ├── pdf-generator.ts          # Publish page trip-recap PDF
    ├── trip-report.ts            # Pre-trip itinerary PDF (flights/hotels/transport)
    ├── image-utils.ts            # Multi-resolution photo compression (thumbnail/display/full)
    ├── park-data.ts              # Park data fetcher + GPS coordinate lookup + multi-stop support
    ├── owner-badge.ts            # Resolves a collaborator's badge (name/color) from authorUid
    └── firebase.ts               # Firebase config (has inert placeholder fallbacks — see Gotchas)
shared/                        # Copy of the mobile repo's shared/ — see Project Overview
scripts/
├── bump-version.mjs            # Patch-bumps package.json version (run by npm run deploy)
└── download-park-data.mjs      # Refreshes public/data/*.json from the live source
public/data/                   # Checked-in park data snapshot (rides/shows/restaurants/shops/places.json) — works with zero Firebase setup
```

## Conventions

### File Naming
- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- `lib/` modules: `kebab-case.ts`

### Code Style
- Imports grouped: React → libraries → local hooks/lib → components
- Section headers in longer files: `// ==================== SECTION NAME ====================`
- TypeScript throughout, avoid `any` where a real type is reachable
- `useLiveQuery()` for reactive Dexie data binding — not manual refetch-on-mutation

### Styling & PWA Design Tokens

**All colors must come from CSS custom properties** defined in `src/app/globals.css`. Hardcoded hex values, `rgba()` literals, and alpha-append patterns (e.g. `${ACCENT}20`) are forbidden in component code — they break day/night theming. This is the one convention that actually breaks something visible if skipped.

- Day/night mode via `[data-theme="light"]` / `[data-theme="dark"]` on `<html>`, controlled by `ThemeProvider`
- `@theme inline` does **not** emit CSS custom properties at runtime — values must be duplicated in a plain `:root` block for `var(--color-*)` references to work in inline `style` props
- Light-mode token overrides go under `[data-theme="light"]` in the same `globals.css` file as the dark-mode default

**Token categories** (defined on `:root`, overridden under `[data-theme="light"]`):
- **Background:** `--color-bg-deep`, `--color-bg-darker`, `--color-bg-card`, `--color-nav-bg`
- **Text:** `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-dim`, `--color-heading`
- **Brand:** `--color-gold`, `--color-purple-dark/medium/light`
- **Semantic:** `--color-success`, `--color-error`, `--color-warning`, `--color-info`
- **Phase accents:** `--color-accent-plan` (gold), `--color-accent-prepare` (tan), `--color-accent-preview` (orange), `--color-accent-play` (purple), `--color-accent-publish` (blue), `--color-accent-catalog` (tan) — note `preview`/`play` accent names follow the *current* route names (see Gotchas below for the rename history)
- **Borders:** `--color-border-subtle`, `--color-border-default`, `--color-border-strong`, `--color-border-input`
- **Surfaces:** `--color-surface-sunken`, `--color-surface-base`, `--color-surface-raised`, `--color-surface-overlay`, `--color-surface-hover`
- **Overlay:** `--color-overlay` (modal backdrops — auto-adjusts between themes)

```typescript
// ✅ Phase components define an ACCENT constant pointing at their phase token
const ACCENT = "var(--color-accent-plan)";
<div style={{ color: ACCENT, border: `1px solid ${ACCENT}` }}>

// ✅ Alpha variants use color-mix() instead of hex-append
background: `color-mix(in srgb, ${ACCENT} 20%, transparent)`

// ✅ Tailwind arbitrary values reference vars directly
<div className="border-[var(--color-gold)] text-[var(--color-text-primary)]">

// ✅ Modal overlays use the semantic overlay token
<div style={{ background: "var(--color-overlay)" }}>

// ❌ Never hardcode hex or rgba
style={{ color: "#FFD700", border: "1px solid rgba(255,255,255,0.1)" }}

// ❌ Never use alpha-append patterns
background: `${ACCENT}20`  // broken — ACCENT is now a var(), not a hex
```

**Gotcha:** SVG `fill`/`stroke` attributes don't resolve CSS vars — use inline `style` instead.

### State & Data
- Zustand for UI-only state (theme, current trip/user selection, portal animation state)
- Dexie/`useLiveQuery()` for all persisted app data — no manual cache layer
- Multi-user: `userId` on junction tables (`tripWishSelections`, `tripPackingSelections`, `dayItems`) for ownership; `activeUserFilter` in Zustand filters the UI, doesn't touch storage

## Commit Message Style

Imperative mood, no conventional-commit prefix:

```
Add packing category filter to Prepare page
Fix trip date picker showing wrong timezone
Bump version to 6.0.4 (deploy)
```

## Harness — Definition of Done

```bash
npm run build     # static export must succeed — no TS or build errors
npm run lint      # ESLint must pass clean
```

Manually check any visual change in both light and dark mode — theming bugs (a hardcoded hex slipping past the token convention) are the easiest thing to miss and won't show up in build/lint. `npm run deploy` (see Commands) is the full release step; a change isn't "done" until it's actually deployed for anything user-facing, matching the mobile repo's same philosophy that "it works locally" isn't sufficient.

## Key Patterns

### Theme Switching
```typescript
// ThemeProvider uses 3 complementary mechanisms for reliability:
// 1. Direct DOM mutation in toggleTheme() callback (immediate)
// 2. Zustand store.subscribe() outside React render cycle (catches non-render updates)
// 3. Standard useEffect on resolvedTheme (React-driven updates)
// Needed because Next.js App Router can delay useEffect-driven DOM mutations
```

### Portal Animation State
```typescript
// Each home-screen portal has 3 states: "closed" | "opening" | "open"
// Tracked per trip+phase in Zustand: portalOpened[tripId][phase] = boolean
// First click: play opening animation → mark opened → navigate
// Subsequent clicks: navigate immediately
// Portal SVGs use Framer Motion useAnimation() for choreographed sequences
```

### Two Independent Sync Mechanisms
```typescript
// 1. File-based transfer (universal-sync.ts / sync-translate.ts) — always
//    available, no account needed. Export → JSON file (AirDrop/email/Files)
//    → Import on the other device. Three modes: Export (paired 6-digit
//    code), Import, Archive (no code). SyncModal provides the three-tab UI.
// 2. Cloud Sync (wish-sync.ts) — opt-in, real-time, E2E encrypted via
//    Firestore. Requires sign-in (Apple/Google/anonymous/email-link).
//    Supports cross-account trip collaboration (Owner/Editor/Viewer roles,
//    invite links via /join). SyncPanel + SyncStatusIndicator show status.
// These are NOT the same pipe — a bug in one doesn't imply the other is
// affected, and a feature added to one doesn't automatically reach the other.
```

### AI Export (Publish page)
```typescript
// ai-export.ts builds a flat, narrative-shaped JSON package from the same
// usePublishData() shape the rest of Publish renders from — deliberately
// NOT the sync wire format (SyncEnvelopeV2), which carries merge/replace
// plumbing that's noise for an LLM prompt. Folds in GPS trail stats
// per-day/overall when the trip has recorded trails. buildPhotosZip() packs
// full-resolution photos + a captions.json manifest via jszip. Ships with
// starter prompt templates (recap post, day captions, highlight script).
```

## Gotchas

- **Route renames, current names win:** the itinerary/timeline page is `/preview` (was `/play`); the data-transfer page is `/play` (was `/sync`). Component/hook/CSS-token names haven't fully caught up — `src/components/play/` holds *Preview*-phase components, and `--color-accent-play` is the *data-transfer* page's accent, not a leftover. Don't rename-on-sight; check which era a given name is from before assuming it's wrong.
- **`firebase.ts` has inert placeholder fallbacks** (`"demo-api-key"`, `"demo-project"`, etc.) so `next build` doesn't crash when `.env.local` is missing. This has bitten production twice: `.env.local` was absent during `npm run deploy` and the placeholder config silently shipped live, breaking every Firebase-backed feature (Sign in with Apple/Google, Cloud Sync) behind a generic "Sign in failed" message. **Before any deploy, confirm `.env.local` exists with real values** — `cat .env.local`, or check the deployed bundle for the literal string `"demo-project"` in the compiled `firebaseConfig` object if in doubt.
- **`npm run deploy` doesn't commit its own changes** — see Commands above.
- **`shared/` is a copy, not a package** — see Project Overview. Check whether a `shared/` fix needs mirroring into `dland-wishes/shared/` (and vice versa) before considering it done. As of Aug 2026 the two copies have stayed in sync (spot-checked via full checksum diff) — but nothing enforces that automatically.

## For historical/roadmap context

Feature history predating the Aug 2026 repo split (PWA Companion App build-out, Cloud Sync phases, multi-user, GPS trails, Places catalog, etc.) lives in `dland-wishes/CLAUDE.md`'s "Roadmap" section — it covers both apps together since they were one codebase until then. This repo doesn't maintain a parallel roadmap; check recent `git log` here for what's shipped since the split.
