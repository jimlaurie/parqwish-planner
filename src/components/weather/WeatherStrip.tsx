"use client";

// ==================== TRIP WEATHER STRIP ====================
// One chip per remaining trip day on Plan and Prepare: an icon, high / low
// and chance of rain, marked Forecast (National Weather Service, within
// about a week) or Typical (1991–2020 averages for the date), with a line
// saying where the numbers came from.

import type { ReactNode } from "react";
import { formatTemp, weatherCondition, type DayWeather } from "@shared/weather";
import { useAppStore } from "@/lib/store";
import type { TripWeather } from "@/hooks/use-trip-weather";
import UnitSwitch from "./UnitSwitch";

const dayLabel = (date: string) => {
  const at = new Date(`${date}T12:00:00Z`);
  return {
    weekday: at.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    md: at.toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" }),
  };
};

function describe(d: DayWeather, unit: "F" | "C"): string {
  const { weekday, md } = dayLabel(d.date);
  const what = d.kind === "typical" ? "typical for the date" : (d.summary ?? weatherCondition(d.code).label).toLowerCase();
  const rain = d.kind === "typical" ? `rain on ${d.precipChance}% of years` : `${d.precipChance}% chance of rain`;
  return `${weekday} ${md}: ${what}, high ${formatTemp(d.highF, unit)}, low ${formatTemp(d.lowF, unit)}, ${rain}`;
}

function DayChip({ day, unit }: { day: DayWeather; unit: "F" | "C" }) {
  const { weekday, md } = dayLabel(day.date);
  const typical = day.kind === "typical";
  const { icon } = typical ? { icon: "📅" } : weatherCondition(day.code);
  return (
    <div role="listitem" aria-label={describe(day, unit)} data-testid="weather-day"
         className="shrink-0 rounded-xl px-3 py-2 min-w-[7.5rem]"
         style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border-subtle)" }}>
      <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        <span><span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{weekday}</span> {md}</span>
        <span className="uppercase tracking-wide text-[9px]" style={{ color: "var(--color-text-dim)" }}>{typical ? "Typical" : "Forecast"}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5" style={{ color: "var(--color-text-primary)", opacity: typical ? 0.85 : 1 }}>
        <span aria-hidden="true">{icon}</span>
        <span className="text-sm font-semibold">{formatTemp(day.highF, unit)}</span>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>/ {formatTemp(day.lowF, unit)}</span>
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: day.precipChance >= 40 ? "var(--color-text-primary)" : "var(--color-text-dim)" }}>
        {"☔"} {day.precipChance}%
      </div>
    </div>
  );
}

/** `children`: shown under the strip (Prepare's packing tips). */
export default function WeatherStrip({ weather, accent, children }: { weather: TripWeather; accent: string; children?: ReactNode }) {
  const { temperatureUnit } = useAppStore();
  if (weather.loading) return null;
  if (weather.failed) {
    return (
      <p className="w-full max-w-2xl mb-6 text-[11px]" style={{ color: "var(--color-text-dim)" }}>
        {"🌡️"} Weather couldn&rsquo;t be loaded right now. Check your connection, or try again later.
      </p>
    );
  }
  if (weather.days.length === 0) return null; // a past trip, or no dates

  return (
    <section aria-label="Trip weather" className="w-full max-w-2xl mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>Weather</h2>
        <UnitSwitch accent={accent} />
      </div>
      <div role="list" className="flex gap-2 overflow-x-auto pb-1">
        {weather.days.map((d) => <DayChip key={d.date} day={d} unit={temperatureUnit} />)}
      </div>
      {weather.sourceNote && (
        <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-dim)" }}>{weather.sourceNote}</p>
      )}
      {children}
    </section>
  );
}
