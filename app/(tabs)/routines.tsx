// =============================================================================
// Routines tab — every habit grouped by dimension, with Add/Edit/Delete.
//
// Composition (top to bottom):
//   Header row: "ROUTINES" (display italic 32pt) + "+" button (right)
//   For each dimension that has habits:
//     Dimension label (mono caps tracked-wide dim) + count (right-aligned)
//     1px hairline
//     HabitRow (read-only) for each habit — tap opens HabitModal in edit mode
//   If no habits at all: empty-state copy + suggestion to tap +
//
// All habit data via useAllHabits (RLS-scoped, excludes soft-deleted).
// =============================================================================

import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { HabitModal } from "../../components/HabitModal";
import { HabitRow } from "../../components/HabitRow";
import { useAllHabits, type RoutineHabit } from "../../lib/hooks/use-all-habits";
import type { HabitDimension } from "../../lib/hooks/types";

const DIMENSION_ORDER: HabitDimension[] = [
  "deep_work",
  "focus_discipline",
  "sleep",
  "energy",
  "mood",
  "diet",
  "habit",
];

const DIMENSION_LABEL: Record<HabitDimension, string> = {
  habit:            "GENERAL",
  deep_work:        "DEEP WORK",
  focus_discipline: "FOCUS DISCIPLINE",
  energy:           "ENERGY",
  mood:             "MOOD",
  diet:             "DIET",
  sleep:            "SLEEP",
};

export default function Routines() {
  const habitsQ = useAllHabits();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<RoutineHabit | null>(null);

  const habits = habitsQ.data ?? [];

  // Group by dimension preserving DIMENSION_ORDER.
  const byDim = useMemo(() => {
    const groups: Record<HabitDimension, RoutineHabit[]> = {
      habit: [], deep_work: [], focus_discipline: [], energy: [], mood: [], diet: [], sleep: [],
    };
    for (const h of habits) groups[h.dimension].push(h);
    return groups;
  }, [habits]);

  const openCreate = () => {
    setEditingHabit(null);
    setModalOpen(true);
  };
  const openEdit = (habit: RoutineHabit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  if (habitsQ.isLoading) {
    return (
      <View className="flex-1 bg-deep items-center justify-center">
        <ActivityIndicator color="#F4EEE3" />
      </View>
    );
  }

  if (habitsQ.isError) {
    return (
      <View className="flex-1 bg-deep items-center justify-center px-5">
        <Text className="text-ember font-mono uppercase tracking-widest" style={{ fontSize: 11 }}>
          could not load routines
        </Text>
        <Text className="text-dim font-mono mt-2" style={{ fontSize: 11 }}>
          {habitsQ.error?.message ?? "unknown error"}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-deep">
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Header */}
        <View className="flex-row items-end justify-between px-5 pt-7 pb-2">
          <Text
            className="text-cream font-display font-black italic"
            style={{ fontSize: 32, lineHeight: 36 }}
          >
            routines
          </Text>
          <Pressable
            onPress={openCreate}
            hitSlop={12}
            className="border border-ember px-3 py-2 active:opacity-60"
          >
            <Text
              className="text-ember font-mono uppercase tracking-widest"
              style={{ fontSize: 11 }}
            >
              + add
            </Text>
          </Pressable>
        </View>

        {/* Empty state */}
        {habits.length === 0 ? (
          <View className="px-5 pt-7">
            <Text className="text-dim font-body italic" style={{ fontSize: 16, lineHeight: 22 }}>
              no habits yet. the Orchestrator will populate these when onboarding
              finishes — or tap + to add one manually.
            </Text>
          </View>
        ) : null}

        {/* Dimension groups */}
        {DIMENSION_ORDER.map((dim) => {
          const group = byDim[dim];
          if (group.length === 0) return null;
          return (
            <View key={dim} className="px-5 mt-7">
              <View className="flex-row justify-between items-baseline pb-2">
                <Text className="text-dim font-mono uppercase tracking-widest" style={{ fontSize: 10 }}>
                  {DIMENSION_LABEL[dim]}
                </Text>
                <Text className="text-dim font-mono" style={{ fontSize: 10 }}>
                  {group.length}
                </Text>
              </View>
              <View className="h-px bg-hairline" />
              {group.map((h) => (
                <HabitRow
                  key={h.habit_id}
                  habit={{
                    habit_id:       h.habit_id,
                    name:           h.name,
                    dimension:      h.dimension,
                    scheduled_time: h.scheduled_time,
                    duration_min:   h.duration_min,
                  }}
                  readOnly
                  onPress={() => openEdit(h)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>

      <HabitModal
        visible={modalOpen}
        onClose={closeModal}
        existingHabit={editingHabit}
      />
    </View>
  );
}
