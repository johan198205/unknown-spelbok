-- =============================================================
-- SPELBOK — Alla notiser aktiva som default för nya konton
--
-- Notiser styrs under Inställningar (profil), inte via mejlboxen på
-- /kuponger. Nya rader i notification_settings ska ha allt på —
-- användaren stänger av det hen inte vill ha.
--
-- Kör i Supabase SQL Editor. Idempotent. Påverkar inte befintliga rader,
-- bara kolumndefaults för nya konton.
-- =============================================================

alter table public.notification_settings
  alter column competition_email set default true,
  alter column popup_email set default true,
  alter column planket_email set default true;

-- Säkerställ att kolumnerna finns (äldre miljöer som saknar popup/planket).
alter table public.notification_settings
  add column if not exists popup_in_app boolean not null default true,
  add column if not exists popup_email  boolean not null default true,
  add column if not exists planket_in_app boolean not null default true,
  add column if not exists planket_email  boolean not null default true;

-- Om kolumnerna redan fanns med default false: sätt default om igen.
alter table public.notification_settings
  alter column popup_email set default true,
  alter column planket_email set default true;

notify pgrst, 'reload schema';
