// Every outbound link from this app to the marketing site (parqwish.com)
// should go through this helper. It appends ?ref=app so parqwish.com's
// site.js can detect the visit originated inside the Planner app and adjust
// its nav accordingly (logo points back to the app instead of the marketing
// homepage, the CTA reads "Back to Planner" instead of "Open Planner") —
// see marketing/site.js in the dland-wishes repo.
//
// This is a query-param stand-in for the old same-origin sessionStorage
// mechanism (useContentHomeHref/IN_APP_SESSION_KEY, removed) — that one
// broke once Blog/Guide/Story moved to a genuinely different origin than
// the app, since sessionStorage doesn't cross origins.
export function marketingUrl(path: string): string {
  return `https://parqwish.com${path}?ref=app`;
}
