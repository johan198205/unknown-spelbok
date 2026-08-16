-- =============================================================
-- SPELBOK — Supabase-schema
-- Kör hela filen i Supabase SQL Editor (Dashboard > SQL Editor).
-- Fälten speglar designexporten (fixtures.js, bookmakers.js,
-- Spelbok App.dc.html) så att UI:t kan kopplas rakt på.
-- =============================================================

-- -------------------------------------------------------------
-- 1. PROFILER (kopplas till auth.users)
-- -------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  role        text not null default 'user' check (role in ('user','admin')),
  created_at  timestamptz not null default now()
);

-- Skapa profil automatiskt vid registrering
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8))
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hjälpfunktion för admin-koll (används i RLS-policies)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- -------------------------------------------------------------
-- 2. SPELBÖCKER (sheets) — varje användare kan ha flera
-- -------------------------------------------------------------
create table public.sheets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null default 'Min spelbok',
  start_bankroll  numeric(12,2) not null default 0,
  currency        text not null default 'SEK',
  is_public       boolean not null default false,  -- syns i topplista/profil
  created_at      timestamptz not null default now()
);

create index sheets_user_idx on public.sheets(user_id);

-- -------------------------------------------------------------
-- 3. FIXTURES — cache av matchdata från API-Football
--    Fylls av backend/cron, aldrig direkt av klienten.
-- -------------------------------------------------------------
create table public.fixtures (
  fixture_id    bigint primary key,           -- API-Footballs id
  kickoff       timestamptz not null,
  status        text not null default 'NS',   -- NS | LIVE | FT
  sport         text not null default 'Fotboll',
  league_id     int,
  league_name   text,
  league_logo   text,
  home_team_id  int,
  home_name     text,
  home_logo     text,
  away_team_id  int,
  away_name     text,
  away_logo     text,
  home_score    int,
  away_score    int,
  updated_at    timestamptz not null default now()
);

create index fixtures_kickoff_idx on public.fixtures(kickoff);
create index fixtures_status_idx on public.fixtures(status);

-- -------------------------------------------------------------
-- 4. SPELBOLAG (bookmakers) — speglar bookmakers.js
-- -------------------------------------------------------------
create table public.bookmakers (
  id            uuid primary key default gen_random_uuid(),
  rank          int not null default 99,
  name          text not null,
  slug          text unique not null,
  logo_url      text,
  bonus         text,
  bonus_value   int default 0,
  terms         text,
  usp           text,
  payments      text[] default '{}',
  rating        numeric(2,1) check (rating between 0 and 5),
  fast_payout   boolean not null default false,
  tracking_url  text,
  review        text,
  plus          text[] default '{}',
  minus         text[] default '{}',
  active        boolean not null default true,
  updated_at    timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 5. SPEL (bets) — speglar bet-objekten i appdesignen
-- -------------------------------------------------------------
create table public.bets (
  id            uuid primary key default gen_random_uuid(),
  sheet_id      uuid not null references public.sheets(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  fixture_id    bigint references public.fixtures(fixture_id),
  sport         text,
  league        text,
  match         text not null,                -- "Liverpool – Arsenal"
  pick          text not null,                -- "1", "Över 2.5", spelarens val
  bookmaker_id  uuid references public.bookmakers(id),
  odds          numeric(7,2) not null check (odds >= 1),
  stake         numeric(12,2) not null check (stake > 0),
  result        text not null default 'open'
                check (result in ('open','win','loss','void','halfwin','halfloss')),
  payout        numeric(12,2) generated always as (
                  case result
                    when 'win'      then stake * odds
                    when 'halfwin'  then stake / 2 * odds + stake / 2
                    when 'void'     then stake
                    when 'halfloss' then stake / 2
                    else 0
                  end
                ) stored,
  placed_at     timestamptz not null default now(),
  settled_at    timestamptz,
  settled_by    text check (settled_by in ('user','auto'))  -- inför automatisk sättling
);

create index bets_sheet_idx   on public.bets(sheet_id);
create index bets_user_idx    on public.bets(user_id);
create index bets_fixture_idx on public.bets(fixture_id) where result = 'open';

-- -------------------------------------------------------------
-- 6. TÄVLINGAR + TOPPLISTA
-- -------------------------------------------------------------
create table public.competitions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.competition_entries (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  joined_at      timestamptz not null default now(),
  primary key (competition_id, user_id)
);

-- Topplista per tävling: netto och ROI räknas på spel lagda inom tävlingsperioden
create or replace view public.leaderboard as
select
  ce.competition_id,
  p.id            as user_id,
  p.username,
  p.avatar_url,
  count(b.id)                                   as bets_count,
  coalesce(sum(b.stake), 0)                     as total_stake,
  coalesce(sum(b.payout - b.stake), 0)          as netto,
  case when coalesce(sum(b.stake), 0) > 0
       then round(sum(b.payout - b.stake) / sum(b.stake) * 100, 1)
       else 0 end                               as roi
from public.competition_entries ce
join public.competitions c on c.id = ce.competition_id
join public.profiles p     on p.id = ce.user_id
left join public.bets b    on b.user_id = ce.user_id
  and b.result <> 'open'
  and b.placed_at between c.starts_at and c.ends_at
group by ce.competition_id, p.id, p.username, p.avatar_url;

-- -------------------------------------------------------------
-- 7. CMS: BANNERS OCH SIDOR
-- -------------------------------------------------------------
create table public.banners (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  image_url  text not null,          -- Supabase Storage, bucket "banners"
  link_url   text,
  placement  text not null default 'home'
             check (placement in ('home','sheet','topplista','spelbolag')),
  sort       int not null default 0,
  active     boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

create table public.pages (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  content          text not null default '',   -- markdown
  seo_title        text,
  seo_description  text,
  published        boolean not null default false,
  author_id        uuid references public.profiles(id),
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- -------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.sheets              enable row level security;
alter table public.bets                enable row level security;
alter table public.fixtures            enable row level security;
alter table public.bookmakers          enable row level security;
alter table public.banners             enable row level security;
alter table public.pages               enable row level security;
alter table public.competitions        enable row level security;
alter table public.competition_entries enable row level security;

-- Profiler: alla kan läsa (behövs för topplistor), bara ägaren uppdaterar
create policy "profiles läsbara"      on public.profiles for select using (true);
create policy "egen profil"           on public.profiles for update using (auth.uid() = id);
create policy "admin profiler"        on public.profiles for all using (public.is_admin());

-- Spelböcker: ägaren gör allt, publika spelböcker läsbara av alla
create policy "egna sheets"           on public.sheets for all using (auth.uid() = user_id);
create policy "publika sheets"        on public.sheets for select using (is_public = true);

-- Spel: ägaren gör allt; spel i publik spelbok läsbara (topplista/profil)
create policy "egna bets"             on public.bets for all using (auth.uid() = user_id);
create policy "publika bets"          on public.bets for select using (
  exists (select 1 from public.sheets s where s.id = sheet_id and s.is_public)
);

-- Fixtures: alla kan läsa, bara backend (service role) skriver
create policy "fixtures läsbara"      on public.fixtures for select using (true);

-- Spelbolag/banners/sidor: publikt läsbara, bara admin skriver
create policy "bookmakers läsbara"    on public.bookmakers for select using (active = true);
create policy "admin bookmakers"      on public.bookmakers for all using (public.is_admin());

create policy "banners läsbara"       on public.banners for select using (active = true);
create policy "admin banners"         on public.banners for all using (public.is_admin());

create policy "pages läsbara"         on public.pages for select using (published = true);
create policy "admin pages"           on public.pages for all using (public.is_admin());

-- Tävlingar: läsbara av alla, admin administrerar, användare anmäler sig själva
create policy "competitions läsbara"  on public.competitions for select using (true);
create policy "admin competitions"    on public.competitions for all using (public.is_admin());

create policy "entries läsbara"       on public.competition_entries for select using (true);
create policy "egen anmälan"          on public.competition_entries for insert
  with check (auth.uid() = user_id);
create policy "egen avanmälan"        on public.competition_entries for delete
  using (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 9. STORAGE (kör efter att bucketen skapats i Dashboard,
--    eller skapa direkt här)
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('banners', 'banners', true),
  ('logos',   'logos',   true),
  ('avatars', 'avatars', true)
on conflict do nothing;

create policy "publik läsning storage" on storage.objects
  for select using (bucket_id in ('banners','logos','avatars'));
create policy "admin skriver banners/logos" on storage.objects
  for insert with check (bucket_id in ('banners','logos') and public.is_admin());
create policy "egen avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================
-- KLART. Nästa steg:
-- 1. Skapa första admin: uppdatera din egen rad i profiles
--    update public.profiles set role = 'admin' where username = 'ditt_namn';
-- 2. Importera spelbolagen från bookmakers.js till bookmakers-tabellen.
-- 3. Sätt upp cron för fixtures-uppdatering (se START.md).
-- =============================================================
