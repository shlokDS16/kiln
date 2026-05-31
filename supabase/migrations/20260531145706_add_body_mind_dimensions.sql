-- =============================================================================
-- Add BODY + MIND dimensions for HealthKit auto-fire (workouts / mindful mins).
-- SLEEP already exists. The original dimension CHECK is an unnamed column-level
-- constraint, so find + drop it dynamically, then add a named, expanded one.
-- =============================================================================
do $$
declare cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace ns on ns.oid = rel.relnamespace
  where ns.nspname = 'public' and rel.relname = 'habits' and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%dimension%';
  if cname is not null then
    execute format('alter table public.habits drop constraint %I', cname);
  end if;
end $$;

alter table public.habits add constraint habits_dimension_check
  check (dimension in
    ('habit','deep_work','focus_discipline','energy','mood','diet','sleep','body','mind'));
