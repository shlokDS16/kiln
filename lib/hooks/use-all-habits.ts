// =============================================================================
// useAllHabits — every active habit for the user, grouped by dimension,
// each group sorted by scheduled_time. Used by the Routines tab.
//
// RLS scopes to the signed-in user. `deleted_at` filter excludes soft-deleted.
// =============================================================================

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth-context";
import { supabase } from "../supabase";
import type { HabitDimension, HabitSchedule } from "./types";

export type RoutineHabit = {
  habit_id: string;
  name: string;
  dimension: HabitDimension;
  scheduled_time: string;
  duration_min: number;
  days: HabitSchedule["days"];
  rationale: string;
};

type Row = {
  id: string;
  name: string;
  dimension: HabitDimension;
  schedule_jsonb: HabitSchedule | null;
};

export function useAllHabits() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useQuery<RoutineHabit[], Error>({
    queryKey: ["all-habits", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habits")
        .select("id, name, dimension, schedule_jsonb")
        .eq("is_active", true)
        .is("deleted_at", null);
      if (error) throw error;
      const rows = (data ?? []) as Row[];

      const habits: RoutineHabit[] = rows
        .filter((r) => !!r.schedule_jsonb)
        .map((r) => ({
          habit_id: r.id,
          name: r.name,
          dimension: r.dimension,
          scheduled_time: r.schedule_jsonb!.scheduled_time,
          duration_min: r.schedule_jsonb!.duration_min,
          days: r.schedule_jsonb!.days,
          rationale: r.schedule_jsonb!.rationale,
        }));

      // Group will happen in the screen; here we just sort by dimension then time.
      habits.sort((a, b) => {
        if (a.dimension !== b.dimension) return a.dimension.localeCompare(b.dimension);
        return a.scheduled_time.localeCompare(b.scheduled_time);
      });
      return habits;
    },
  });
}
