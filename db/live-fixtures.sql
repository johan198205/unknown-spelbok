-- =============================================================
-- SPELBOK — Migrering: livescore (elapsed + Realtime)
-- Kör i Supabase SQL Editor EFTER db/apisports-migration.sql.
--
-- Lägger till spelminut på fixtures och släpper in tabellen i
-- supabase_realtime så klienten kan prenumerera utan att polla
-- API-Football.
-- =============================================================

-- -------------------------------------------------------------
-- 1. ELAPSED — spelminut från API-Football (null före avspark)
-- -------------------------------------------------------------
alter table public.fixtures
  add column if not exists elapsed int;

comment on column public.fixtures.elapsed is
  'Spelminut från API-Football (fixture.status.elapsed). Null före avspark.';

create index if not exists fixtures_live_poll_idx
  on public.fixtures (kickoff)
  where status not in ('FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO', 'PST');

-- -------------------------------------------------------------
-- 2. REALTIME — publication supabase_realtime
--    REPLICA IDENTITY DEFAULT (PK) räcker: payload.new innehåller
--    status, elapsed, home_score, away_score.
-- -------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.fixtures;
exception
  when duplicate_object then null;
end $$;

-- =============================================================
-- KLART. Nästa steg:
-- 1. supabase functions deploy poll-live
-- 2. Avkommentera poll-live-blocket i db/cron.sql
-- =============================================================
