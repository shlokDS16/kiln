// =============================================================================
// KILN — generate_routine Edge Function (Phase 2.9, the Orchestrator)
//
// POST handler. Body shape:
//   {
//     personality_scores: { openness, conscientiousness, extraversion,
//                           agreeableness, neuroticism }   // each 0-100
//     goals: string
//     non_negotiables: string
//     current_pain: string
//   }
//
// Steps:
//   1. Verify Authorization Bearer is a real USER token (anon key → 401).
//      We need user.id to write a personality_profile row for that user.
//   2. Call Gemini 2.5 Pro with the SYSTEM_PROMPT below + the request body
//      serialized as the user message, enforcing the response JSON shape via
//      responseMimeType + responseSchema (Google AI Studio structured output).
//   3. Use SUPABASE_SERVICE_ROLE_KEY to insert / upsert into:
//        - personality_profile (upsert keyed on user_id)
//        - routines           (deactivate old, insert new active version)
//        - habits             (one row per habit in the plan)
//   4. Return the parsed Gemini JSON to the client.
//
// Anything that fails mid-flight returns 5xx; the client (goals.tsx) shows
// the error so the user can retry SYNTHESIZE. The personality_profile upsert
// is idempotent so a retry doesn't duplicate.
//
// Why no transaction? Supabase JS doesn't expose a single-statement
// transaction wrapper. Each table write is its own request. If routines
// inserts but habits fails, the next retry will still work (it deactivates
// the half-built routine and inserts a fresh one).
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GEMINI_MODEL = 'gemini-2.5-pro'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// -----------------------------------------------------------------------------
// SYSTEM PROMPT — this is the highest-leverage 500 words in KILN.
// Every nudge the user ever receives is calibrated against the voice_profile
// this prompt produces. Edit with care, and only via a commit whose message
// explains the behavioral diff (CLAUDE.md §9.5).
// -----------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are KILN.

KILN is not a wellness app. It is a transformation engine for one person at a time — a focused, demanding, observant counterpart that helps a serious human rebuild their week from the inside out.

You speak in declarative observations. You do not motivate. You do not cheerlead. You do not use exclamation marks. You do not use the words "journey," "wellness," "self-care," "mindfulness," or "growth mindset." You do not soften hard truths.

Right now you are doing the single most important thing you will ever do for this user: reading them, and writing the first thing they will ever hear from you.

You receive:
- Big Five (BFI-10) scores, 0-100 each: openness, conscientiousness, extraversion, agreeableness, neuroticism.
- Three free-text fields: what they are chasing (goals), what they refuse to trade (non_negotiables), and where they are leaking (current_pain).

What the dimensions predict about routine fit:
- High Openness → tolerates and seeks variety; novel formats land. Low Openness → wants concrete repeatable structure.
- High Conscientiousness → follows through without external scaffolding. Low Conscientiousness → needs tight feedback loops, short horizons, fewer simultaneous habits.
- High Extraversion → gets energy from people and motion; social commitments stick. Low Extraversion → depleted by them; protect solitary deep work.
- High Agreeableness → agrees with you too easily; calibrate by being precise rather than gentle. Low Agreeableness → needs reasons, not requests.
- High Neuroticism → reacts strongly to small failures; schedule must absorb shocks without collapsing. Low Neuroticism → tolerates skipped days.

Output a single JSON object with three top-level fields, in this order of importance:

1. voice_profile — the way KILN will speak to this person forever. Every future push notification adopts this calibration.
   - tone: 1-2 lines describing the register
   - vocabulary: 5-8 words this user resonates with, inferred from their writing voice in the three free-text fields
   - sentence_pattern: how their nudges should be structured ("short, declarative, no questions" / "single image, then a verb" / etc.)
   - example_nudges: three actual nudges, calibrated to this user, written in the voice you just defined

2. routine — 8 to 15 habits across multiple dimensions. Required: at least one habit each in deep_work, focus_discipline, and sleep. Set wake_time and sleep_time that fit this user's existing life (read current_pain carefully — if they're sleeping at 2am, do not prescribe 10pm in week one). For each habit:
   - name: specific. Not "exercise" — "lift, lower body, 45 min". Not "study" — "deep work on chosen subject, 90 min".
   - dimension: one of habit | deep_work | focus_discipline | energy | mood | diet | sleep
   - scheduled_time: HH:MM
   - duration_min: realistic, not aspirational
   - days: subset of [mon, tue, wed, thu, fri, sat, sun]. You may rest some habits on some days; a 7-day plan does not mean 7 days of every habit.
   - rationale: one line. Why THIS habit for THIS user, given their scores and what they wrote. The user reads these rationales.

3. synthesis — three paragraphs of plain language, written in the voice_profile you just defined. Not a recap of the routine — a reading of who this person is and why this routine fits them. The user reads this before anything else. No bullet points. No headers. No "I noticed that you..." preamble. Begin with an observation.

Hard rules:
- No generic advice. Never "drink water" without a reason; never "meditate" without a specific format.
- Minimum 8 habits, maximum 15. Hit between those.
- Every habit needs a one-line rationale rooted in this user's data.
- No exclamation marks. No second-person pep-talk. No emojis.
- Match the intensity of their current_pain. If it's specific and hard, do not pad with abstractions. If it's blank or generic, do not invent suffering.

Output only the JSON. No preamble. No closing remarks.`

// -----------------------------------------------------------------------------
// Gemini structured-output schema (mirrors OrchestratorResponse in the client).
// -----------------------------------------------------------------------------
const RESPONSE_SCHEMA = {
  type: 'object',
  required: ['voice_profile', 'routine', 'synthesis'],
  properties: {
    voice_profile: {
      type: 'object',
      required: ['tone', 'vocabulary', 'sentence_pattern', 'example_nudges'],
      properties: {
        tone:             { type: 'string' },
        vocabulary:       { type: 'array', items: { type: 'string' } },
        sentence_pattern: { type: 'string' },
        example_nudges:   { type: 'array', items: { type: 'string' } },
      },
    },
    routine: {
      type: 'object',
      required: ['wake_time', 'sleep_time', 'habits'],
      properties: {
        wake_time:  { type: 'string' },
        sleep_time: { type: 'string' },
        habits: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'dimension', 'scheduled_time', 'duration_min', 'days', 'rationale'],
            properties: {
              name:           { type: 'string' },
              dimension:      { type: 'string', enum: ['habit', 'deep_work', 'focus_discipline', 'energy', 'mood', 'diet', 'sleep'] },
              scheduled_time: { type: 'string' },
              duration_min:   { type: 'integer' },
              days:           { type: 'array', items: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] } },
              rationale:      { type: 'string' },
            },
          },
        },
      },
    },
    synthesis: { type: 'string' },
  },
}

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

  // 1. Auth: user token (not anon key)
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
    return json({ error: 'invalid token (must be a user JWT, not the anon key)' }, 401)
  }
  const userId = userData.user.id

  // 2. Parse + minimally validate body
  let body: any
  try { body = await req.json() } catch { return json({ error: 'invalid JSON body' }, 400) }

  const { personality_scores, goals, non_negotiables, current_pain } = body ?? {}
  if (
    !personality_scores ||
    typeof goals !== 'string'           || !goals.trim() ||
    typeof non_negotiables !== 'string' || !non_negotiables.trim() ||
    typeof current_pain !== 'string'    || !current_pain.trim()
  ) {
    return json({ error: 'missing required fields' }, 400)
  }
  for (const k of ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']) {
    const v = personality_scores[k]
    if (typeof v !== 'number' || v < 0 || v > 100) {
      return json({ error: `personality_scores.${k} must be a number 0-100` }, 400)
    }
  }

  // 3. Profile row (FK target) — create if missing so personality_profile insert can FK
  await sb.auth.getSession() // no-op; just ensures the user has a session
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  await admin.from('profiles').upsert({ id: userId }, { onConflict: 'id' })

  // 4. Call Gemini
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) return json({ error: 'GEMINI_API_KEY not set' }, 500)

  const userPrompt = JSON.stringify({
    personality_scores,
    goals,
    non_negotiables,
    current_pain,
  }, null, 2)

  const geminiBody = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.7,
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
  const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return json({ error: 'gemini returned no candidate text', raw: geminiJson }, 502)

  let parsed: any
  try { parsed = JSON.parse(text) } catch {
    return json({ error: 'could not parse gemini json output', raw: text }, 502)
  }

  // 5. Write personality_profile (upsert keyed on user_id PK)
  const { error: ppErr } = await admin.from('personality_profile').upsert({
    user_id:           userId,
    openness:          Math.round(personality_scores.openness),
    conscientiousness: Math.round(personality_scores.conscientiousness),
    extraversion:      Math.round(personality_scores.extraversion),
    agreeableness:     Math.round(personality_scores.agreeableness),
    neuroticism:       Math.round(personality_scores.neuroticism),
    goals,
    non_negotiables,
    current_pain,
    voice_profile:     parsed.voice_profile,
  })
  if (ppErr) return json({ error: 'personality_profile upsert failed', details: ppErr.message }, 500)

  // 6. Routines — deactivate prior actives, insert new version
  await admin.from('routines').update({ is_active: false }).eq('user_id', userId).eq('is_active', true)
  const { data: prevRoutines } = await admin
    .from('routines')
    .select('version')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
  const nextVersion = ((prevRoutines?.[0]?.version as number | undefined) ?? 0) + 1

  const { error: rErr } = await admin.from('routines').insert({
    user_id:      userId,
    version:      nextVersion,
    plan_jsonb:   parsed.routine,
    is_active:    true,
    generated_by: `orchestrator_v1_${GEMINI_MODEL}`,
  })
  if (rErr) return json({ error: 'routines insert failed', details: rErr.message }, 500)

  // 7. Habits — one row per habit in the plan
  const habitsToInsert = (parsed.routine.habits ?? []).map((h: any) => ({
    user_id:        userId,
    name:           h.name,
    dimension:      h.dimension,
    schedule_jsonb: {
      scheduled_time: h.scheduled_time,
      duration_min:   h.duration_min,
      days:           h.days,
      rationale:      h.rationale,
    },
    is_active: true,
  }))
  if (habitsToInsert.length > 0) {
    const { error: hErr } = await admin.from('habits').insert(habitsToInsert)
    if (hErr) return json({ error: 'habits insert failed', details: hErr.message }, 500)
  }

  // 8. Done — return the Gemini structured response verbatim
  return json(parsed, 200)
})
