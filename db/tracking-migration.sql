-- =============================================================
-- SPELBOK — Migrering 004: bannerspårning och GTM
-- Kör i Supabase SQL Editor EFTER db/admin-migration.sql och
-- db/site-settings-policy.sql.
--
-- 1. banner_events får kontext (var visningen skedde, vem som
--    var inloggad) så adminstatistiken kan filtreras per period.
-- 2. app_settings-nyckeln 'tracking' blir läsbar för alla, så
--    rot-layouten kan hämta GTM-id:t utan service role.
-- =============================================================

-- -------------------------------------------------------------
-- 1. BANNERHÄNDELSER — kontext per händelse
--    Kolumnnamnen 'event' och 'occurred_at' behålls: vyn
--    banner_stats och befintliga rader bygger på dem.
-- -------------------------------------------------------------
alter table public.banner_events
  add column if not exists path    text,
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

-- Statistiksidan hämtar alla händelser i ett tidsspann och
-- aggregerar i appen — indexet nedan gör det spannet billigt.
create index if not exists banner_events_time_idx
  on public.banner_events(occurred_at);

-- Fanns redan i admin-migreringen, upprepas för nya databaser.
create index if not exists banner_events_idx
  on public.banner_events(banner_id, event, occurred_at);

-- Insert är redan öppen för alla (rader skrivs från publika sidor)
-- och select är redan admin-only. Ingen policy behöver ändras.

-- -------------------------------------------------------------
-- 2. SPÅRNINGSINSTÄLLNINGAR — GTM-container-id
--    Ligger i app_settings under nyckeln 'tracking'. Värdet är
--    inte hemligt (det exponeras i klienten ändå), men skrivning
--    är fortsatt admin-only via "inställningar admin".
-- -------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('tracking', '{"gtm_container_id":""}')
on conflict do nothing;

drop policy if exists "spårningsinställningar läsbara" on public.app_settings;
create policy "spårningsinställningar läsbara" on public.app_settings
  for select using (key = 'tracking');

-- Kontroll: kör som anon-roll och se att bara 'site' och 'tracking' kommer ut.
--   set local role anon;
--   select key from public.app_settings;
--   reset role;
