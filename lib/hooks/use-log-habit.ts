// =============================================================================
// useLogHabit — mutation. Marks a habit FIRED (completed) or BANKED (skipped)
// for today. Uses CLAUDE.md §12 status vocabulary.
//
// DB mapping:
//   FIRED  → completed_at = now ISO
//   BANKED → completed_at = null
//
// Idempotent via the (user_id, habit_id, log_date) UNIQUE on daily_logs.
// We use `upsert` with onConflict so re-logging the same habit on the same
// day updates the existing row instead of failing.
//
// Optimistic flow:
//   onMutate  → snapshot ['today', uid, today] cache, patch the matching habit
//   mutationFn → fire the upsert
//   onError   → restore snapshot
//   onSettled → invalidate today (re-fetch ground truth) AND streak
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth-context";
import { supabase } from "../supabase";
import {
  todayDateLocal,
  type LogHabitInput,
  type TodayHabit,
} from "./types";

type Context = { previous?: TodayHabit[]; queryKey?: readonly unknown[] };

export function useLogHabit() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  return useMutation<void, Error, LogHabitInput, Context>({
    mutationFn: async (input) => {
      if (!userId) throw new Error("not authenticated");
      const today = todayDateLocal();
      const { error } = await supabase
        .from("daily_logs")
        .upsert(
          {
            user_id: userId,
            habit_id: input.habit_id,
            log_date: today,
            completed_at:
              input.status === "FIRED" ? new Date().toISOString() : null,
            value: input.value ?? null,
            note: input.note ?? null,
          },
          { onConflict: "user_id,habit_id,log_date" },
        );
      if (error) throw error;
    },

    onMutate: async (input) => {
      if (!userId) return {};
      const today = todayDateLocal();
      const queryKey = ["today", userId, today] as const;

      // Don't let an in-flight refetch overwrite our optimistic patch.
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<TodayHabit[]>(queryKey);
      queryClient.setQueryData<TodayHabit[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((h) =>
          h.habit_id === input.habit_id ? { ...h, status: input.status } : h,
        );
      });

      return { previous, queryKey };
    },

    onError: (_err, _input, context) => {
      if (context?.queryKey && context.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },

    onSettled: () => {
      if (!userId) return;
      const today = todayDateLocal();
      queryClient.invalidateQueries({ queryKey: ["today", userId, today] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
    },
  });
}
