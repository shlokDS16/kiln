// =============================================================================
// MetricsRow — three micro-metrics under DayPhrase.
//
//   TEMP  = 750 + heat * 1.5  (rounded, shown as e.g. "865°"). Ember color.
//   YIELD = `${completedToday}/${totalToday}`. Cream.
//   DEPTH = `${round(focusMinutes / focusTarget * 100)}%`. Cream.
//
// Labels above values in mono micro tracked-wide, dim.
// All values in mono 13pt per CLAUDE.md §5 (between body and label).
// =============================================================================

import { Text, View } from "react-native";

type Props = {
  heat: number;            // 0-100 — % of today's habits FIRED
  completedToday: number;
  totalToday: number;
  focusMinutes: number;    // today's tracked focus time
  focusTarget: number;     // user's daily target (minutes)
};

export function MetricsRow({
  heat,
  completedToday,
  totalToday,
  focusMinutes,
  focusTarget,
}: Props) {
  const temp = Math.round(750 + heat * 1.5);
  const yieldStr = `${completedToday}/${totalToday}`;
  const depthPct = focusTarget > 0
    ? Math.round((focusMinutes / focusTarget) * 100)
    : 0;

  return (
    <View className="flex-row px-5 pt-6">
      <Metric label="TEMP"  value={`${temp}°`}     accent />
      <Metric label="YIELD" value={yieldStr} />
      <Metric label="DEPTH" value={`${depthPct}%`} />
    </View>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View className="flex-1">
      <Text className="text-dim font-mono uppercase tracking-widest mb-1" style={{ fontSize: 10 }}>
        {label}
      </Text>
      <Text
        className={`${accent ? "text-ember" : "text-cream"} font-mono`}
        style={{ fontSize: 13 }}
      >
        {value}
      </Text>
    </View>
  );
}
