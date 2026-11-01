import type { CSSProperties } from "react";
import type { PartnerBranding } from "@shared/types/partner";

/** Custom properties for a .partner-scope element: the accent for each theme (globals.css picks one). */
export function partnerScopeStyle(b: PartnerBranding): CSSProperties {
  return {
    "--partner-accent-light": b.colors.accentLight,
    "--partner-accent-dark": b.colors.accentDark,
  } as CSSProperties;
}

/** tel: link for a phone number as typed (letters like 1-800-FUN-PARK become digits). */
export function telHref(phone: string): string {
  const keys: Record<string, string> = { abc: "2", def: "3", ghi: "4", jkl: "5", mno: "6", pqrs: "7", tuv: "8", wxyz: "9" };
  const digit = (ch: string) => Object.entries(keys).find(([letters]) => letters.includes(ch.toLowerCase()))?.[1] ?? ch;
  const dialled = phone.replace(/[a-z]/gi, digit).replace(/[^\d+]/g, "");
  return `tel:${dialled}`;
}
