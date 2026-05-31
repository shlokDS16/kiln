// =============================================================================
// KILN — health_check Edge Function (Phase 1.9)
//
// Purpose:
//   End-to-end smoke test of the Edge Function pipeline. Returns a small JSON
//   payload that proves: (a) deploy worked, (b) the platform's JWT gate works,
//   (c) the function can decode the caller's JWT into a user id when present.
//
// Auth boundary (important to understand the test plan in Phase 1.10):
//   Supabase Edge Functions enforce `verify_jwt = true` by default. When NO
//   Authorization Bearer token is sent, the platform returns 401 BEFORE this
//   code is ever invoked. So inside this handler we always have *some* valid
//   JWT: either the project's anon key (role=anon, no user) OR a real user
//   access token issued by Supabase Auth (role=authenticated, has user.id).
//
// We use supabase.auth.getUser(token) to validate and extract the user id.
// Anon-key callers get authenticated_user_id = null; signed-in users get
// their UUID. This is the contract the runbook's Phase 1.10 verifies.
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let authenticated_user_id: string | null = null

  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )
    // getUser silently returns no user when the token is the anon key
    // (it's a valid JWT, just not a user session).
    const { data, error } = await supabase.auth.getUser(token)
    if (!error) {
      authenticated_user_id = data.user?.id ?? null
    }
  }

  const body = {
    status: 'ok',
    project: 'kiln',
    timestamp: new Date().toISOString(),
    authenticated_user_id,
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
})
