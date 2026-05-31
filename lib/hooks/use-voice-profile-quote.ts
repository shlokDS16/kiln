// =============================================================================
// useVoiceProfileQuote — per-habit marginalia quote, cached 24h.
//
// Flow on each call (cache-first):
//   1. SELECT from voice_quotes where (habit_id, user_id) AND expires_at > now()
//   2. If a row exists → return its quote_text (cache HIT)
//   3. Else POST to the generate_quote Edge Function with { habit_id }, which:
//        - reads habit + voice_profile via service-role
//        - calls Gemini Flash with the system prompt
//        - upserts into voice_quotes with 24h expiry
//        - returns { quote_text }
//   4. Return the fresh quote_text
//
// React-Query staleTime also 24h so RAM cache doesn't refetch while the DB
// row is still fresh.
//
// Pass `undefined` for habit_id to keep the hook disabled (e.g., no current
// pending habit) — useQuery's `enabled` flag handles that.
// =============================================================================

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth-context";
import { supabase } from "../supabase";

export function useVoiceProfileQuote(habitId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useQuery<string, Error>({
    queryKey: ["voice-quote", userId, habitId],
    enabled: !!userId && !!habitId,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
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

      // 2. Cache miss → Edge Function
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
  });
}
