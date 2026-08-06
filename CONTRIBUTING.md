# Contributing to ParQwish Planner

Thanks for taking a look. This is a small, mostly solo-maintained project — issues and PRs are genuinely welcome, and response times may vary since it's not anyone's day job.

## Setup

Requires Node 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

**The park data catalog — rides, shows, dining, shops, and places — works with zero setup.** It's served from static JSON in `public/data/` (`rides.json`, `shows.json`, `restaurants.json`, `shops.json`, `places.json`), already checked into this repo — a snapshot of the same data the production admin panel generates from Firestore. No Firebase project needed to see a fully populated Plan/Prepare/Preview flow.

**A Firebase project is only needed for one thing:** Cloud Sync — the opt-in, real-time, end-to-end-encrypted sync between devices and with the mobile app. Everything else, including the entire local-first data model, runs fine without it.

If the checked-in park data has gone stale, refresh it from the public data CDN (no credentials needed):

```bash
node scripts/download-park-data.mjs
```

## Code conventions

- TypeScript throughout, no `any` where a real type is reachable
- **Colors always come from CSS custom properties** defined in `src/app/globals.css` — never a hardcoded hex or `rgba()` literal. This is the one convention that actually breaks things (day/night theming) if skipped:

  ```tsx
  // ✅
  const ACCENT = "var(--color-accent-plan)";
  <div style={{ color: ACCENT, border: `1px solid ${ACCENT}` }} />
  background: `color-mix(in srgb, ${ACCENT} 20%, transparent)`

  // ❌
  style={{ color: "#FFD700", border: "1px solid rgba(255,255,255,0.1)" }}
  background: `${ACCENT}20`   // ACCENT is a var(), not a hex string
  ```
- Light-mode token overrides go under `[data-theme="light"]` in the same `globals.css` file as the dark-mode default
- `useLiveQuery()` for reactive Dexie data binding, not manual refetch-on-mutation
- Imports grouped: React → libraries → local hooks/lib → components

## Before opening a PR

```bash
npm run build   # static export must succeed, no TS errors
npm run lint    # must pass clean
```

Manually check the change in both light and dark mode if it touches anything visual — theming bugs are the easiest thing to miss.

## Commit style

Imperative mood, no conventional-commit prefix (`Add`, `Fix`, `Refactor`, not `feat:`/`fix:`):

```
Add packing category filter to Prepare page
Fix trip date picker showing wrong timezone
```

## Scope

This repo is the web planner only. The iOS companion app (ParQwish Pal) is closed-source and lives elsewhere — please don't open issues here about mobile-specific bugs, the subscription/paywall, or App Store behavior. If a bug spans both (e.g., a sync payload mismatch), describing the PWA side here is still useful.

## Reporting bugs / suggesting features

Open a GitHub issue. Screenshots and repro steps make everything faster.

## Code of conduct

Be respectful, assume good faith, keep disagreements about the code and not the person. Reports of any other kind of behavior can go to the maintainer directly.
