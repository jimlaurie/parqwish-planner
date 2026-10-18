"use client";

// ==================== A DAY'S WEATHER (PREVIEW) ====================
// Next to the park hours in Preview's header: the selected day's high / low,
// a short condition word, chance of rain and sunset, marked Forecast or
// Typical, with the °F/°C switch. Sunset is worked out for Disneyland's location
// (shared/weather.ts sunTimes), so it's there for typical days too.

import { clockTime, formatTemp, sunTimes, weatherCondition } from "@shared/weather";
import REGISTRY from "@shared/data/resorts.json";
import { useAppStore } from "@/lib/store";
import { useTripWeather } from "@/hooks/use-trip-weather";
import UnitSwitch from "./UnitSwitch";

const TZ = "America/Los_Angeles";
const DISNEYLAND = REGISTRY.resorts.find((r) => r.id === "disneyland_resort")!.center as [number, number];

export default function DayWeatherLine({ date }: { date: string | null }) {
  const { temperatureUnit: unit } = useAppStore();
  const weather = useTripWeather(date ? [date] : []);
  const day = date ? weather.byDate.get(date) : undefined;
  if (!date || weather.loading || !day) return null;

  const typical = day.kind === "typical";
  const { icon, label } = typical ? { icon: "📅", label: "Typical for the date" } : weatherCondition(day.code);
  const sun = sunTimes(date, DISNEYLAND[0], DISNEYLAND[1], TZ);
  return (
    <div role="note" aria-label="Weather" title={[day.summary, weather.sourceNote].filter(Boolean).join(" · ") || undefined}
         className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
      <span aria-hidden="true">{icon}</span>
      <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {formatTemp(day.highF, unit)} / {formatTemp(day.lowF, unit)}
      </span>
      {/* Our short word; NWS's own text ("Showers And Thunderstorms Likely") is in the tooltip */}
      <span>{label}</span>
      <span>{"☔"} {day.precipChance}%{typical ? " of years" : ""}</span>
      {sun && <span>{"🌅"} Sunset {clockTime(sun.sunset, TZ)}</span>}
      <span className="uppercase tracking-wide text-[9px]" style={{ color: "var(--color-text-dim)" }}>{typical ? "Typical" : "Forecast"}</span>
      <UnitSwitch accent="var(--color-accent-preview)" />
    </div>
  );
}
