// =============================================================================
// useHealthAutoComplete — when the app foregrounds, auto-FIRE pending habits
// that HealthKit confirms (sleep/body/mind). Returns names fired this pass
// (for the Today toast). Idempotent: only acts on PENDING habits.
// =============================================================================

import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { HEALTHKIT_ENABLED } from "../constants";
import { shouldAutoFire } from "../health/mapping";
import { useHealthSnapshot } from "./useHealthSnapshot";
import { useLogHabit } from "./use-log-habit";
import type { TodayHabit } from "./types";

export function useHealthAutoComplete(habits: TodayHabit[]): string[] {
  const snapshotQ = useHealthSnapshot();
  const logHabit = useLogHabit();
  const [fired, setFired] = useState<string[]>([]);

  useEffect(() => {
    if (!HEALTHKIT_ENABLED) return;

    const run = () => {
      const snapshot = snapshotQ.data;
      if (!snapshot) return;
      const toFire = habits.filter(
        (h) =>
          h.status === "PENDING" &&
          shouldAutoFire({ dimension: h.dimension, target_value: h.target_value }, snapshot),
      );
      if (toFire.length === 0) return;
      for (const h of toFire) {
        logHabit.mutate({ habit_id: h.habit_id, status: "FIRED", note: "auto:healthkit" });
      }
      setFired(toFire.map((h) => h.name));
    };

    run(); // once on mount / when deps change
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "active") run();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotQ.data, habits]);

  return fired;
}
