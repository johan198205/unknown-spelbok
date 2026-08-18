-- =============================================================
-- SPELBOK — Push vid rättning och mål
-- Kör i Supabase SQL Editor.
-- =============================================================

alter table public.profiles
  add column if not exists notify_settle boolean not null default true;

comment on column public.profiles.notify_settle is
  'Push när ett spel rättas automatiskt (kräver aktiv push-prenumeration).';

alter table public.bets
  add column if not exists notify_goals boolean not null default false;

comment on column public.bets.notify_goals is
  'Push vid mål i den här matchen.';

notify pgrst, 'reload schema';
