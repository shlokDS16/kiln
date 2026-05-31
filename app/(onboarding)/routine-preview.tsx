// =============================================================================
// Routine preview — last screen of onboarding. Reads the Gemini response from
// the Zustand store, presents the synthesis paragraph + a week-grid of habits,
// and gates entry into the main app on the user pressing ACTIVATE.
//
// The routine row in Postgres was already inserted with is_active=true by the
// Edge Function — so ACTIVATE here is purely a navigation event (clears the
// onboarding stack and sends the user to (tabs)/today). REGENERATE pops back
// to goals so the user can refine inputs and re-call the Orchestrator.
// =============================================================================

import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  useOnboardingStore,
  type OrchestratorResponse,
} from "../../stores/onboarding-store";

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Day = (typeof DAY_ORDER)[number];

const DAY_LABEL: Record<Day, string> = {
  mon: "MON",
  tue: "TUE",
  wed: "WED",
  thu: "THU",
  fri: "FRI",
  sat: "SAT",
  sun: "SUN",
};

export default function RoutinePreview() {
  const router = useRouter();
  const data = useOnboardingStore((s) => s.orchestratorResponse);
  const reset = useOnboardingStore((s) => s.reset);

  // Group habits by day, sorted by scheduled_time.
  const byDay = useMemo(() => groupHabitsByDay(data), [data]);

  if (!data) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-5">
        <Text className="text-textDim font-mono text-micro uppercase tracking-widest text-center">
          no routine to preview yet
        </Text>
        <Pressable
          className="mt-5 border border-accent px-5 py-3 active:opacity-60"
          onPress={() => router.replace("/(onboarding)/goals")}
        >
          <Text className="text-text font-mono text-body uppercase tracking-widest">
            back to goals
          </Text>
        </Pressable>
      </View>
    );
  }

  const onActivate = () => {
    // The routines row is already is_active=true server-side. Just navigate
    // away and clear the onboarding state from memory.
    reset();
    router.replace("/(tabs)/today");
  };

  const onRegenerate = () => {
    router.replace("/(onboarding)/goals");
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 48,
          paddingBottom: 24,
        }}
      >
        {/* Synthesis — the first thing the user reads */}
        <Text
          className="text-text font-display"
          style={{ fontSize: 18, lineHeight: 28 }}
        >
          {data.synthesis}
        </Text>

        {/* divider */}
        <View className="h-px bg-accent mt-7 mb-5" />

        {/* YOUR WEEK */}
        <Text className="text-textDim font-mono text-micro uppercase tracking-widest mb-5">
          YOUR WEEK · wakes {data.routine.wake_time} · sleeps {data.routine.sleep_time}
        </Text>

        {DAY_ORDER.map((day) => {
          const habits = byDay[day];
          if (habits.length === 0) return null;
          return (
            <View key={day} className="mb-6">
              <Text className="text-textDim font-mono text-micro uppercase tracking-widest mb-3">
                {DAY_LABEL[day]}
              </Text>
              {habits.map((h, i) => (
                <View key={`${day}-${i}`} className="flex-row items-baseline mb-2">
                  <Text className="text-accent font-mono text-body" style={{ width: 64 }}>
                    {h.scheduled_time}
                  </Text>
                  <View className="flex-1 mr-3">
                    <Text className="text-text font-body text-body">{h.name}</Text>
                  </View>
                  <Text className="text-textDim font-mono text-micro uppercase tracking-widest">
                    {h.dimension}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* bottom action bar */}
      <View className="px-5 pb-7 pt-3 border-t border-border bg-bg">
        <Pressable
          onPress={onActivate}
          className="bg-accent py-4 active:opacity-60"
        >
          <Text className="text-bg font-mono text-body text-center uppercase tracking-widest">
            activate
          </Text>
        </Pressable>
        <Pressable
          onPress={onRegenerate}
          className="mt-3 active:opacity-60 py-3"
        >
          <Text className="text-textDim font-mono text-micro text-center uppercase tracking-widest">
            regenerate
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function groupHabitsByDay(
  data: OrchestratorResponse | null,
): Record<Day, OrchestratorResponse["routine"]["habits"]> {
  const empty = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] } as Record<
    Day,
    OrchestratorResponse["routine"]["habits"]
  >;
  if (!data) return empty;

  for (const habit of data.routine.habits) {
    for (const day of habit.days) {
      if (DAY_ORDER.includes(day as Day)) {
        empty[day as Day].push(habit);
      }
    }
  }
  for (const day of DAY_ORDER) {
    empty[day].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  }
  return empty;
}
