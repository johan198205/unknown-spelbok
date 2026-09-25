-- =============================================================
-- SPELBOK — Annonsyta i Plankets högerkolumn
--
-- Högerkolumnen på /planket bar tidigare "Mest ryggade idag" och
-- "Aktiva just nu". Den ytan blir nu annonsplats för skyskrapor:
-- ny placering 'planket' och nytt format '160x600'.
--
-- Kolumnen visar alla aktiva banners på placeringen samtidigt (två
-- i bredd), sorterade på sort — ingen rotation som i toppytorna.
--
-- Kör efter db/banner-format.sql, db/banner-html.sql och
-- db/coupons.sql (som senast satte placeringslistan).
-- =============================================================

alter table public.banners drop constraint if exists banners_placement_check;
alter table public.banners add constraint banners_placement_check
  check (placement in ('home', 'sheet', 'topplista', 'spelbolag', 'kuponger', 'planket'));

alter table public.banners drop constraint if exists banners_format_check;
alter table public.banners add constraint banners_format_check
  check (format in ('970x90', '320x100', '300x250', '160x600'));

-- -------------------------------------------------------------
-- Testkreativ: tre Netrefer-skyskrapor (Expekt + LeoVegas).
-- Titelprefixet gör blocket återkörbart.
-- -------------------------------------------------------------
delete from public.banners where title like 'Planket test:%';

insert into public.banners (title, creative_type, html_code, placement, format, sort, active)
values
  (
    'Planket test: Expekt 160×600',
    'html',
    '<iframe allowtransparency="true" src="https://ntrfr.expekt.se/ad.aspx?bid=19562&pid=3705219" width="160" height="600" marginwidth="0" marginheight="0" hspace="0" vspace="0" frameborder="0" scrolling="no"></iframe>',
    'planket', '160x600', 1, true
  ),
  (
    'Planket test: LeoVegas 160×600 (19383)',
    'html',
    '<iframe allowtransparency="true" src="https://ntrfr.leovegas.com/ad.aspx?bid=19383&pid=3603206" width="160" height="600" marginwidth="0" marginheight="0" hspace="0" vspace="0" frameborder="0" scrolling="no"></iframe>',
    'planket', '160x600', 2, true
  ),
  (
    'Planket test: LeoVegas 160×600 (19358)',
    'html',
    '<iframe allowtransparency="true" src="https://ntrfr.leovegas.com/ad.aspx?bid=19358&pid=3603206" width="160" height="600" marginwidth="0" marginheight="0" hspace="0" vspace="0" frameborder="0" scrolling="no"></iframe>',
    'planket', '160x600', 3, true
  );
