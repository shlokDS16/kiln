// =============================================================================
// useVoiceProfileQuote — per-habit marginalia quote, cached 24h.
//
// `voiceQuoteQuery(session, habitId)` is the single source of truth for the
// query key + fetcher, so the Today screen can pre-warm the cache via
// queryClient.prefetchQuery(...) using the exact same config the hook uses.
//
// Flow on each call (cache-first):
//   1. SELECT from voice_quotes where habit_id AND expires_at > now()
//   2. If a fresh row exists -> return quote_text (cache HIT)
//   3. Else POST to generate_quote Edge Function -> upsert + return quote_text
//
// React-Query staleTime is 24h so the RAM cache doesn't refetch while the DB
// row is still fresh. Pass `undefined` habitId / null session to keep it off.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { useAuth } from "../auth-context";
import { supabase } from "../supabase";

/**
 * Shared query config — used by the hook AND by the Today-screen pre-warm
 * (queryClient.prefetchQuery) so both hit the identical key + fetcher.
 */
export function voiceQuoteQuery(session: Session | null, habitId: string | undefined) {
  const userId = session?.user?.id;
  return {
    queryKey: ["voice-quote", userId, habitId] as const,
    enabled: !!userId && !!habitId,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<string> => {
      // 1. Cache lookup
      const { data: cached, error: cacheErr } = await supabase
        .from("voice_quotes")
        .select("quote_text, expires_at")
        .eq("habit_id", habitId!)
        .maybeSingle();

      if (cacheErr) throw cacheErr;
      if (cached && new Date(cached.expires_at) > new Date()) {
        return cached.quote_text as string;
      }

      // 2. Cache miss -> Edge Function
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const url = `${supabaseUrl}/functions/v1/generate_quote`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ habit_id: habitId }),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`generate_quote ${res.status}: ${detail}`);
      }
      const data = (await res.json()) as { quote_text: string };
      return data.quote_text;
    },
  };
}

export function useVoiceProfileQuote(habitId: string | undefined) {
  const { session } = useAuth();
  return useQuery<string, Error>(voiceQuoteQuery(session, habitId));
}
