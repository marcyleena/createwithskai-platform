-- AI Influencer Launchpad — shared Supabase schema
-- Applies to project https://gsfejyokuxccpjghlfzb.supabase.co
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS throughout.

-- =========================================================================
-- Helper: keep `updated_at` current on every UPDATE
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- users — mirrors auth.users, one row per account, holds app-level profile
-- =========================================================================
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  onboarding_completed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Re-run-safe for tables created before this column existed.
alter table public.users add column if not exists onboarding_completed boolean default false;

drop trigger if exists set_updated_at on public.users;
create trigger set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Auto-create a public.users row whenever someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- user_credentials — per-user third-party API keys / OAuth tokens
-- =========================================================================
create table if not exists public.user_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null,
  credential_type text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_credentials_user_id_idx on public.user_credentials (user_id);

-- One row per (user, provider, credential type) — lets the dashboard upsert API keys.
create unique index if not exists user_credentials_user_provider_type_idx
  on public.user_credentials (user_id, provider, credential_type);

drop trigger if exists set_updated_at on public.user_credentials;
create trigger set_updated_at
  before update on public.user_credentials
  for each row execute function public.set_updated_at();

-- =========================================================================
-- brand_profiles — the brand identity built in Coach, shared across tools
-- =========================================================================
create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  brand_name text not null,
  niche text,
  tone text,
  bio text,
  target_audience text,
  colors jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brand_profiles_user_id_idx on public.brand_profiles (user_id);

drop trigger if exists set_updated_at on public.brand_profiles;
create trigger set_updated_at
  before update on public.brand_profiles
  for each row execute function public.set_updated_at();

-- =========================================================================
-- coach_conversations — chat history with the Coach AI
-- =========================================================================
create table if not exists public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_conversations_user_id_idx on public.coach_conversations (user_id);

drop trigger if exists set_updated_at on public.coach_conversations;
create trigger set_updated_at
  before update on public.coach_conversations
  for each row execute function public.set_updated_at();

-- =========================================================================
-- product_builds — digital products created in Builder
-- =========================================================================
create table if not exists public.product_builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'published', 'archived')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_builds_user_id_idx on public.product_builds (user_id);

drop trigger if exists set_updated_at on public.product_builds;
create trigger set_updated_at
  before update on public.product_builds
  for each row execute function public.set_updated_at();

-- =========================================================================
-- app_builds — mini apps created in Builder
-- =========================================================================
create table if not exists public.app_builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  platform text not null,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'published', 'archived')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_builds_user_id_idx on public.app_builds (user_id);

drop trigger if exists set_updated_at on public.app_builds;
create trigger set_updated_at
  before update on public.app_builds
  for each row execute function public.set_updated_at();

-- =========================================================================
-- hq_competitors — tracked competitor accounts in HQ
-- =========================================================================
create table if not exists public.hq_competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  handle text not null,
  platform text not null,
  notes text,
  metrics jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hq_competitors_user_id_idx on public.hq_competitors (user_id);

drop trigger if exists set_updated_at on public.hq_competitors;
create trigger set_updated_at
  before update on public.hq_competitors
  for each row execute function public.set_updated_at();

-- =========================================================================
-- hq_content_calendar — planned/scheduled content in HQ
-- =========================================================================
create table if not exists public.hq_content_calendar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  platform text not null,
  status text not null default 'idea' check (status in ('idea', 'scheduled', 'published', 'skipped')),
  scheduled_for timestamptz,
  content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hq_content_calendar_user_id_idx on public.hq_content_calendar (user_id);

drop trigger if exists set_updated_at on public.hq_content_calendar;
create trigger set_updated_at
  before update on public.hq_content_calendar
  for each row execute function public.set_updated_at();

-- =========================================================================
-- integration_events — audit log of cross-tool / third-party integration activity
-- =========================================================================
create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  source text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists integration_events_user_id_idx on public.integration_events (user_id);

-- =========================================================================
-- Row Level Security — every user may only read/write their own rows
-- =========================================================================
alter table public.users enable row level security;
alter table public.user_credentials enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.coach_conversations enable row level security;
alter table public.product_builds enable row level security;
alter table public.app_builds enable row level security;
alter table public.hq_competitors enable row level security;
alter table public.hq_content_calendar enable row level security;
alter table public.integration_events enable row level security;

-- users: keyed by id, not user_id
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "users_delete_own" on public.users;
create policy "users_delete_own" on public.users
  for delete using (auth.uid() = id);
-- No insert policy: rows are created by the handle_new_user() trigger (security definer).

-- Reusable pattern for every user_id-keyed table below: select/insert/update/delete
-- all require auth.uid() = user_id.

drop policy if exists "user_credentials_all_own" on public.user_credentials;
create policy "user_credentials_all_own" on public.user_credentials
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "brand_profiles_all_own" on public.brand_profiles;
create policy "brand_profiles_all_own" on public.brand_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "coach_conversations_all_own" on public.coach_conversations;
create policy "coach_conversations_all_own" on public.coach_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "product_builds_all_own" on public.product_builds;
create policy "product_builds_all_own" on public.product_builds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "app_builds_all_own" on public.app_builds;
create policy "app_builds_all_own" on public.app_builds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "hq_competitors_all_own" on public.hq_competitors;
create policy "hq_competitors_all_own" on public.hq_competitors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "hq_content_calendar_all_own" on public.hq_content_calendar;
create policy "hq_content_calendar_all_own" on public.hq_content_calendar
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "integration_events_all_own" on public.integration_events;
create policy "integration_events_all_own" on public.integration_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
