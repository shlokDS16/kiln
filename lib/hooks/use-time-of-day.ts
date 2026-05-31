// =============================================================================
// useTimeOfDay — returns the current period (MORNING/MIDDAY/EVENING/LATE)
// + the palette shift the rest of the app should apply.
//
// Hours (device local, per CLAUDE.md §5 ember.{period} mapping):
//   05–10  MORNING  #E85D2A
//   10–16  MIDDAY   #FF6B2C
//   16–21  EVENING  #C73A2D
//   21–05  LATE     #8B2419  (wraps midnight)
//
// Re-evaluates every 60 s. Phase 4.5 ties this to HealthKit (morning palette
// doesn't activate until the phone unlocks after sleep) — for now it's pure
// clock-based.
// =============================================================================

import { useEffect, useState } from "react";

export type Period = "MORNING" | "MIDDAY" | "EVENING" | "LATE";

type PaletteShift = {
  ember: string;
  cream: string;
};

const EMBER: Record<Period, string> = {
  MORNING: "#E85D2A",
  MIDDAY:  "#FF6B2C",
  EVENING: "#C73A2D",
  LATE:    "#8B2419",
};

const CREAM = "#F4EEE3";

function periodForHour(hour: number): Period {
  if (hour >= 5 && hour < 10) return "MORNING";
  if (hour >= 10 && hour < 16) return "MIDDAY";
  if (hour >= 16 && hour < 21) return "EVENING";
  return "LATE";
}

export function useTimeOfDay(): { period: Period; paletteShift: PaletteShift } {
  const [period, setPeriod] = useState<Period>(() => periodForHour(new Date().getHours()));

  useEffect(() => {
    const id = setInterval(() => {
      setPeriod(periodForHour(new Date().getHours()));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return {
    period,
    paletteShift: { ember: EMBER[period], cream: CREAM },
  };
}
