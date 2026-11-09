// ==================== FEATURE FLAGS ====================
// Features built on main ahead of their release, hidden until they ship.
// Each is read from a NEXT_PUBLIC_ variable at build time; `npm run ship`
// doesn't set any, so app.parqwish.com never shows a hidden one.

/** Collections (dland-wishes docs/collections-design.md): `NEXT_PUBLIC_COLLECTIONS=1 npm run dev`. */
export const COLLECTIONS_AVAILABLE = process.env.NEXT_PUBLIC_COLLECTIONS === "1";
