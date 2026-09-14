-- Spelbolagskort: bannerbild + kampanj-/bonusfält för affiliatesidan
alter table public.bookmakers
  add column if not exists hero_url text,
  add column if not exists hero_filename text,
  add column if not exists hero_uploaded_at timestamptz,
  add column if not exists badge text,
  add column if not exists wagering text,
  add column if not exists bonus2_label text,
  add column if not exists bonus2_value text,
  add column if not exists tags text[] default '{}'::text[],
  add column if not exists license text;

comment on column public.bookmakers.hero_url is
  'Publik URL till redaktionens bannerbild (rekommenderat 640×300)';
comment on column public.bookmakers.hero_filename is
  'Originalfilnamn för spårning i admin';
comment on column public.bookmakers.hero_uploaded_at is
  'När bannerbilden laddades upp';
comment on column public.bookmakers.badge is
  'Kampanjbadge som bryter hjälten, t.ex. Toppval';
comment on column public.bookmakers.wagering is
  'Omsättningskrav, t.ex. 6x. Tomt/null = inget omsättningskrav';
comment on column public.bookmakers.bonus2_label is
  'Andra erbjudandet: FREE BETS eller ODDS BOOST';
comment on column public.bookmakers.bonus2_value is
  'Värde för andra erbjudandet, t.ex. 500 kr';
comment on column public.bookmakers.tags is
  'Filtertaggar: Populära, Nya spelbolag, Livebetting m.fl.';
comment on column public.bookmakers.license is
  'Licensrad i utfällningen, t.ex. Svensk licens, Spelinspektionen';

-- Bannerbilder för spelbolagskort (samma policies som övriga publika buckets)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bookmaker-heroes',
  'bookmaker-heroes',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "publik läsning storage" on storage.objects;
create policy "publik läsning storage" on storage.objects
  for select using (
    bucket_id in ('banners', 'logos', 'avatars', 'bookmaker-logos', 'bookmaker-heroes', 'popups')
  );

drop policy if exists "admin skriver banners/logos" on storage.objects;
create policy "admin skriver banners/logos" on storage.objects
  for insert with check (
    bucket_id in ('banners', 'logos', 'bookmaker-logos', 'bookmaker-heroes')
    and public.is_admin()
  );

drop policy if exists "admin uppdaterar banners/logos" on storage.objects;
create policy "admin uppdaterar banners/logos" on storage.objects
  for update using (
    bucket_id in ('banners', 'logos', 'bookmaker-logos', 'bookmaker-heroes')
    and public.is_admin()
  );

drop policy if exists "admin raderar banners/logos" on storage.objects;
create policy "admin raderar banners/logos" on storage.objects
  for delete using (
    bucket_id in ('banners', 'logos', 'bookmaker-logos', 'bookmaker-heroes')
    and public.is_admin()
  );

-- Redaktörer får också ladda upp bannerbilder (redaktionsläge på /spelbolag)
drop policy if exists "redaktion skriver bookmaker-heroes" on storage.objects;
create policy "redaktion skriver bookmaker-heroes" on storage.objects
  for insert with check (
    bucket_id = 'bookmaker-heroes'
    and public.is_editor()
  );

drop policy if exists "redaktion uppdaterar bookmaker-heroes" on storage.objects;
create policy "redaktion uppdaterar bookmaker-heroes" on storage.objects
  for update using (
    bucket_id = 'bookmaker-heroes'
    and public.is_editor()
  );
