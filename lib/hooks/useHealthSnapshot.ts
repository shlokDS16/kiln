// =============================================================================
// useHealthSnapshot — last-24h HealthKit snapshot via React Query.
// Non-iOS returns safe zeros (no crash). Refreshes every 15min when active.
// HealthKit query fidelity is verified on-device at Phase 4B.
// =============================================================================

import { useEffect } from "react";
import { AppState } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppleHealthKit from "react-native-health";

import { HEALTHKIT_ENABLED } from "../constants";
import {
  classifySleep,
  computeVesselHealth,
  emptySnapshot,
  type HealthSnapshot,
} from "../health/mapping";

// Loose typed facade over the callback API (avoids `any`; device-verified at 4B).
type Sample = { value: number; startDate: string; endDate: string };
type SleepSample = { value: string; startDate: string; endDate: string };
type WorkoutSample = { activityName?: string; duration?: number; calories?: number };
type HKFacade = {
  initHealthKit(perms: unknown, cb: (err: string | null) => void): void;
  getHeartRateVariabilitySamples(o: unknown, cb: (e: string | null, r: Sample[]) => void): void;
  getSleepSamples(o: unknown, cb: (e: string | null, r: SleepSample[]) => void): void;
  getStepCount(o: unknown, cb: (e: string | null, r: { value: number }) => void): void;
  getActiveEnergyBurned(o: unknown, cb: (e: string | null, r: Sample[]) => void): void;
  getMindfulSession(o: unknown, cb: (e: string | null, r: SleepSample[]) => void): void;
  getAnchoredWorkouts(o: unknown, cb: (e: string | null, r: { data: WorkoutSample[] }) => void): void;
  Constants: { Permissions: Record<string, string> };
};
const HK = AppleHealthKit as unknown as HKFacade;

const HEALTH_KEY = ["health-snapshot"] as const;

function perms() {
  const P = HK.Constants.Permissions;
  return {
    permissions: {
      read: [
        P.HeartRateVariability,
        P.SleepAnalysis,
        P.StepCount,
        P.Workout,
        P.MindfulSession,
        P.ActiveEnergyBurned,
      ],
      write: [],
    },
  };
}

function p<T>(fn: (cb: (e: string | null, r: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) =>
    fn((e, r) => (e ? reject(new Error(e)) : resolve(r))),
  );
}

async function fetchSnapshot(): Promise<HealthSnapshot> {
  if (!HEALTHKIT_ENABLED) {
    console.info("HealthKit unavailable on this platform — using zeroed snapshot.");
    return emptySnapshot();
  }
  await p<string | null>((cb) => HK.initHealthKit(perms(), (e) => cb(e, null)));

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const opt = { startDate: since };

  const [hrv, sleep, steps, energy, mindful, workouts] = await Promise.all([
    p<Sample[]>((cb) => HK.getHeartRateVariabilitySamples(opt, cb)).catch(() => [] as Sample[]),
    p<SleepSample[]>((cb) => HK.getSleepSamples(opt, cb)).catch(() => [] as SleepSample[]),
    p<{ value: number }>((cb) => HK.getStepCount(opt, cb)).catch(() => ({ value: 0 })),
    p<Sample[]>((cb) => HK.getActiveEnergyBurned(opt, cb)).catch(() => [] as Sample[]),
    p<SleepSample[]>((cb) => HK.getMindfulSession(opt, cb)).catch(() => [] as SleepSample[]),
    p<{ data: WorkoutSample[] }>((cb) => HK.getAnchoredWorkouts(opt, cb)).catch(() => ({ data: [] })),
  ]);

  const hrvMs = hrv.length ? hrv[hrv.length - 1].value : null;
  const asleep = sleep.filter((s) => s.value === "ASLEEP" || s.value === "CORE" || s.value === "DEEP" || s.value === "REM");
  const sleepHours =
    asleep.reduce((sum, s) => sum + (Date.parse(s.endDate) - Date.parse(s.startDate)), 0) / 3_600_000;
  const mindfulMinutes =
    mindful.reduce((sum, s) => sum + (Date.parse(s.endDate) - Date.parse(s.startDate)), 0) / 60_000;
  const activeCalories = energy.reduce((sum, s) => sum + s.value, 0);

  return {
    vesselHealth: computeVesselHealth(hrvMs),
    sleepHours,
    sleepQuality: classifySleep(sleepHours, Math.max(0, asleep.length - 1)),
    stepsToday: steps.value ?? 0,
    workoutsToday: (workouts.data ?? []).map((w) => ({
      type: w.activityName ?? "workout",
      duration_min: (w.duration ?? 0) / 60,
      calories: w.calories ?? 0,
    })),
    mindfulMinutesToday: mindfulMinutes,
    activeCaloriesToday: activeCalories,
    lastSyncedAt: new Date(),
  };
}

export function useHealthSnapshot() {
  const queryClient = useQueryClient();

  // Refresh every 15min while the app is active.
  useEffect(() => {
    if (!HEALTHKIT_ENABLED) return;
    const id = setInterval(() => {
      if (AppState.currentState === "active") {
        queryClient.invalidateQueries({ queryKey: HEALTH_KEY });
      }
    }, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [queryClient]);

  return useQuery<HealthSnapshot, Error>({
    queryKey: HEALTH_KEY,
    queryFn: fetchSnapshot,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
