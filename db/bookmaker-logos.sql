-- Spelbolagslogotyper: Storage-bucket + RLS så inaktiva bolag syns på befintliga spel.
-- Kör i Supabase SQL Editor.

-- -------------------------------------------------------------
-- 1. Storage-bucket bookmaker-logos (publik läsning, admin skriver)
--    PNG / SVG / WebP, max 200 KB
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bookmaker-logos',
  'bookmaker-logos',
  true,
  204800,
  array['image/png', 'image/svg+xml', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Behåll även den äldre "logos"-bucketen (befintliga uppladdningar).
-- Utöka policies till bookmaker-logos.

drop policy if exists "publik läsning storage" on storage.objects;
create policy "publik läsning storage" on storage.objects
  for select using (
    bucket_id in ('banners', 'logos', 'avatars', 'bookmaker-logos')
  );

drop policy if exists "admin skriver banners/logos" on storage.objects;
create policy "admin skriver banners/logos" on storage.objects
  for insert with check (
    bucket_id in ('banners', 'logos', 'bookmaker-logos')
    and public.is_admin()
  );

drop policy if exists "admin uppdaterar banners/logos" on storage.objects;
create policy "admin uppdaterar banners/logos" on storage.objects
  for update using (
    bucket_id in ('banners', 'logos', 'bookmaker-logos')
    and public.is_admin()
  );

drop policy if exists "admin raderar banners/logos" on storage.objects;
create policy "admin raderar banners/logos" on storage.objects
  for delete using (
    bucket_id in ('banners', 'logos', 'bookmaker-logos')
    and public.is_admin()
  );

-- -------------------------------------------------------------
-- 2. Bookmakers RLS: inloggade ser alla (även inaktiva på gamla spel),
--    anonyma ser bara aktiva (publik /spelbolag-sida).
--    Skriv endast admin.
-- -------------------------------------------------------------
drop policy if exists "bookmakers läsbara" on public.bookmakers;
drop policy if exists "bookmakers publika aktiva" on public.bookmakers;
drop policy if exists "bookmakers inloggade" on public.bookmakers;

create policy "bookmakers publika aktiva" on public.bookmakers
  for select using (active = true);

create policy "bookmakers inloggade" on public.bookmakers
  for select using (auth.uid() is not null);

-- admin bookmakers (for all) ska redan finnas från supabase-schema.sql

-- -------------------------------------------------------------
-- 3. Säkerställ Unibet (för dropdown / migrering)
-- -------------------------------------------------------------
insert into public.bookmakers (name, slug, rank, active)
values ('Unibet', 'unibet', 1, true)
on conflict (slug) do nothing;
