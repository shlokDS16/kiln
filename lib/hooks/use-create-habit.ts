// =============================================================================
// useCreateHabit — insert a new habit row.
//
// Input mirrors the form fields in HabitModal. Server fills user_id (RLS),
// id (gen_random_uuid()), is_active=true, created_at, updated_at.
//
// On success, invalidates ['all-habits'] AND ['today', …] (today screen may
// pick up the new habit immediately).
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth-context";
import { supabase } from "../supabase";
import type { DayKey, HabitDimension } from "./types";

export type CreateHabitInput = {
  name: string;
  dimension: HabitDimension;
  scheduled_time: string;       // "HH:MM"
  duration_min: number;
  days: DayKey[];
  rationale: string;
};

export function useCreateHabit() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  return useMutation<void, Error, CreateHabitInput>({
    mutationFn: async (input) => {
      if (!userId) throw new Error("not authenticated");
      const { error } = await supabase.from("habits").insert({
        user_id: userId,
        name: input.name,
        dimension: input.dimension,
        schedule_jsonb: {
          scheduled_time: input.scheduled_time,
          duration_min: input.duration_min,
          days: input.days,
          rationale: input.rationale,
        },
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-habits"] });
      queryClient.invalidateQueries({ queryKey: ["today"] });
    },
  });
}
