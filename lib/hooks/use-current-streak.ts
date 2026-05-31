// =============================================================================
// useCurrentStreak — current consecutive-day streak for the user.
//
// Default = "any habit completed" streak. If a dimension is passed (e.g.
// 'deep_work'), only completions of habits in that dimension count.
//
// Strategy: fetch last 90 days of daily_logs where completed_at IS NOT NULL
// (joined to habits for the dimension filter), then walk back from today.
//
// Streak rules:
//   - If today has ≥1 qualifying completion → today counts, walk back
//   - If today has NONE → don't count today, but don't break (one freebie
//     for the in-progress day)
//   - First day BEFORE today with no qualifying completion → break
//   - Cap at 90 (the fetched window). Returning 90 is the "I should fetch more"
//     signal — Phase 4 can push this to a Postgres function if the cap is hit.
// =============================================================================

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth-context";
import { supabase } from "../supabase";
import { todayDateLocal, type HabitDimension } from "./types";

type LogRow = {
  log_date: string;
  habits: { dimension: HabitDimension } | null;
};

const WINDOW_DAYS = 90;

export function useCurrentStreak(dimension?: HabitDimension) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const today = todayDateLocal();

  return useQuery<number, Error>({
    queryKey: ["streak", userId, dimension ?? "any"],
    enabled: !!userId,
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);
      const cutoffStr = todayDateLocal(cutoff);

      const { data, error } = await supabase
        .from("daily_logs")
        .select("log_date, habits!inner(dimension)")
        .gte("log_date", cutoffStr)
        .not("completed_at", "is", null);

      if (error) throw error;

      const rows = (data ?? []) as unknown as LogRow[];

      const completedDates = new Set<string>();
      for (const row of rows) {
        if (dimension && row.habits?.dimension !== dimension) continue;
        completedDates.add(row.log_date);
      }

      let streak = 0;
      const cursor = new Date();
      let iters = 0;

      // walk back at most WINDOW_DAYS days
      while (iters < WINDOW_DAYS) {
        const cursorStr = todayDateLocal(cursor);
        if (completedDates.has(cursorStr)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else if (cursorStr === today) {
          // today is still pending — skip without breaking the streak
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
        iters++;
      }

      return streak;
    },
  });
}
