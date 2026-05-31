-- =============================================================================
-- updated_at triggers — Phase 1.6
--
-- Generic plpgsql trigger function that stamps NEW.updated_at = now() on every
-- UPDATE, attached to every table in this schema that has an updated_at column:
--   profiles, personality_profile, habits.
--
-- This is "BEFORE UPDATE FOR EACH ROW" so the new value is in NEW before the
-- write hits disk. Cheaper than a server-side default + DDL trigger combo, and
-- means the client never has to remember to touch updated_at.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- profiles
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- personality_profile
DROP TRIGGER IF EXISTS personality_profile_set_updated_at ON public.personality_profile;
CREATE TRIGGER personality_profile_set_updated_at
  BEFORE UPDATE ON public.personality_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- habits
DROP TRIGGER IF EXISTS habits_set_updated_at ON public.habits;
CREATE TRIGGER habits_set_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
