"use client";

// ==================== AN HOUR'S WEATHER (TIMELINE) ====================
// Under each hour's label on Preview's timeline. Forecast hours: icon and
// temperature, plus the chance of rain from 20%, wind from 15 mph and
// "feels like" when the heat index is 3° or more above a 90°+ reading.
// Typical days: only the typical temperature, faint, since hour-by-hour
// rain averages are too noisy to be useful.

import { formatTemp, weatherCondition, type HourWeather as Hour } from "@shared/weather";
import { useAppStore } from "@/lib/store";

export default function HourWeather({ hour, typical }: { hour: Hour; typical: boolean }) {
  const { temperatureUnit: unit } = useAppStore();
  if (typical) {
    return (
      <div className="text-[9px] leading-tight mt-0.5" style={{ color: "var(--color-text-dim)", opacity: 0.8 }}
           title="Typical temperature for this hour (1991–2020 averages)">
        ~{formatTemp(hour.tempF, unit)}
      </div>
    );
  }
  const { icon, label } = weatherCondition(hour.code, hour.isDay ?? true);
  const feels = hour.feelsLikeF != null && hour.tempF != null && hour.tempF >= 90 && hour.feelsLikeF - hour.tempF >= 3;
  return (
    <div data-testid="hour-weather" className="text-[9px] leading-tight mt-0.5 space-y-px" style={{ color: "var(--color-text-muted)" }}>
      <div title={label}><span aria-hidden="true">{icon}</span> {formatTemp(hour.tempF, unit)}</div>
      {(hour.precipChance ?? 0) >= 20 && <div title="Chance of rain">{"☔"}{hour.precipChance}%</div>}
      {(hour.windMph ?? 0) >= 15 && <div title="Wind">{"💨"}{hour.windMph} mph</div>}
      {feels && <div title="Feels like">feels {formatTemp(hour.feelsLikeF, unit)}</div>}
    </div>
  );
}
