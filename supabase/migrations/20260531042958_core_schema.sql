-- =============================================================================
-- KILN core schema — Phase 1.5
--
-- 10 tables covering the dimensions in CLAUDE.md §6 (habits, deep work,
-- focus discipline, energy, mood, diet, sleep, reflections).
--
-- Invariants enforced by this migration (per CLAUDE.md §7):
--   * RLS enabled on every table.
--   * Four policies per table (SELECT/INSERT/UPDATE/DELETE), gated on
--     auth.uid() = user_id (or auth.uid() = id for `profiles`).
--   * Every FK that points at user-scoped data uses ON DELETE CASCADE so
--     deleting an auth.users row tears down everything they own.
--   * `reflections.embedding` is vector(1536) (OpenAI text-embedding-3-small).
--     Switchable later if we move embedding providers.
--
-- Anything not in the user's spec (extra CHECK constraints, indices, the
-- routines (user_id, version) UNIQUE) is value-add for query speed and
-- data integrity, not custom semantics.
-- =============================================================================


-- =============================================================================
-- 1. profiles — one row per authenticated user
-- =============================================================================
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  timezone     text NOT NULL DEFAULT 'Asia/Kolkata',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE USING (auth.uid() = id);


-- =============================================================================
-- 2. personality_profile — BFI-10 scores + onboarding context, one per user
-- =============================================================================
CREATE TABLE public.personality_profile (
  user_id            uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  openness           smallint NOT NULL CHECK (openness          BETWEEN 0 AND 100),
  conscientiousness  smallint NOT NULL CHECK (conscientiousness BETWEEN 0 AND 100),
  extraversion       smallint NOT NULL CHECK (extraversion      BETWEEN 0 AND 100),
  agreeableness      smallint NOT NULL CHECK (agreeableness     BETWEEN 0 AND 100),
  neuroticism        smallint NOT NULL CHECK (neuroticism       BETWEEN 0 AND 100),
  goals              text,
  non_negotiables    text,
  current_pain       text,
  voice_profile      jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personality_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY personality_profile_select_own ON public.personality_profile
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY personality_profile_insert_own ON public.personality_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY personality_profile_update_own ON public.personality_profile
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY personality_profile_delete_own ON public.personality_profile
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- 3. habits — tracked dimensions per CLAUDE.md §6 (soft-delete via deleted_at)
-- =============================================================================
CREATE TABLE public.habits (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           text NOT NULL,
  dimension      text NOT NULL CHECK (dimension IN
                   ('habit','deep_work','focus_discipline','energy','mood','diet','sleep')),
  schedule_jsonb jsonb,
  target_value   numeric,
  unit           text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

CREATE INDEX habits_user_id_idx
  ON public.habits (user_id) WHERE deleted_at IS NULL;
CREATE INDEX habits_user_dimension_idx
  ON public.habits (user_id, dimension) WHERE deleted_at IS NULL;

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY habits_select_own ON public.habits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY habits_insert_own ON public.habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY habits_update_own ON public.habits
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY habits_delete_own ON public.habits
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- 4. daily_logs — one row per (user, habit, day). NULL completed_at = skipped.
-- =============================================================================
CREATE TABLE public.daily_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id     uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  log_date     date NOT NULL,
  completed_at timestamptz,
  value        numeric,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_id, log_date)
);

CREATE INDEX daily_logs_user_date_idx ON public.daily_logs (user_id, log_date DESC);
CREATE INDEX daily_logs_habit_id_idx ON public.daily_logs (habit_id);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_logs_select_own ON public.daily_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY daily_logs_insert_own ON public.daily_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY daily_logs_update_own ON public.daily_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY daily_logs_delete_own ON public.daily_logs
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- 5. focus_sessions — in-app focus timer. duration_seconds set by client on end.
-- =============================================================================
CREATE TABLE public.focus_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz,
  duration_seconds integer,
  interruptions    integer NOT NULL DEFAULT 0,
  tag              text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX focus_sessions_user_started_idx
  ON public.focus_sessions (user_id, started_at DESC);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY focus_sessions_select_own ON public.focus_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY focus_sessions_insert_own ON public.focus_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY focus_sessions_update_own ON public.focus_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY focus_sessions_delete_own ON public.focus_sessions
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- 6. focus_discipline_log — streak continuations and slip events. Numeric only.
-- =============================================================================
CREATE TABLE public.focus_discipline_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('streak_continued','slip_reported')),
  event_at   timestamptz NOT NULL,
  context    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX focus_discipline_log_user_event_idx
  ON public.focus_discipline_log (user_id, event_at DESC);

ALTER TABLE public.focus_discipline_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY focus_discipline_log_select_own ON public.focus_discipline_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY focus_discipline_log_insert_own ON public.focus_discipline_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY focus_discipline_log_update_own ON public.focus_discipline_log
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY focus_discipline_log_delete_own ON public.focus_discipline_log
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- 7. mood_energy_logs — energy is 1-5; mood is a single word free text
-- =============================================================================
CREATE TABLE public.mood_energy_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('energy','mood')),
  value_numeric smallint CHECK (value_numeric BETWEEN 1 AND 5),
  value_text    text,
  logged_at     timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mood_energy_logs_user_logged_idx
  ON public.mood_energy_logs (user_id, logged_at DESC);

ALTER TABLE public.mood_energy_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY mood_energy_logs_select_own ON public.mood_energy_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY mood_energy_logs_insert_own ON public.mood_energy_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mood_energy_logs_update_own ON public.mood_energy_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY mood_energy_logs_delete_own ON public.mood_energy_logs
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- 8. reflections — Reflector output (daily + weekly). Embeddings for recall.
-- =============================================================================
CREATE TABLE public.reflections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reflection_date       date NOT NULL,
  reflection_period     text NOT NULL CHECK (reflection_period IN ('daily','weekly')),
  content               text NOT NULL,
  embedding             vector(1536),
  targets_for_tomorrow  jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reflections_user_date_idx
  ON public.reflections (user_id, reflection_date DESC);
CREATE INDEX reflections_user_period_idx
  ON public.reflections (user_id, reflection_period);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY reflections_select_own ON public.reflections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY reflections_insert_own ON public.reflections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY reflections_update_own ON public.reflections
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY reflections_delete_own ON public.reflections
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- 9. nudge_history — Nudge Agent send log + 30-min completion attribution
-- =============================================================================
CREATE TABLE public.nudge_history (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id                    uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  scheduled_for               timestamptz NOT NULL,
  nudge_text                  text NOT NULL,
  sent_at                     timestamptz,
  task_completed_within_30min boolean,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX nudge_history_user_scheduled_idx
  ON public.nudge_history (user_id, scheduled_for DESC);

ALTER TABLE public.nudge_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY nudge_history_select_own ON public.nudge_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY nudge_history_insert_own ON public.nudge_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY nudge_history_update_own ON public.nudge_history
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY nudge_history_delete_own ON public.nudge_history
  FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- 10. routines — Orchestrator-generated 7-day plans, versioned per user.
-- =============================================================================
CREATE TABLE public.routines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version      integer NOT NULL,
  plan_jsonb   jsonb NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  generated_by text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, version)
);

CREATE INDEX routines_user_active_idx
  ON public.routines (user_id) WHERE is_active = true;

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY routines_select_own ON public.routines
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY routines_insert_own ON public.routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY routines_update_own ON public.routines
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY routines_delete_own ON public.routines
  FOR DELETE USING (auth.uid() = user_id);
