// =============================================================================
// PeriodSection — groups habits under a period header (MORNING / MIDDAY /
// EVENING / LATE) per CLAUDE.md §13 visual patterns.
//
// Header: mono uppercase period label left-aligned, mono hour range right-
// aligned, both dim. 1px hairline divider below the header. Then each
// habit through HabitRow.
//
// `nextHabitId` propagates from the Today screen so only one row across the
// whole screen gets isNext === true.
//
// If no habits in this period → render nothing (don't show empty sections).
// =============================================================================

import { Text, View } from "react-native";

import type { TodayHabit } from "../lib/hooks/types";
import { HabitRow } from "./HabitRow";

type Props = {
  period: "MORNING" | "MIDDAY" | "EVENING" | "LATE";
  hourRange: string; // e.g. "05–10"
  habits: TodayHabit[];
  nextHabitId: string | null;
};

export function PeriodSection({ period, hourRange, habits, nextHabitId }: Props) {
  if (habits.length === 0) return null;

  return (
    <View className="px-5 mt-7">
      {/* header */}
      <View className="flex-row justify-between items-baseline pb-2">
        <Text className="text-dim font-mono uppercase tracking-widest" style={{ fontSize: 10 }}>
          {period}
        </Text>
        <Text className="text-dim font-mono" style={{ fontSize: 10 }}>
          {hourRange}
        </Text>
      </View>
      <View className="h-px bg-hairline" />

      {/* habits */}
      <View>
        {habits.map((h) => (
          <HabitRow key={h.habit_id} habit={h} isNext={h.habit_id === nextHabitId} />
        ))}
      </View>
    </View>
  );
}
