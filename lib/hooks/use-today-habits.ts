// =============================================================================
// useTodayHabits — the array of habits scheduled for today, with status.
//
// Two parallel queries (cheaper than embed which pulls all-time logs per row):
//   1. habits where is_active = true AND deleted_at IS NULL
//   2. daily_logs where log_date = today
//
// RLS already scopes both to the signed-in user. Then for each habit whose
// schedule_jsonb.days includes today's day key, we derive status:
//
//   if log row exists:
//     completed_at non-null → FIRED
//     completed_at null     → BANKED
//   else (no log):
//     scheduled_time has passed in user-local time → COOLED
//     scheduled_time still in the future          → PENDING
//
// Sorted by scheduled_time.
// =============================================================================

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth-context";
import { supabase } from "../supabase";
import {
  nowHHMMLocal,
  todayDateLocal,
  todayDayKey,
  type HabitDimension,
  type HabitSchedule,
  type HabitStatus,
  type TodayHabit,
} from "./types";

type HabitRow = {
  id: string;
  name: string;
  dimension: HabitDimension;
  schedule_jsonb: HabitSchedule | null;
};

type LogRow = {
  habit_id: string;
  completed_at: string | null;
};

export function useTodayHabits() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const today = todayDateLocal();

  return useQuery<TodayHabit[], Error>({
    queryKey: ["today", userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const dayKey = todayDayKey();
      const nowHHMM = nowHHMMLocal();

      const [habitsRes, logsRes] = await Promise.all([
        supabase
          .from("habits")
          .select("id, name, dimension, schedule_jsonb")
          .eq("is_active", true)
          .is("deleted_at", null),
        supabase
          .from("daily_logs")
          .select("habit_id, completed_at")
          .eq("log_date", today),
      ]);

      if (habitsRes.error) throw habitsRes.error;
      if (logsRes.error) throw logsRes.error;

      const habits = (habitsRes.data ?? []) as HabitRow[];
      const logs = (logsRes.data ?? []) as LogRow[];

      const logByHabitId = new Map<string, LogRow>();
      for (const log of logs) logByHabitId.set(log.habit_id, log);

      const todayHabits: TodayHabit[] = [];
      for (const h of habits) {
        const sched = h.schedule_jsonb;
        if (!sched?.days?.includes(dayKey)) continue;

        const log = logByHabitId.get(h.id);
        let status: HabitStatus;
        if (log) {
          status = log.completed_at ? "FIRED" : "BANKED";
        } else {
          // No log row — distinguish PENDING (still due) from COOLED (passed).
          status = sched.scheduled_time < nowHHMM ? "COOLED" : "PENDING";
        }

        todayHabits.push({
          habit_id: h.id,
          name: h.name,
          dimension: h.dimension,
          scheduled_time: sched.scheduled_time,
          duration_min: sched.duration_min,
          status,
        });
      }

      todayHabits.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
      return todayHabits;
    },
  });
}
