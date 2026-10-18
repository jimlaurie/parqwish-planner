"use client";

// ==================== °F / °C SWITCH ====================
// The temperature unit for all weather (store.temperatureUnit, remembered).

import { useAppStore } from "@/lib/store";

export default function UnitSwitch({ accent }: { accent: string }) {
  const { temperatureUnit, setTemperatureUnit } = useAppStore();
  return (
    <div role="group" aria-label="Temperature unit" className="inline-flex rounded-full p-0.5 text-[11px] font-semibold"
         style={{ backgroundColor: "var(--color-surface-raised)" }}>
      {(["F", "C"] as const).map((unit) => {
        const on = temperatureUnit === unit;
        return (
          <button key={unit} type="button" aria-pressed={on} onClick={() => setTemperatureUnit(unit)}
                  className="px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                  style={{ backgroundColor: on ? `color-mix(in srgb, ${accent} 22%, transparent)` : "transparent", color: on ? accent : "var(--color-text-dim)" }}>
            °{unit}
          </button>
        );
      })}
    </div>
  );
}
