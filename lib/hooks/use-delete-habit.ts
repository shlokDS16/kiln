// =============================================================================
// useDeleteHabit — SOFT delete (sets deleted_at = now()).
//
// Why soft delete: habit history (daily_logs, voice_quotes) FKs at habit_id
// with ON DELETE CASCADE — a hard delete would erase the log evidence too.
// Soft delete keeps the historical record intact and just hides the habit
// from the active queries (useTodayHabits + useAllHabits filter on
// `deleted_at IS NULL`).
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth-context";
import { supabase } from "../supabase";

export function useDeleteHabit() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  return useMutation<void, Error, { habit_id: string }>({
    mutationFn: async ({ habit_id }) => {
      if (!userId) throw new Error("not authenticated");
      const { error } = await supabase
        .from("habits")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", habit_id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-habits"] });
      queryClient.invalidateQueries({ queryKey: ["today"] });
    },
  });
}
