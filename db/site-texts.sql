-- =============================================================
-- SPELBOK — Redigerbara texter (admin → Texter)
-- Kör i Supabase SQL Editor EFTER db/admin-migration.sql.
--
-- Alla texter i gränssnittet har standardvärden i koden
-- (src/lib/texts/areas). Admin sparar överskrivningar som ett
-- JSON-objekt nyckel → text i app_settings under nyckeln
-- 'texts'. Texterna visas för utloggade besökare, så nyckeln
-- måste vara läsbar för alla. Skrivning är fortsatt admin-only
-- via "inställningar admin".
--
-- Utan policyn läser appen nyckeln med service role i stället.
-- =============================================================

insert into public.app_settings (key, value) values
  ('texts', '{}')
on conflict do nothing;

drop policy if exists "sajttexter läsbara" on public.app_settings;
create policy "sajttexter läsbara" on public.app_settings
  for select using (key = 'texts');
