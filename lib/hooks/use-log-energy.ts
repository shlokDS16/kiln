// =============================================================================
// useLogEnergy — one-tap energy log (1..5).
//
// No optimistic UI — the Today screen doesn't display recent energy yet, so
// there's nothing to optimistically update. A success haptic + brief check
// state on the calling component is enough feedback.
//
// On success, invalidates ['energy'] (future-proofed for an useTodayEnergy
// hook in Phase 4 that surfaces a daily ribbon).
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth-context";
import { supabase } from "../supabase";
import { type LogEnergyInput } from "./types";

export function useLogEnergy() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  return useMutation<void, Error, LogEnergyInput>({
    mutationFn: async ({ value }) => {
      if (!userId) throw new Error("not authenticated");
      const { error } = await supabase.from("mood_energy_logs").insert({
        user_id: userId,
        kind: "energy",
        value_numeric: value,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["energy"] });
    },
  });
}
