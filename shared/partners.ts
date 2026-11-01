// ==================== PARTNER BRANDING (pure) ====================
// Whether a partner's published branding shows today. The Planner checks
// the dates itself, so branding disappears on its end date even before the
// daily function removes the file, and even from a copy cached offline.
// Design: dland-wishes docs/partner-branding-design.md.

import type { PartnerBranding } from "./types/partner";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Partner ids are URL slugs: they appear in /with/{id} and in the file path. */
export const PARTNER_ID = /^[a-z0-9][a-z0-9-]{1,39}$/;

/** True when `branding` is well formed and `today` (YYYY-MM-DD, Pacific) is within its dates. */
export function brandingShowing(branding: Partial<PartnerBranding> | null | undefined, today: string): boolean {
  if (!branding?.id || !PARTNER_ID.test(branding.id) || !branding.name) return false;
  const { startsAt, endsAt } = branding;
  if (!startsAt || !endsAt || !DATE.test(startsAt) || !DATE.test(endsAt)) return false;
  return startsAt <= today && today <= endsAt;
}
