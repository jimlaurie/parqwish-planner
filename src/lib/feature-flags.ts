// ==================== FEATURE FLAGS ====================
// Features built on main ahead of their release, hidden until they ship.
// Each is read from a NEXT_PUBLIC_ variable at build time; `npm run ship`
// doesn't set any, so app.parqwish.com never shows a hidden one. None is
// hidden now; add the next one here (and to ship-beta.mjs's BETA_FLAGS).

/** Collections (dland-wishes docs/collections-design.md): shipped with Pal 1.2.0, 20 Nov 2026; always on. */
export const COLLECTIONS_AVAILABLE = true;
