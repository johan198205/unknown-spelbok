-- =============================================================
-- SPELBOK — Migrering: tilläggstid (fixtures.extra)
-- Kör i Supabase SQL Editor EFTER db/live-fixtures.sql.
--
-- API-Football stannar `status.elapsed` på 45 respektive 90 när
-- tilläggstiden börjar och lägger minuterna i `status.extra`.
-- Utan den här kolumnen går "45+9" inte att skilja från "45".
-- =============================================================

alter table public.fixtures
  add column if not exists extra int;

comment on column public.fixtures.extra is
  'Tilläggstid från API-Football (fixture.status.extra). Null utanför tilläggstid; elapsed står då stilla på 45/90.';

-- =============================================================
-- KLART. Ingen omdeploy krävs för webben — koden faller tillbaka
-- på elapsed så länge kolumnen saknas. Kör om
-- `supabase functions deploy poll-live` så cronjobbet börjar
-- skriva kolumnen.
-- =============================================================
