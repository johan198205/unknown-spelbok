-- =============================================================
-- SPELBOK — HTML-kreativ på banners
--
-- Affiliatenätverk (Unibet, Betsson, Income Access, m.fl.) levererar
-- oftast en färdig kodsnutt i stället för en bildfil: en <iframe>,
-- ett <script> eller en <a><img></a> med deras egen spårning. Den
-- snutten måste köras som den är — laddar vi bara ner bilden tappar
-- annonsören sin impression-räkning och vi bryter mot avtalet.
--
-- Därför får bannern en kreativtyp:
--   image — image_url pekar på en uppladdad/länkad bild (som förut)
--   html  — html_code innehåller nätverkets snutt, renderas i en
--           sandboxad iframe (se components/ui/BannerHtml.tsx)
--
-- image_url blir nullable eftersom en html-banner inte har någon bild.
-- Befintliga rader defaultar till 'image' och är oförändrade.
-- =============================================================

alter table public.banners
  add column if not exists creative_type text not null default 'image';

alter table public.banners
  add column if not exists html_code text;

alter table public.banners
  alter column image_url drop not null;

alter table public.banners
  drop constraint if exists banners_creative_type_check;

alter table public.banners
  add constraint banners_creative_type_check
  check (creative_type in ('image', 'html'));

-- En banner utan kreativ renderar en tom ruta i annonsytan. Kravet
-- ligger i databasen och inte bara i serveråtgärden, så att en rad som
-- skapas via SQL eller Supabase-studio inte kan bli halvfärdig.
alter table public.banners
  drop constraint if exists banners_creative_present_check;

alter table public.banners
  add constraint banners_creative_present_check
  check (
    (creative_type = 'image' and image_url is not null and image_url <> '')
    or
    (creative_type = 'html' and html_code is not null and html_code <> '')
  );
