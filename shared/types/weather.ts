// ==================== WEATHER TYPES ====================
// The two weather files each resort publishes under data/{dataPath}weather/
// (Disneyland: data/weather/), read by the Planner and Pal:
//   forecast.json — the National Weather Service forecast, about 6½ days of
//                   hours plus day/night summaries, refreshed hourly
//                   (functions/syncWeatherForecast.js)
//   normals.json  — "typical for this date" from NOAA's 1991–2020 climate
//                   normals, for days beyond the forecast
//                   (scripts/build-weather-normals.js)
// Temperatures are always °F; the apps convert for a °C setting. `code` is a
// WMO weather code: 0 clear, 1–3 cloud, 45 fog/haze, 61–67 rain,
// 71–77 snow, 80–82 showers, 95 thunderstorm.

// ==================== FORECAST ====================

export interface WeatherForecastHour {
  /** Start of the hour, ISO with the resort's offset ("2026-10-17T13:00:00-07:00") */
  time: string;
  /** Resort-local date and hour (0–23) */
  date: string;
  hour: number;
  tempF: number | null;
  /** Heat index from 80°F, wind chill at 50°F or below, else the temperature */
  feelsLikeF: number | null;
  /** Chance of precipitation, 0–100 */
  precipChance: number;
  humidity: number | null;
  windMph: number | null;
  /** Compass point the wind blows from ("E", "SW") */
  windDir: string | null;
  code: number | null;
  /** NWS short text, e.g. "Mostly Sunny" */
  summary: string | null;
  isDay: boolean;
}

export interface WeatherForecastDay {
  date: string;
  /** Daytime high; null for a forecast that starts at night ("Tonight") */
  highF: number | null;
  /** The low of the night that starts that evening */
  lowF: number | null;
  /** The higher of the day's and night's chance of precipitation, 0–100 */
  precipChance: number;
  code: number | null;
  summary: string | null;
  nightSummary: string | null;
}

export interface WeatherForecastFile {
  resortId: string;
  timezone: string;
  source: "nws";
  /** NWS forecast office gridpoint, e.g. "SGX/37,66" */
  gridpoint: string;
  /** When NWS last updated the forecast */
  issuedAt: string | null;
  /** When it was fetched and published */
  fetchedAt: string;
  hours: WeatherForecastHour[];
  days: WeatherForecastDay[];
}

// ==================== NORMALS ====================

export interface WeatherNormalsDay {
  /** Normal daily high and low, °F, one decimal */
  highF: number;
  lowF: number;
  /** Percent of years with at least 0.01 in. of rain on this date (NOAA smooths over a 29-day window) */
  rainChance: number;
  /** Typical temperature for each hour 0–23, °F */
  hourlyF: number[];
}

export interface WeatherNormalsFile {
  resortId: string;
  source: "noaa-normals-1991-2020";
  /** The station whose daily normals these are (GHCN id and name) */
  station: { id: string; name: string };
  /**
   * Where the hourly curve comes from: "measured" = this station's own
   * hourly normals; "scaled" = another station's hourly pattern for the
   * date, scaled to this station's normal high and low.
   */
  hourly: { method: "measured" | "scaled"; station: { id: string; name: string } };
  generatedAt: string;
  /** Keyed "MM-DD", including "02-29" */
  days: Record<string, WeatherNormalsDay>;
}
