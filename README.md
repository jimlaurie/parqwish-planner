# ParQwish Planner

A free, local-first trip planner for Disneyland Resort — the desk-planning companion to [ParQwish Pal](https://apps.apple.com/app/parqwish-pal) (the in-park iOS app). Build your wish list, pack your bags, and lay out your day's itinerary before you ever get in the car, then sync it to your phone for the day itself.

**Live at [parqwish.com](https://parqwish.com)**

## What it does

- **Plan** — a wish list of rides, shows, dining, and photo spots, pulled from a real Disneyland/DCA/Downtown Disney catalog
- **Prepare** — a packing checklist with categories, custom items, and progress tracking
- **Preview** — a drag-and-drop day itinerary with an interactive park map
- **Publish** — trip stats, a photo gallery, and (if you recorded one on the mobile app) an animated GPS trail playback of your day
- **Multi-user** — plan for the whole family, or invite other people to collaborate on the same trip in real time, end-to-end encrypted
- **No account required** — everything lives in your browser's IndexedDB by default; an account is only needed to turn on Cloud Sync

## Tech stack

- Next.js 15 (App Router, static export) + React 19 + TypeScript
- Tailwind CSS 4, Framer Motion
- Dexie.js (IndexedDB) for local-first storage
- Firebase (Auth + Firestore) for optional Cloud Sync
- Zustand for UI state

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your own Firebase project's config
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Most of the app — Plan, Prepare, Preview, Publish, packing lists, itineraries — works entirely against local IndexedDB with no backend at all. A Firebase project is only needed for two things: fetching the live park data catalog (rides/shows/dining/shops/places) and Cloud Sync. See [CONTRIBUTING.md](./CONTRIBUTING.md) for what that setup looks like today and its current rough edges.

```bash
npm run build   # production static export
npm run lint    # ESLint
```

## Project structure

```
src/
  app/            Next.js App Router pages (plan/, prepare/, preview/, play/, publish/, guide/)
  components/     UI components, organized by phase
  hooks/          Data-access hooks (use-trips, use-wishes, etc.)
  lib/            Dexie schema, Zustand store, sync engine, park data fetcher
```

## About the mobile companion

[ParQwish Pal](https://apps.apple.com/app/parqwish-pal) is the in-park iOS app this planner syncs with — live wait times, a smart home screen, and day-of tracking. It's closed-source and lives in a separate, private repository, since it carries the App Store subscription/entitlement logic this planner doesn't need.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).

---

ParQwish Planner is an independent fan project created by Disneyland enthusiasts. It is not affiliated with, endorsed by, or sponsored by The Walt Disney Company, Walt Disney Parks and Resorts, or any of their affiliates. Disneyland® and Disney California Adventure® are registered trademarks of The Walt Disney Company. Park data may not always be accurate — always check official park sources for time-sensitive information.
