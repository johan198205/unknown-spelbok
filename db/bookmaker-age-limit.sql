-- =============================================================
-- SPELBOK — Åldersgräns per spelbolag
--
-- Ansvarsraden börjar med "18+". Vissa bolag kräver 21+, så gränsen
-- sparas per bolag och redigeras i /admin/spelbolag. Befintliga rader
-- får 18.
-- =============================================================

alter table public.bookmakers
  add column if not exists age_limit smallint not null default 18;

alter table public.bookmakers drop constraint if exists bookmakers_age_limit_check;
alter table public.bookmakers
  add constraint bookmakers_age_limit_check check (age_limit between 18 and 25);
