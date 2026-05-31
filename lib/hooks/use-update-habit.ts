// =============================================================================
// useUpdateHabit — patch an existing habit row by id.
//
// The updated_at trigger from migration 20260531043331_updated_at_triggers
// stamps updated_at automatically on UPDATE — we don't need to set it here.
//
// Invalidates ['all-habits'], ['today'], and ['voice-quote', ...] for the
// edited habit (its name/scheduled_time changed → cached quote stale).
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth-context";
import { supabase } from "../supabase";
import type { DayKey, HabitDimension } from "./types";

export type UpdateHabitInput = {
  habit_id: string;
  name: string;
  dimension: HabitDimension;
  scheduled_time: string;
  duration_min: number;
  days: DayKey[];
  rationale: string;
};

export function useUpdateHabit() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateHabitInput>({
    mutationFn: async (input) => {
      if (!userId) throw new Error("not authenticated");
      const { error } = await supabase
        .from("habits")
        .update({
          name: input.name,
          dimension: input.dimension,
          schedule_jsonb: {
            scheduled_time: input.scheduled_time,
            duration_min: input.duration_min,
            days: input.days,
            rationale: input.rationale,
          },
        })
        .eq("id", input.habit_id)
        .eq("user_id", userId); // belt-and-suspenders; RLS already enforces
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["all-habits"] });
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["voice-quote", userId, input.habit_id] });
    },
  });
}
