// ==================== WEATHER HELPERS ====================
// Pure helpers both apps use with the weather files (shared/types/weather.ts):
// °F/°C display, condition icons, each trip day's weather (the forecast when
// the day is within it, otherwise "typical" from the normals), packing tips
// drawn from those days, and sunrise/sunset.

import type { WeatherForecastFile, WeatherNormalsFile } from "./types/weather";

export type TempUnit = "F" | "C";

// ==================== TEMPERATURES ====================

/** A °F value in the chosen unit, rounded. */
export function toUnit(tempF: number, unit: TempUnit): number {
  return Math.round(unit === "C" ? ((tempF - 32) * 5) / 9 : tempF);
}

/** "84°" (the unit shown once elsewhere, e.g. on the °F/°C switch); "–" when unknown. */
export function formatTemp(tempF: number | null | undefined, unit: TempUnit): string {
  return typeof tempF === "number" ? `${toUnit(tempF, unit)}°` : "–";
}

// ==================== CONDITIONS ====================

/** An emoji and words for a WMO weather code (null = unknown). */
export function weatherCondition(code: number | null | undefined, isDay = true): { icon: string; label: string } {
  if (code == null) return { icon: isDay ? "🌡️" : "🌙", label: "Conditions unknown" };
  if (code === 0) return { icon: isDay ? "☀️" : "🌙", label: "Clear" };
  if (code === 1) return { icon: isDay ? "🌤️" : "🌙", label: "Mostly clear" };
  if (code === 2) return { icon: isDay ? "⛅" : "☁️", label: "Partly cloudy" };
  if (code === 3) return { icon: "☁️", label: "Cloudy" };
  if (code >= 45 && code <= 48) return { icon: "🌫️", label: "Fog or haze" };
  if (code >= 51 && code <= 67) return { icon: "🌧️", label: "Rain" };
  if (code >= 71 && code <= 77) return { icon: "🌨️", label: "Snow" };
  if (code >= 80 && code <= 86) return { icon: "🌦️", label: "Showers" };
  if (code >= 95) return { icon: "⛈️", label: "Thunderstorms" };
  return { icon: "🌡️", label: "Conditions unknown" };
}

// ==================== A DAY'S WEATHER ====================

export interface HourWeather {
  hour: number;
  tempF: number | null;
  /** Forecast only from here down */
  feelsLikeF?: number | null;
  precipChance?: number;
  windMph?: number | null;
  code?: number | null;
  isDay?: boolean;
}

export interface DayWeather {
  date: string;
  /** "forecast" within the NWS forecast; "typical" from the 1991–2020 normals */
  kind: "forecast" | "typical";
  highF: number | null;
  lowF: number | null;
  /** Forecast: chance of rain. Typical: percent of years with rain on this date */
  precipChance: number;
  code: number | null;
  summary: string | null;
  hours: HourWeather[];
}

function forecastDay(date: string, forecast: WeatherForecastFile): DayWeather | null {
  const day = forecast.days.find((d) => d.date === date);
  const hours = forecast.hours.filter((h) => h.date === date);
  if (!day && hours.length === 0) return null;
  const temps = hours.map((h) => h.tempF).filter((t): t is number => typeof t === "number");
  return {
    date,
    kind: "forecast",
    // A forecast that starts tonight has no daytime high; the hours left give the best guess
    highF: day?.highF ?? (temps.length ? Math.max(...temps) : null),
    lowF: day?.lowF ?? (temps.length ? Math.min(...temps) : null),
    precipChance: day?.precipChance ?? Math.max(0, ...hours.map((h) => h.precipChance)),
    code: day?.code ?? hours[0]?.code ?? null,
    summary: day?.summary ?? hours[0]?.summary ?? null,
    hours: hours.map((h) => ({
      hour: h.hour, tempF: h.tempF, feelsLikeF: h.feelsLikeF, precipChance: h.precipChance,
      windMph: h.windMph, code: h.code, isDay: h.isDay,
    })),
  };
}

function typicalDay(date: string, normals: WeatherNormalsFile): DayWeather | null {
  const n = normals.days[date.slice(5)];
  if (!n) return null;
  return {
    date,
    kind: "typical",
    highF: n.highF,
    lowF: n.lowF,
    precipChance: n.rainChance,
    code: null,
    summary: null,
    hours: n.hourlyF.map((tempF, hour) => ({ hour, tempF })),
  };
}

/**
 * The weather to show for a date: the forecast when the date is in it,
 * otherwise typical weather for the date, or null for a date before
 * `today` (nothing is kept for past days) or when neither file has it.
 */
export function dayWeather(
  date: string,
  today: string,
  forecast: WeatherForecastFile | null,
  normals: WeatherNormalsFile | null,
): DayWeather | null {
  if (date < today) return null;
  return (forecast && forecastDay(date, forecast)) || (normals && typicalDay(date, normals)) || null;
}

// ==================== PACKING TIPS ====================

export interface PackingTip {
  id: "rain" | "cool" | "hot";
  /** e.g. "Rain likely Thu (60%)" */
  text: string;
  /** The Prepare tab and sub-category the tip points to (shared/constants/packing.ts) */
  type: "outfit" | "sundry";
  category: string;
}

const RAIN_FORECAST = 40;   // forecast chance of rain, %
const RAIN_TYPICAL = 25;    // percent of years with rain on the date
const COOL_LOW_F = 58;
const HOT_HIGH_F = 90;
const HOT_FEELS_F = 95;

const weekday = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

function rainTip(days: DayWeather[]): PackingTip | null {
  const wet = days.filter((d) => d.kind === "forecast" && d.precipChance >= RAIN_FORECAST);
  if (wet.length) {
    const top = wet.reduce((a, b) => (b.precipChance > a.precipChance ? b : a));
    const when = wet.length === 1 ? weekday(top.date) : wet.map((d) => weekday(d.date)).join(", ");
    return { id: "rain", text: `Rain likely ${when} (up to ${top.precipChance}%): pack rain gear`, type: "outfit", category: "Weather Gear" };
  }
  const typical = days.filter((d) => d.kind === "typical" && d.precipChance >= RAIN_TYPICAL);
  if (!typical.length) return null;
  const top = Math.max(...typical.map((d) => d.precipChance));
  return { id: "rain", text: `Rain falls on about ${top}% of these dates most years: a poncho is worth packing`, type: "outfit", category: "Weather Gear" };
}

/**
 * Up to three tips from the trip's weather, each pointing at a packing
 * sub-category: rain (Outfits › Weather Gear), cool evenings (the same) and
 * heat (Sundries › Skincare & Sun).
 */
export function packingTips(days: DayWeather[], unit: TempUnit): PackingTip[] {
  const tips: PackingTip[] = [];
  const rain = rainTip(days);
  if (rain) tips.push(rain);
  const lows = days.map((d) => d.lowF).filter((t): t is number => typeof t === "number");
  if (lows.length && Math.min(...lows) <= COOL_LOW_F) {
    tips.push({ id: "cool", text: `Evenings down to ${formatTemp(Math.min(...lows), unit)}: bring a layer for after dark`, type: "outfit", category: "Weather Gear" });
  }
  const highs = days.map((d) => d.highF).filter((t): t is number => typeof t === "number");
  const feels = days.flatMap((d) => d.hours.map((h) => h.feelsLikeF)).filter((t): t is number => typeof t === "number");
  const maxHigh = highs.length ? Math.max(...highs) : null;
  if ((maxHigh != null && maxHigh >= HOT_HIGH_F) || feels.some((t) => t >= HOT_FEELS_F)) {
    const peak = Math.max(maxHigh ?? -Infinity, ...feels);
    tips.push({ id: "hot", text: `Highs near ${formatTemp(peak, unit)}: sunscreen, a hat and water`, type: "sundry", category: "Skincare & Sun" });
  }
  return tips;
}

// ==================== SUNRISE AND SUNSET ====================

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const mod = (n: number, m: number) => ((n % m) + m) % m;

/** UT hours of sunrise or sunset (the U.S. Naval Observatory's almanac method, about a minute's accuracy). */
function sunEventUT(dayOfYear: number, lat: number, lon: number, rising: boolean): number | null {
  const lngHour = lon / 15;
  const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  const L = mod(M + 1.916 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 282.634, 360);
  let RA = mod(deg(Math.atan(0.91764 * Math.tan(rad(L)))), 360);
  RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
  const sinDec = 0.39782 * Math.sin(rad(L));
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(rad(90.833)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)));
  if (cosH > 1 || cosH < -1) return null; // no sunrise or sunset that day
  const H = (rising ? 360 - deg(Math.acos(cosH)) : deg(Math.acos(cosH))) / 15;
  return mod(H + RA - 0.06571 * t - 6.622 - lngHour, 24);
}

/** The instant of a UT hour on the given local date (the UT day can differ from the local one). */
function onLocalDate(date: string, utHours: number, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  let at = new Date(Date.UTC(y, m - 1, d) + utHours * 3_600_000);
  const local = at.toLocaleDateString("en-CA", { timeZone });
  if (local < date) at = new Date(at.getTime() + 86_400_000);
  if (local > date) at = new Date(at.getTime() - 86_400_000);
  return at;
}

/** Sunrise and sunset on a local date ("YYYY-MM-DD") at a place, as instants; null in polar day/night. */
export function sunTimes(date: string, lat: number, lon: number, timeZone: string): { sunrise: Date; sunset: Date } | null {
  const [y, m, d] = date.split("-").map(Number);
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  const rise = sunEventUT(dayOfYear, lat, lon, true);
  const set = sunEventUT(dayOfYear, lat, lon, false);
  if (rise == null || set == null) return null;
  return { sunrise: onLocalDate(date, rise, timeZone), sunset: onLocalDate(date, set, timeZone) };
}

/** "6:24 PM" in a time zone. */
export function clockTime(at: Date, timeZone: string): string {
  return at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
}
