-- =============================================================
-- SPELBOK — Migrering 003: publik läsning av sajtinställningar
-- Kör i Supabase SQL Editor EFTER db/admin-migration.sql.
--
-- Underhållsläget och den öppna registreringen ligger i
-- app_settings under nyckeln 'site'. Middleware och
-- /registrera måste kunna läsa den nyckeln som utloggad
-- besökare — resten av app_settings förblir admin-only.
--
-- Utan den här policyn faller appen tillbaka på service
-- role-nyckeln (fungerar, men en extra rundtur) och i sista
-- hand på standardvärdena: registrering öppen, inget underhåll.
-- =============================================================

create policy "sajtinställningar läsbara" on public.app_settings
  for select using (key = 'site');

-- Kontroll: kör som anon-roll och se att bara 'site' kommer ut.
--   set local role anon;
--   select key from public.app_settings;
--   reset role;
