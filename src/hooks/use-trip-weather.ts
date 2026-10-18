"use client";

// ==================== TRIP WEATHER ====================
// Each date's weather (shared/weather.ts dayWeather: the forecast when the
// date is in it, else typical), plus a line saying where it came from, so a
// fallback is never mistaken for a fresh forecast.

import { useEffect, useMemo, useState } from "react";
import { dayWeather, type DayWeather } from "@shared/weather";
import { getWeather, type WeatherData } from "@/lib/weather-data";
import { parkToday } from "@/lib/dates";

const TZ = "America/Los_Angeles";

export interface TripWeather {
  /** Only dates that have weather (past days and unknown dates are left out) */
  days: DayWeather[];
  byDate: Map<string, DayWeather>;
  /** "Forecast: National Weather Service, updated 2:10 PM · Typical: 1991–2020 averages, Fullerton Municipal airport" */
  sourceNote: string | null;
  /** Still loading (nothing to show yet, which isn't the same as "no weather") */
  loading: boolean;
  /** Neither file could be read */
  failed: boolean;
}

/** "FULLERTON MUNI AP, CA US" → "Fullerton Municipal airport" */
function stationLabel(name: string): string {
  const place = name.split(",")[0].toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return place.replace(/\bMuni\b/, "Municipal").replace(/\bAp$/, "airport");
}

/** "2:10 PM" today, else "Oct 15, 2:10 PM", in park time. */
function when(iso: string): string {
  const at = new Date(iso);
  const time = at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
  if (at.toLocaleDateString("en-CA", { timeZone: TZ }) === parkToday()) return time;
  return `${at.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ })}, ${time}`;
}

function sourceNote(data: WeatherData, days: DayWeather[]): string | null {
  const parts: string[] = [];
  if (days.some((d) => d.kind === "forecast") && data.forecast) {
    parts.push(data.forecastIsFallback
      ? `Forecast from ${when(data.forecast.fetchedAt)} (a newer one couldn't be loaded)`
      : `Forecast: National Weather Service, updated ${when(data.forecast.fetchedAt)}`);
  }
  if (days.some((d) => d.kind === "typical") && data.normals) {
    parts.push(`Typical: 1991–2020 averages, ${stationLabel(data.normals.station.name)}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export function useTripWeather(dates: string[]): TripWeather {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWeather().then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, []);

  const key = dates.join(",");
  return useMemo(() => {
    if (!data) return { days: [], byDate: new Map(), sourceNote: null, loading: true, failed: false };
    const today = parkToday();
    const days = key.split(",").filter(Boolean)
      .map((date) => dayWeather(date, today, data.forecast, data.normals))
      .filter((d): d is DayWeather => !!d);
    return {
      days,
      byDate: new Map(days.map((d) => [d.date, d])),
      sourceNote: sourceNote(data, days),
      loading: false,
      failed: !data.forecast && !data.normals,
    };
  }, [data, key]);
}
