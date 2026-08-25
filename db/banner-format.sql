-- =============================================================
-- SPELBOK — Format på banners
--
-- Annonsytorna har tre olika mått: 970×90 (desktop topp), 320×100
-- (mobil topp) och 300×250 (rektangel i sidokolumnen på startsidan).
-- Placeringen räckte inte som enda dimension: samma placering
-- renderas i flera mått, och en 970×90-kreativ i en 300×250-ruta
-- beskärs av object-cover till en remsa utan CTA.
--
-- Befintliga rader defaultar till 970x90 — det var det formatet
-- annonsytorna byggdes för från början.
-- =============================================================

alter table public.banners
  add column if not exists format text not null default '970x90';

alter table public.banners
  drop constraint if exists banners_format_check;

alter table public.banners
  add constraint banners_format_check
  check (format in ('970x90', '320x100', '300x250'));

-- Uppslaget sker alltid på placering + format + aktiv.
create index if not exists banners_placement_format_idx
  on public.banners (placement, format)
  where active;
