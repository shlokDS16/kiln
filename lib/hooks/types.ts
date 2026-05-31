// =============================================================================
// Shared types + tiny date helpers for the data-layer hooks.
//
// Status vocabulary (CLAUDE.md §12 — the kiln metaphor):
//   FIRED   — habit completed
//   BANKED  — habit intentionally skipped
//   PENDING — not yet due / in progress
//   COOLED  — passed scheduled time, no log
//
// `todayDateLocal()` and `todayDayKey()` use the device's local timezone
// (Intl.DateTimeFormat().resolvedOptions().timeZone). When we add per-user
// timezone preference (Phase 4+, profiles.timezone), swap to those.
// =============================================================================

export type HabitDimension =
  | "habit"
  | "deep_work"
  | "focus_discipline"
  | "energy"
  | "mood"
  | "diet"
  | "sleep"
  | "body"
  | "mind";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** Shape of habits.schedule_jsonb (written by generate_routine Edge Function). */
export type HabitSchedule = {
  scheduled_time: string;   // "HH:MM"
  duration_min: number;
  days: DayKey[];
  rationale: string;
};

/** Status vocabulary per CLAUDE.md §12. UI never says "completed" / "skipped". */
export type HabitStatus = "PENDING" | "FIRED" | "BANKED" | "COOLED";

/** What useTodayHabits returns per element. */
export type TodayHabit = {
  habit_id: string;
  name: string;
  dimension: HabitDimension;
  scheduled_time: string;
  duration_min: number;
  status: HabitStatus;
  target_value?: number | null;
  note?: string | null;
};

/** Input to useLogHabit's mutate(). Only FIRED or BANKED can be set by the user. */
export type LogHabitInput = {
  habit_id: string;
  status: "FIRED" | "BANKED";
  note?: string;
  value?: number;
};

/** Input to useLogEnergy's mutate(). */
export type LogEnergyInput = {
  value: 1 | 2 | 3 | 4 | 5;
};

// ---------------------------------------------------------------------------
// Date helpers — device-local
// ---------------------------------------------------------------------------

/** YYYY-MM-DD in the device's local timezone. */
export function todayDateLocal(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** 'mon' .. 'sun' for today in device's local timezone. */
export function todayDayKey(date: Date = new Date()): DayKey {
  return DAY_KEYS[date.getDay()];
}

/** Current local time as "HH:MM" — used to decide PENDING vs COOLED. */
export function nowHHMMLocal(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
