-- =============================================================
-- SPELBOK — Migrering: API-Sports-cache (fixtures, lag, synk)
-- Kör i Supabase SQL Editor EFTER supabase-schema.sql
-- och db/admin-migration.sql.
--
-- Utökar den befintliga fixtures-tabellen (PK = fixture_id,
-- mål = home_score/away_score) i stället för att byta namn.
-- Skrivning sker bara via service role (Edge Functions).
-- =============================================================

-- -------------------------------------------------------------
-- 1. FIXTURES — säsong + råpayload från API:et
-- -------------------------------------------------------------
alter table public.fixtures
  add column if not exists season int,
  add column if not exists raw jsonb;

create index if not exists fixtures_league_season_idx
  on public.fixtures (league_id, season);
create index if not exists fixtures_league_kickoff_idx
  on public.fixtures (league_id, kickoff);
create index if not exists fixtures_settle_idx
  on public.fixtures (kickoff)
  where status not in ('FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO');

-- Inloggade läser, service role skriver (bypassar RLS).
drop policy if exists "fixtures läsbara" on public.fixtures;
drop policy if exists "fixtures läsbara inloggade" on public.fixtures;
create policy "fixtures läsbara inloggade" on public.fixtures
  for select using (auth.uid() is not null);

-- -------------------------------------------------------------
-- 2. TEAMS — lag + logotyper, sport-agnostiskt
--    Composite PK så hockey-id:n inte krockar med fotboll.
-- -------------------------------------------------------------
create table if not exists public.teams (
  id          int not null,
  sport       text not null default 'football',
  name        text not null,
  logo_url    text,
  updated_at  timestamptz not null default now(),
  primary key (id, sport)
);

create table if not exists public.team_leagues (
  team_id    int not null,
  sport      text not null default 'football',
  league_id  int not null,
  season     int not null,
  primary key (team_id, sport, league_id, season)
);

create index if not exists team_leagues_league_idx
  on public.team_leagues (league_id, season, sport);

alter table public.teams enable row level security;
alter table public.team_leagues enable row level security;

drop policy if exists "teams läsbara inloggade" on public.teams;
create policy "teams läsbara inloggade" on public.teams
  for select using (auth.uid() is not null);

drop policy if exists "team_leagues läsbara inloggade" on public.team_leagues;
create policy "team_leagues läsbara inloggade" on public.team_leagues
  for select using (auth.uid() is not null);

-- -------------------------------------------------------------
-- 3. AKTIVA LIGOR — vilka serier synkjobben ska hämta
-- -------------------------------------------------------------
create table if not exists public.active_leagues (
  sport      text not null default 'football',
  league_id  int not null,
  season     int not null,
  name       text not null,
  country    text,
  logo_url   text,
  active     boolean not null default true,
  verified   boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (sport, league_id, season)
);

alter table public.active_leagues enable row level security;

drop policy if exists "active_leagues läsbara inloggade" on public.active_leagues;
create policy "active_leagues läsbara inloggade" on public.active_leagues
  for select using (auth.uid() is not null);

-- Allsvenskan = API-Football v3 league-id 113 (Sverige).
-- Bekräftas av sync-fixtures via GET /leagues?id=113 första körningen
-- (sätter verified = true). Ändra season vid ny säsong.
insert into public.active_leagues (sport, league_id, season, name, country, active)
values ('football', 113, 2026, 'Allsvenskan', 'Sweden', true)
on conflict (sport, league_id, season) do nothing;

-- -------------------------------------------------------------
-- 4. SYNC_LOG — requests, fel och utfall per jobb
-- -------------------------------------------------------------
create table if not exists public.sync_log (
  id           uuid primary key default gen_random_uuid(),
  job          text not null,           -- 'sync-fixtures' | 'settle-results'
  sport        text not null default 'football',
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  ok           boolean not null default false,
  requests     int not null default 0,
  upserted     int not null default 0,
  settled      int not null default 0,
  error        text,
  meta         jsonb not null default '{}'::jsonb
);

create index if not exists sync_log_started_idx
  on public.sync_log (started_at desc);

alter table public.sync_log enable row level security;

drop policy if exists "sync_log admin" on public.sync_log;
create policy "sync_log admin" on public.sync_log
  for select using (public.is_admin());

-- -------------------------------------------------------------
-- 5. SÄTTLINGSKÖ — ett olöst ärende per spel
-- -------------------------------------------------------------
create unique index if not exists settle_queue_open_bet_idx
  on public.settle_queue (bet_id)
  where resolved = false;

-- =============================================================
-- KLART. Nästa steg:
-- 1. supabase secrets set APISPORTS_KEY=... APISPORTS_FOOTBALL_URL=https://v3.football.api-sports.io
-- 2. supabase functions deploy sync-fixtures
-- 3. supabase functions deploy settle-results
-- 4. Kör det avkommenterade blocket i db/cron.sql
-- =============================================================
