// =============================================================================
// QueryClient — singleton, imported wherever a hook calls useQueryClient().
//
// Defaults rationale (KILN context):
//   * staleTime  5 min — habit data doesn't change second-to-second; tolerate
//     5 min of stale UI before refetch
//   * gcTime    10 min — keep recent caches alive across tab switches
//   * retry     1      — one bounce on transient network errors
//   * refetchOnWindowFocus FALSE — mobile users blur/focus constantly; refetch
//     would burn battery and Supabase quota with no UX win
//   * mutations retry 0 — writes should fail loudly so the user knows
// =============================================================================

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
