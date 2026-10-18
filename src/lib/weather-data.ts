// ==================== WEATHER DATA ====================
// The two weather files the dland-wishes backend publishes for Disneyland
// (shared/types/weather.ts):
//   forecast.json — the National Weather Service forecast, refreshed hourly
//                   (functions/syncWeatherForecast.js). Read live from
//                   Storage, falling back to the deploy's copy, which can be
//                   days old: the caller shows its `fetchedAt`, and whether
//                   the live copy failed, so an old forecast never looks current.
//   normals.json  — typical weather for each date from NOAA's 1991–2020
//                   normals (scripts/build-weather-normals.js). Changes about
//                   once a decade, so the deploy's copy is enough.

import type { WeatherForecastFile, WeatherNormalsFile } from "@shared/types/weather";
import { cacheKey, liveUrl, LIVE_TIMEOUT_MS } from "@/lib/park-data";
import { reportSource } from "@/lib/data-sources";

const FORECAST_CACHE_KEY = cacheKey("weather-forecast");
const FORECAST_TTL = 30 * 60 * 1000; // the forecast is republished hourly

export interface WeatherData {
  forecast: WeatherForecastFile | null;
  normals: WeatherNormalsFile | null;
  /** The live forecast couldn't be read; `forecast` (if any) is the deploy's copy */
  forecastIsFallback: boolean;
}

const isForecast = (data: unknown): data is WeatherForecastFile =>
  !!data && typeof data === "object" && Array.isArray((data as WeatherForecastFile).hours) && Array.isArray((data as WeatherForecastFile).days);

const isNormals = (data: unknown): data is WeatherNormalsFile =>
  !!data && typeof data === "object" && typeof (data as WeatherNormalsFile).days === "object" && !!(data as WeatherNormalsFile).days;

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

function readCachedForecast(): WeatherForecastFile | null {
  try {
    const entry = JSON.parse(localStorage.getItem(FORECAST_CACHE_KEY) || "null") as { data: unknown; at: number } | null;
    return entry && Date.now() - entry.at < FORECAST_TTL && isForecast(entry.data) ? entry.data : null;
  } catch {
    return null;
  }
}

function cacheForecast(data: WeatherForecastFile): void {
  try {
    localStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify({ data, at: Date.now() }));
  } catch { /* cache write failed */ }
}

async function loadForecast(): Promise<{ forecast: WeatherForecastFile | null; fallback: boolean }> {
  const cached = readCachedForecast();
  if (cached) {
    reportSource({ key: "weatherForecast", kind: "cached", asOf: cached.fetchedAt });
    return { forecast: cached, fallback: false };
  }
  let detail = "";
  try {
    const live = await fetchJson(liveUrl("weather/forecast.json"), { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) });
    if (!isForecast(live)) throw new Error("live forecast looked wrong");
    cacheForecast(live);
    reportSource({ key: "weatherForecast", kind: "live", asOf: live.fetchedAt });
    return { forecast: live, fallback: false };
  } catch (err) {
    detail = `the live copy failed: ${err instanceof Error ? err.message : String(err)}`;
  }
  try {
    const deployed = await fetchJson("/data/weather/forecast.json");
    if (!isForecast(deployed)) throw new Error("the deployed copy looked wrong");
    reportSource({ key: "weatherForecast", kind: "deployed", asOf: deployed.fetchedAt, detail });
    return { forecast: deployed, fallback: true };
  } catch (err) {
    reportSource({ key: "weatherForecast", kind: "failed", asOf: null, detail: `${detail}; ${err instanceof Error ? err.message : String(err)}` });
    return { forecast: null, fallback: true };
  }
}

async function loadNormals(): Promise<WeatherNormalsFile | null> {
  try {
    const data = await fetchJson("/data/weather/normals.json");
    if (isNormals(data)) {
      reportSource({ key: "weatherNormals", kind: "bundled", asOf: data.generatedAt });
      return data;
    }
  } catch { /* try live below */ }
  try {
    const live = await fetchJson(liveUrl("weather/normals.json"), { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) });
    if (!isNormals(live)) throw new Error("the live copy looked wrong");
    reportSource({ key: "weatherNormals", kind: "live", asOf: live.generatedAt });
    return live;
  } catch (err) {
    reportSource({ key: "weatherNormals", kind: "failed", asOf: null, detail: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

// Everything on a page that asks at once shares one download
let inFlight: Promise<WeatherData> | null = null;

/** Disneyland's forecast and typical weather; never rejects (missing parts are null). */
export function getWeather(): Promise<WeatherData> {
  inFlight ??= Promise.all([loadForecast(), loadNormals()])
    .then(([{ forecast, fallback }, normals]) => ({ forecast, normals, forecastIsFallback: fallback }))
    .finally(() => { setTimeout(() => { inFlight = null; }, 0); });
  return inFlight;
}
