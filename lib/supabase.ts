// =============================================================================
// Supabase client — singleton, used everywhere in the app.
//
// Auth is configured with our platform-aware Storage adapter (MMKV on native,
// localStorage on web). detectSessionInUrl is false: we're not doing the
// magic-link-in-URL flow; email+password only for Phase 2.
//
// Env vars come from .env.local (gitignored) via Expo's EXPO_PUBLIC_ inlining.
// =============================================================================

import { createClient } from "@supabase/supabase-js";

import { Storage } from "./storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Check .env.local at the project root.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
