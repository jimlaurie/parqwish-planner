"use client";

// "Plan a stay here" on the partner card and popup: a new trip with the
// partner's stay and notes (lib/partners.ts partnerStayDetails), dated today
// and opened on the Edit Trip page with its dates highlighted, as Quick Trip
// does. The stay is booked for the trip's dates and follows them when
// they're set (use-trip-form.ts).

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PartnerBranding } from "@shared/types/partner";
import { useTrips } from "@/hooks/use-trips";
import { parkToday } from "@/lib/dates";
import { partnerStayDetails } from "@/lib/partners";
import { useAppStore } from "@/lib/store";

export function usePlanPartnerStay(): (branding: PartnerBranding) => Promise<void> {
  const router = useRouter();
  const { createTrip } = useTrips();
  const setPartnerInfoOpen = useAppStore((s) => s.setPartnerInfoOpen);

  return useCallback(async (branding: PartnerBranding) => {
    const today = parkToday();
    try {
      const id = await createTrip({
        name: `${branding.stay.name || branding.name} stay`,
        startDate: today,
        endDate: today,
        details: partnerStayDetails(branding, today),
      });
      setPartnerInfoOpen(false);
      router.push(`/trip?id=${encodeURIComponent(id)}&dates=1`);
    } catch (err) {
      console.error("[usePlanPartnerStay] couldn't create the trip:", err);
    }
  }, [createTrip, router, setPartnerInfoOpen]);
}
