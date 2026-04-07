create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  given_name text,
  family_name text,
  launch_market text not null default 'SG',
  home_country_code text not null default 'SG',
  timezone text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_launch_market_check check (char_length(launch_market) between 2 and 8),
  constraint profiles_home_country_code_check check (char_length(home_country_code) between 2 and 8)
);

create table if not exists public.user_consents (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  privacy_policy_version text not null,
  terms_version text not null,
  accepted_privacy_policy_at timestamptz not null default timezone('utc', now()),
  accepted_terms_at timestamptz not null default timezone('utc', now()),
  accepted_health_sync_at timestamptz,
  accepted_usage_analytics_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.device_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  connection_status text not null default 'pending',
  provider_user_id text,
  scopes jsonb not null default '[]'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint device_connections_provider_check
    check (provider in ('apple_health', 'apple_watch', 'garmin_connect')),
  constraint device_connections_status_check
    check (connection_status in ('pending', 'active', 'revoked', 'error'))
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'app',
  title text not null,
  note text not null default '',
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  duration_minutes integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workout_sessions_source_check
    check (source in ('app', 'apple_health', 'apple_watch', 'garmin_connect')),
  constraint workout_sessions_duration_check
    check (duration_minutes >= 0)
);

create table if not exists public.telemetry_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'app',
  heart_rate integer,
  readiness integer,
  stamina integer,
  breath_per_minute integer,
  endurance integer,
  stress_level integer,
  weather_condition text,
  weather_temperature_c numeric(5, 2),
  recorded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint telemetry_snapshots_source_check
    check (source in ('app', 'apple_health', 'apple_watch', 'garmin_connect', 'weather')),
  constraint telemetry_snapshots_heart_rate_check
    check (heart_rate is null or heart_rate between 0 and 260),
  constraint telemetry_snapshots_readiness_check
    check (readiness is null or readiness between 0 and 100),
  constraint telemetry_snapshots_stamina_check
    check (stamina is null or stamina between 0 and 100),
  constraint telemetry_snapshots_breath_check
    check (breath_per_minute is null or breath_per_minute between 0 and 80),
  constraint telemetry_snapshots_endurance_check
    check (endurance is null or endurance between 0 and 100),
  constraint telemetry_snapshots_stress_check
    check (stress_level is null or stress_level between 0 and 100)
);

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  sync_status text not null default 'started',
  request_id uuid not null default gen_random_uuid(),
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint sync_events_provider_check
    check (provider in ('supabase_auth', 'apple_health', 'apple_watch', 'garmin_connect')),
  constraint sync_events_status_check
    check (sync_status in ('started', 'success', 'error'))
);

create table if not exists public.app_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  screen text not null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    given_name,
    family_name
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'given_name',
    new.raw_user_meta_data ->> 'family_name'
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      given_name = coalesce(excluded.given_name, public.profiles.given_name),
      family_name = coalesce(excluded.family_name, public.profiles.family_name),
      updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists user_consents_set_updated_at on public.user_consents;
create trigger user_consents_set_updated_at
  before update on public.user_consents
  for each row execute procedure public.set_updated_at();

drop trigger if exists device_connections_set_updated_at on public.device_connections;
create trigger device_connections_set_updated_at
  before update on public.device_connections
  for each row execute procedure public.set_updated_at();

drop trigger if exists workout_sessions_set_updated_at on public.workout_sessions;
create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute procedure public.set_updated_at();

create index if not exists device_connections_user_provider_idx
  on public.device_connections (user_id, provider);

create index if not exists workout_sessions_user_started_at_idx
  on public.workout_sessions (user_id, started_at desc);

create index if not exists telemetry_snapshots_user_recorded_at_idx
  on public.telemetry_snapshots (user_id, recorded_at desc);

create index if not exists sync_events_user_started_at_idx
  on public.sync_events (user_id, started_at desc);

create index if not exists app_usage_events_user_created_at_idx
  on public.app_usage_events (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.user_consents enable row level security;
alter table public.device_connections enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.telemetry_snapshots enable row level security;
alter table public.sync_events enable row level security;
alter table public.app_usage_events enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

drop policy if exists "Users can manage own consents select" on public.user_consents;
create policy "Users can manage own consents select"
  on public.user_consents
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own consents insert" on public.user_consents;
create policy "Users can manage own consents insert"
  on public.user_consents
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own consents update" on public.user_consents;
create policy "Users can manage own consents update"
  on public.user_consents
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own device connections select" on public.device_connections;
create policy "Users can manage own device connections select"
  on public.device_connections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own device connections insert" on public.device_connections;
create policy "Users can manage own device connections insert"
  on public.device_connections
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own device connections update" on public.device_connections;
create policy "Users can manage own device connections update"
  on public.device_connections
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own workout sessions select" on public.workout_sessions;
create policy "Users can manage own workout sessions select"
  on public.workout_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own workout sessions insert" on public.workout_sessions;
create policy "Users can manage own workout sessions insert"
  on public.workout_sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own workout sessions update" on public.workout_sessions;
create policy "Users can manage own workout sessions update"
  on public.workout_sessions
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own telemetry snapshots select" on public.telemetry_snapshots;
create policy "Users can manage own telemetry snapshots select"
  on public.telemetry_snapshots
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own telemetry snapshots insert" on public.telemetry_snapshots;
create policy "Users can manage own telemetry snapshots insert"
  on public.telemetry_snapshots
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own telemetry snapshots update" on public.telemetry_snapshots;
create policy "Users can manage own telemetry snapshots update"
  on public.telemetry_snapshots
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own sync events select" on public.sync_events;
create policy "Users can manage own sync events select"
  on public.sync_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own sync events insert" on public.sync_events;
create policy "Users can manage own sync events insert"
  on public.sync_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own app usage events select" on public.app_usage_events;
create policy "Users can manage own app usage events select"
  on public.app_usage_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own app usage events insert" on public.app_usage_events;
create policy "Users can manage own app usage events insert"
  on public.app_usage_events
  for insert
  with check (auth.uid() = user_id);

-- Training progression column (tracks completed sessions per mode for unlock gates)
alter table public.profiles
  add column if not exists training_progression jsonb default '{}';
