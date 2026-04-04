-- Optional: persist onboarding body/training prefs in cloud (run in Supabase SQL editor on STAGING first).
-- Prerequisites: SUPABASE_PHASE1_FOUNDATION.sql already applied; RLS already enabled on public.profiles.

alter table public.profiles
  add column if not exists onboarding_profile jsonb;

comment on column public.profiles.onboarding_profile is
  'Optional JSON snapshot of onboarding fields (age, height_cm, weight_kg, training_days_per_week, etc.). App must write only for auth.uid() = id.';

-- No new RLS policies required if existing "Users can update own profile" allows updating all columns
-- the user owns. Re-verify in Dashboard -> Authentication -> Policies for public.profiles.
