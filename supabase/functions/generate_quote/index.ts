// =============================================================================
// KILN — generate_quote Edge Function (Phase 3)
//
// POST. Body: { habit_id: string }.
//
// Flow:
//   1. Auth — require a real user JWT (anon → 401).
//   2. Read the habit (name, dimension, schedule_jsonb.scheduled_time) +
//      the user's voice_profile from personality_profile. Both via the
//      service-role client (so we don't fight RLS for the join).
//   3. Call Gemini 2.5 Flash with the (intentionally short) SYSTEM_PROMPT
//      below + a user message that supplies the voice_profile and the habit.
//      No structured-output enforcement — we just want the raw text.
//   4. Upsert into voice_quotes with onConflict (user_id, habit_id), bumping
//      expires_at to now() + 24h. The migration's UNIQUE makes this safe.
//   5. Return { quote_text }.
//
// Cost note: Flash is ~$0.0001 per call; 10 habits × daily refresh ≈ $0.001/user/day.
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// -----------------------------------------------------------------------------
// SYSTEM PROMPT — kept short on purpose. The Orchestrator's voice_profile
// (which the user message carries) is doing most of the calibration work.
// This prompt only enforces the format constraints.
// -----------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are KILN, the user's interior counterpart, speaking to them privately as a single line of marginalia under a habit they are about to do.

STRICT RULES — violate any and the response is rejected:
- MAXIMUM 12 words. Count them. Twelve is the ceiling.
- One sentence. One image. No abstractions.
- Match the user's voice_profile (tone, vocabulary, sentence_pattern) precisely. Their voice is the law.
- Do NOT name the habit. Allude to it through the action or its consequence.
- No exclamation marks. No questions. No second-person pep talk. No emojis.
- No quotation marks around the line. No preamble. No closing remark.
- This is not advice. It is observation. KILN does not encourage; KILN notices.

Output ONLY the line of marginalia. Nothing else.`

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  // 1. Auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'missing bearer token' }, 401)
  }
  const token = authHeader.slice('Bearer '.length).trim()

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  )
  const { data: userData, error: userErr } = await sb.auth.getUser(token)
  if (userErr || !userData.user) {
    return json({ error: 'invalid user token' }, 401)
  }
  const userId = userData.user.id

  // 2. Body
  let body: any
  try { body = await req.json() } catch { return json({ error: 'invalid JSON body' }, 400) }
  const habitId = body?.habit_id
  if (typeof habitId !== 'string' || !habitId) {
    return json({ error: 'habit_id required' }, 400)
  }

  // 3. Service-role client for joined reads + the upsert
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const [habitRes, ppRes] = await Promise.all([
    admin
      .from('habits')
      .select('id, name, dimension, schedule_jsonb')
      .eq('id', habitId)
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('personality_profile')
      .select('voice_profile')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (habitRes.error) return json({ error: 'habit read failed', details: habitRes.error.message }, 500)
  if (!habitRes.data) return json({ error: 'habit not found or not yours' }, 404)
  if (ppRes.error) return json({ error: 'personality_profile read failed', details: ppRes.error.message }, 500)
  if (!ppRes.data?.voice_profile) {
    return json({ error: 'no voice_profile yet — finish onboarding first' }, 409)
  }

  const habit = habitRes.data
  const voiceProfile = ppRes.data.voice_profile

  // 4. Gemini call
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) return json({ error: 'GEMINI_API_KEY not set' }, 500)

  const userPrompt = JSON.stringify({
    voice_profile: voiceProfile,
    upcoming_habit: {
      name: habit.name,
      dimension: habit.dimension,
      scheduled_time: (habit.schedule_jsonb as any)?.scheduled_time ?? null,
    },
  }, null, 2)

  const geminiBody = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 80,
    },
  }

  const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  })
  if (!geminiRes.ok) {
    const errText = await geminiRes.text()
    return json({ error: 'gemini upstream error', status: geminiRes.status, details: errText }, 502)
  }
  const geminiJson = await geminiRes.json()
  let quoteText: string | undefined = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!quoteText) return json({ error: 'gemini returned no text', raw: geminiJson }, 502)

  // Clean: strip surrounding quotes/whitespace, collapse internal whitespace.
  quoteText = quoteText.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, ' ').trim()

  // 5. Upsert (24h re-expiry on every refresh)
  const { error: upErr } = await admin
    .from('voice_quotes')
    .upsert({
      user_id:      userId,
      habit_id:     habitId,
      quote_text:   quoteText,
      generated_at: new Date().toISOString(),
      expires_at:   new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'user_id,habit_id' })
  if (upErr) return json({ error: 'voice_quotes upsert failed', details: upErr.message }, 500)

  return json({ quote_text: quoteText })
})
