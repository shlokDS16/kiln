// =============================================================================
// HealthKit -> KILN domain mapping. Pure, unit-tested logic (mapping.test.ts).
// =============================================================================

import type { HabitDimension } from "../hooks/types";

export type SleepQuality = "restored" | "partial" | "depleted";

export type HealthSnapshot = {
  vesselHealth: number; // 0-100 from HRV
  sleepHours: number;
  sleepQuality: SleepQuality;
  stepsToday: number;
  workoutsToday: { type: string; duration_min: number; calories: number }[];
  mindfulMinutesToday: number;
  activeCaloriesToday: number;
  lastSyncedAt: Date;
};

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

/** 0 if no HRV; else scale typical adult RMSSD 20-100ms -> 0-100. */
export function computeVesselHealth(hrvMs: number | null): number {
  if (hrvMs === null || !Number.isFinite(hrvMs) || hrvMs <= 0) return 0;
  return Math.round(clamp(((hrvMs - 20) / 80) * 100, 0, 100));
}

export function classifySleep(hours: number, interruptions: number): SleepQuality {
  if (hours >= 7 && interruptions <= 1) return "restored";
  if (hours >= 5) return "partial";
  return "depleted";
}

/** TEMP: 750 + completion*100 + vessel*0.5 + clamp(steps/10000)*30, clamp 750-1100. */
export function computeKilnTemp(snapshot: HealthSnapshot, completionRate: number): number {
  const raw =
    750 +
    completionRate * 100 +
    snapshot.vesselHealth * 0.5 +
    clamp(snapshot.stepsToday / 10000, 0, 1) * 30;
  return Math.round(clamp(raw, 750, 1100));
}

export type AutoFireHabit = { dimension: HabitDimension; target_value?: number | null };

/** Should HealthKit data auto-FIRE this habit? */
export function shouldAutoFire(habit: AutoFireHabit, snapshot: HealthSnapshot): boolean {
  switch (habit.dimension) {
    case "sleep":
      return snapshot.sleepHours >= (habit.target_value ?? 7);
    case "body":
      return snapshot.workoutsToday.some((w) => w.duration_min >= 20);
    case "mind":
      return snapshot.mindfulMinutesToday >= 10;
    default:
      return false;
  }
}

/** Safe zeros for non-iOS platforms / pre-permission. */
export function emptySnapshot(): HealthSnapshot {
  return {
    vesselHealth: 0,
    sleepHours: 0,
    sleepQuality: "depleted",
    stepsToday: 0,
    workoutsToday: [],
    mindfulMinutesToday: 0,
    activeCaloriesToday: 0,
    lastSyncedAt: new Date(0),
  };
}
