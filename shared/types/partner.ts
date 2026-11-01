// ==================== PARTNER BRANDING TYPES ====================
// A business partner whose branding the Planner shows to guests who arrive
// through its link (/with/{id}). The full record (contacts, plan, notes) is
// admin-only in Firestore partners/{id}; a Cloud Function publishes only the
// guest-facing part, PartnerBranding, as data/partners/{id}.json while the
// partnership runs. Design: dland-wishes docs/partner-branding-design.md.

/** Where a partnership stands. Only pilot and active are ever published. */
export type PartnerStatus = "lead" | "pilot" | "active" | "paused" | "ended";

export interface PartnerService {
  icon: string;
  title: string;
  detail?: string;
}

/** What guests see: the published file, data/partners/{id}.json. */
export interface PartnerBranding {
  id: string;
  name: string;
  /** One line under the name, e.g. where the hotel is */
  tagline: string;
  logoUrl?: string;
  colors: {
    /** Band background and the text colour that reads on it */
    band: string;
    bandText: string;
    /** Accent for the day theme, and lightened for the night theme */
    accentLight: string;
    accentDark: string;
  };
  website: string;
  contact: { label: string; phone: string };
  services: PartnerService[];
  resortIds: string[];
  /** The stay that "Plan a stay here" puts on a new trip */
  stay: { name: string; address: string; notes?: string };
  /** First and last day it shows, YYYY-MM-DD, Pacific time, inclusive */
  startsAt: string;
  endsAt: string;
  publishedAt: string;
}

/** The admin-only Firestore record: the branding plus the CRM fields. */
export interface PartnerRecord extends Omit<PartnerBranding, "id" | "publishedAt"> {
  status: PartnerStatus;
  /** Nothing is published without a written agreement on file */
  agreement: { onFile: boolean; date?: string };
  account?: {
    contactName?: string;
    contactRole?: string;
    contactEmail?: string;
    contactPhone?: string;
    plan?: string;
    price?: string;
  };
  notes?: Array<{ date: string; text: string }>;
  updatedAt?: string;
}
