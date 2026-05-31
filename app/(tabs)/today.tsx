// =============================================================================
// Today screen — KILN's most-visited surface.
//
// Composition (top-to-bottom):
//   KilnHero (heat = % of today's habits FIRED, drives image bucket + marginalia)
//   DayPhrase ("DAY [WORDS] IN / THE FIRING")
//   MetricsRow (TEMP / YIELD / DEPTH)
//   1px hairline
//   EnergyTap (5-cell 1-5 energy log)
//   1px hairline
//   PeriodSection MORNING / MIDDAY / EVENING / LATE
//   ENTER THE FIRING button (no-op Phase 3, hooks into Phase 5 focus timer)
//
// The "next pending" habit propagates from here down through the sections
// so exactly one HabitRow gets isNext === true at any moment.
// =============================================================================

import { useEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useQueryClient } from "@tanstack/react-query";

import { DayPhrase } from "../../components/DayPhrase";
import { EnergyTap } from "../../components/EnergyTap";
import { KilnHero } from "../../components/KilnHero";
import { MetricsRow } from "../../components/MetricsRow";
import { PeriodSection } from "../../components/PeriodSection";
import { useAuth } from "../../lib/auth-context";
import { useCurrentStreak } from "../../lib/hooks/use-current-streak";
import { useTodayHabits } from "../../lib/hooks/use-today-habits";
import { voiceQuoteQuery } from "../../lib/hooks/use-voice-profile-quote";
import { nowHHMMLocal, type TodayHabit } from "../../lib/hooks/types";

type Period = "MORNING" | "MIDDAY" | "EVENING" | "LATE";

const PERIOD_RANGE: Record<Period, string> = {
  MORNING: "05–10",
  MIDDAY:  "10–16",
  EVENING: "16–21",
  LATE:    "21–05",
};

function periodForTime(hhmm: string): Period {
  const h = parseInt(hhmm.slice(0, 2), 10);
  if (h >= 5 && h < 10) return "MORNING";
  if (h >= 10 && h < 16) return "MIDDAY";
  if (h >= 16 && h < 21) return "EVENING";
  return "LATE"; // 21–24 or 00–05
}

/** "HH:MM" -> minutes since midnight (for the 3h voice-quote pre-warm window). */
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default function Today() {
  const todayQ = useTodayHabits();
  const streakQ = useCurrentStreak();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const habits = todayQ.data ?? [];
  const streakDays = streakQ.data ?? 0;

  // Heat = % of today's habits FIRED. If no habits today, heat=0 (banked).
  const totalToday = habits.length;
  const firedToday = habits.filter((h) => h.status === "FIRED").length;
  const heat = totalToday > 0 ? (firedToday / totalToday) * 100 : 0;

  // Next pending habit = chronologically first PENDING (habits are pre-sorted).
  const nextHabitId = useMemo(() => {
    const next = habits.find((h) => h.status === "PENDING");
    return next?.habit_id ?? null;
  }, [habits]);

  // Group by period.
  const byPeriod = useMemo(() => {
    const groups: Record<Period, TodayHabit[]> = {
      MORNING: [], MIDDAY: [], EVENING: [], LATE: [],
    };
    for (const h of habits) groups[periodForTime(h.scheduled_time)].push(h);
    return groups;
  }, [habits]);

  // Pre-warm the voice-quote cache for PENDING habits due within the next 3h,
  // so the Marginalia under the next-pending habit renders instantly (no 1-2s
  // spinner on first scroll). Best-effort: per-habit failures are swallowed.
  useEffect(() => {
    const data = todayQ.data;
    if (!session?.user?.id || !data || data.length === 0) return;
    const cutoff = toMin(nowHHMMLocal()) + 180;
    const upcoming = data.filter(
      (h) => h.status === "PENDING" && toMin(h.scheduled_time) <= cutoff,
    );
    if (upcoming.length === 0) return;
    void Promise.all(
      upcoming.map((h) =>
        queryClient.prefetchQuery(voiceQuoteQuery(session, h.habit_id)).catch(() => {}),
      ),
    );
  }, [todayQ.data, session, queryClient]);

  if (todayQ.isLoading) {
    return (
      <View className="flex-1 bg-deep items-center justify-center">
        <ActivityIndicator color="#F4EEE3" />
      </View>
    );
  }

  if (todayQ.isError) {
    return (
      <View className="flex-1 bg-deep items-center justify-center px-5">
        <Text className="text-ember font-mono text-micro uppercase tracking-widest">
          could not load today
        </Text>
        <Text className="text-dim font-mono mt-2" style={{ fontSize: 11 }}>
          {todayQ.error?.message ?? "unknown error"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-deep"
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      <KilnHero heatLevel={heat} streakDays={streakDays} />
      <DayPhrase streakDays={streakDays} />
      <MetricsRow
        heat={heat}
        completedToday={firedToday}
        totalToday={totalToday}
        focusMinutes={0}     // Phase 5 wires in focus_sessions
        focusTarget={180}    // default 3h target until user-config lands
      />

      <View className="h-px bg-hairline mt-6" />
      <EnergyTap />
      <View className="h-px bg-hairline mt-6" />

      <PeriodSection
        period="MORNING"
        hourRange={PERIOD_RANGE.MORNING}
        habits={byPeriod.MORNING}
        nextHabitId={nextHabitId}
      />
      <PeriodSection
        period="MIDDAY"
        hourRange={PERIOD_RANGE.MIDDAY}
        habits={byPeriod.MIDDAY}
        nextHabitId={nextHabitId}
      />
      <PeriodSection
        period="EVENING"
        hourRange={PERIOD_RANGE.EVENING}
        habits={byPeriod.EVENING}
        nextHabitId={nextHabitId}
      />
      <PeriodSection
        period="LATE"
        hourRange={PERIOD_RANGE.LATE}
        habits={byPeriod.LATE}
        nextHabitId={nextHabitId}
      />

      {/* ENTER THE FIRING — Phase 5 focus timer hook (no-op in Phase 3) */}
      <View className="px-5 mt-8">
        <Pressable
          className="border border-hairline py-4 active:opacity-60"
          onPress={() => { /* phase 5 — focus session */ }}
        >
          <Text className="text-dim font-mono text-center uppercase tracking-widest" style={{ fontSize: 11 }}>
            enter the firing
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
