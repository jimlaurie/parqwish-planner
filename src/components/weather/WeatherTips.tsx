"use client";

// ==================== PACKING TIPS FROM THE WEATHER ====================
// Prepare's tips under the weather strip (shared/weather.ts packingTips):
// rain or cool evenings → Outfits › Weather Gear, heat → Sundries ›
// Skincare & Sun. "Show" filters the list to that sub-category (offered only
// when it has a chip, so the filter can be cleared again); "+ Add" opens a
// new item there.

import { packingTips, type DayWeather, type PackingTip } from "@shared/weather";
import { useAppStore } from "@/lib/store";

interface WeatherTipsProps {
  days: DayWeather[];
  accent: string;
  /** Whether Prepare can show this sub-category (it has a chip) */
  canShow: (tip: PackingTip) => boolean;
  onShow: (tip: PackingTip) => void;
  onAdd: (tip: PackingTip) => void;
}

const TIP_ICONS: Record<PackingTip["id"], string> = { rain: "☔", cool: "🧥", hot: "🧴" };

export default function WeatherTips({ days, accent, canShow, onShow, onAdd }: WeatherTipsProps) {
  const { temperatureUnit } = useAppStore();
  const tips = packingTips(days, temperatureUnit);
  if (tips.length === 0) return null;
  const button = "px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-colors hover:brightness-110";

  return (
    <ul aria-label="Packing tips from the weather" className="mt-3 space-y-1.5">
      {tips.map((tip) => (
        <li key={tip.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-xs"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`, color: "var(--color-text-primary)" }}>
          <span aria-hidden="true">{TIP_ICONS[tip.id]}</span>
          <span className="flex-1 min-w-[12rem]">{tip.text}</span>
          {canShow(tip) && (
            <button type="button" className={button} onClick={() => onShow(tip)}
                    style={{ border: `1px solid ${accent}`, color: accent }}>
              Show {tip.category}
            </button>
          )}
          <button type="button" className={button} onClick={() => onAdd(tip)}
                  style={{ backgroundColor: accent, color: "var(--color-bg-deep)" }}>
            + Add {tip.category}
          </button>
        </li>
      ))}
    </ul>
  );
}
