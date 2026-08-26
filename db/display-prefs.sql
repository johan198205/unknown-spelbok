-- =============================================================
-- SPELBOK — Visningsläge (units/pengar) + valuta per användare
-- Kör i Supabase SQL Editor.
-- =============================================================

-- Valt visningsläge. Sparas på profilen, inte i webbläsaren, så toggeln i
-- headern gäller på alla enheter och för alla spelböcker.
alter table public.profiles
  add column if not exists display_mode text not null default 'money';

alter table public.profiles
  add column if not exists currency text not null default 'SEK';

-- Konstrainten läggs separat: add column ... check hoppas över av
-- "if not exists" om kolumnen redan finns från ett tidigare försök.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_display_mode_check'
  ) then
    alter table public.profiles
      add constraint profiles_display_mode_check
      check (display_mode in ('money', 'units'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_currency_check'
  ) then
    alter table public.profiles
      add constraint profiles_currency_check
      check (currency in ('SEK', 'NOK', 'DKK', 'EUR', 'USD', 'GBP'));
  end if;
end $$;

comment on column public.profiles.display_mode is
  'Visningsläge för belopp: money = valuta, units = antal units. Gäller alla spelböcker.';

comment on column public.profiles.currency is
  'Valutan användaren bokför i. Ren etikett — inga belopp växlas om.';

comment on column public.profiles.unit_size is
  '1 unit uttryckt i användarens valuta. En insats får vara max 10 units.';
