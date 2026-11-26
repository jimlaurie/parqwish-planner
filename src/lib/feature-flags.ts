// ==================== FEATURE FLAGS ====================
// Features built on main ahead of their release, hidden until they ship.
// Each is read from a NEXT_PUBLIC_ variable at build time; `npm run ship`
// doesn't set any, so app.parqwish.com never shows a hidden one. Add the
// next one here and to ship-beta.mjs's BETA_FLAGS (and Playwright's dev
// server, playwright.config.ts, so the checks cover it).

/** Collections (dland-wishes docs/collections-design.md): shipped with Pal 1.2.0, 20 Nov 2026; always on. */
export const COLLECTIONS_AVAILABLE = true;

/**
 * Resorts beyond Disneyland Resort (dland-wishes docs/multi-park-architecture.md
 * §6 and §7a): the Park Catalog's resort switcher, browse-only for now.
 * NEXT_PUBLIC_RESORTS=1, beta channel only.
 */
export const RESORTS_AVAILABLE = process.env.NEXT_PUBLIC_RESORTS === "1";
