// =============================================================================
// MetricsRow — four micro-metrics: TEMP / YIELD / DEPTH / VESSEL.
//   TEMP   = computeKilnTemp(snapshot, completionRate)  -> "{n}°"  (ember)
//   YIELD  = fired/total                                            (cream)
//   DEPTH  = focus% + active-calorie bonus, clamp 0-100 -> "{n}%"   (cream)
//   VESSEL = HRV-derived vesselHealth -> "{n}°", or "—" off-iOS     (cream)
// VESSEL is cream (a fact, not an emotion). Labels mono micro dim.
// =============================================================================

import { Text, View } from "react-native";

import { HEALTHKIT_ENABLED } from "../lib/constants";
import { useHealthSnapshot } from "../lib/hooks/useHealthSnapshot";
import { clamp, computeKilnTemp, emptySnapshot } from "../lib/health/mapping";

type Props = {
  heat: number;
  completedToday: number;
  totalToday: number;
  focusMinutes: number;
  focusTarget: number;
};

export function MetricsRow({ completedToday, totalToday, focusMinutes, focusTarget }: Props) {
  const snapshotQ = useHealthSnapshot();
  const snapshot = snapshotQ.data ?? emptySnapshot();
  const completionRate = totalToday > 0 ? completedToday / totalToday : 0;

  const temp = computeKilnTemp(snapshot, completionRate);
  const yieldStr = `${completedToday}/${totalToday}`;
  const depthPct = clamp(
    Math.round(
      (focusTarget > 0 ? (focusMinutes / focusTarget) * 100 : 0) +
        (snapshot.activeCaloriesToday / 600) * 30,
    ),
    0,
    100,
  );
  const vessel =
    HEALTHKIT_ENABLED && snapshot.vesselHealth > 0 ? `${snapshot.vesselHealth}°` : "—";

  return (
    <View className="flex-row px-5 pt-6">
      <Metric label="TEMP" value={`${temp}°`} accent />
      <Metric label="YIELD" value={yieldStr} />
      <Metric label="DEPTH" value={`${depthPct}%`} />
      <Metric label="VESSEL" value={vessel} />
    </View>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-1">
      <Text className="text-dim font-mono uppercase tracking-widest mb-1" style={{ fontSize: 10 }}>
        {label}
      </Text>
      <Text className={`${accent ? "text-ember" : "text-cream"} font-mono`} style={{ fontSize: 13 }}>
        {value}
      </Text>
    </View>
  );
}
