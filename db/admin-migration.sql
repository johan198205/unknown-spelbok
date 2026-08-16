-- =============================================================
-- SPELBOK — Migrering 002: Admin
-- Kör i Supabase SQL Editor EFTER grundschemat.
-- Lägger till det admin-designen kräver: klickspårning,
-- bannerstatistik, händelselogg, inställningar, avstängning,
-- tävlingsregler och footer-sidor.
-- =============================================================

-- -------------------------------------------------------------
-- 1. AFFILIATEKLICK — spårar klick på tracking-länkar
--    Skrivs av /go/[slug]-routen, läses endast av admin.
-- -------------------------------------------------------------
create table public.affiliate_clicks (
  id           uuid primary key default gen_random_uuid(),
  bookmaker_id uuid not null references public.bookmakers(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  source       text,                        -- 'spelbolag' | 'banner' | 'spelbok'
  clicked_at   timestamptz not null default now()
);

create index affiliate_clicks_bm_idx   on public.affiliate_clicks(bookmaker_id, clicked_at);
create index affiliate_clicks_time_idx on public.affiliate_clicks(clicked_at);

alter table public.affiliate_clicks enable row level security;
create policy "klick skrivs av alla"  on public.affiliate_clicks
  for insert with check (true);
create policy "klick läses av admin"  on public.affiliate_clicks
  for select using (public.is_admin());

-- -------------------------------------------------------------
-- 2. BANNERHÄNDELSER — visningar och klick per banner
-- -------------------------------------------------------------
create table public.banner_events (
  id          uuid primary key default gen_random_uuid(),
  banner_id   uuid not null references public.banners(id) on delete cascade,
  event       text not null check (event in ('view','click')),
  occurred_at timestamptz not null default now()
);

create index banner_events_idx on public.banner_events(banner_id, event, occurred_at);

alter table public.banner_events enable row level security;
create policy "bannerhändelser skrivs av alla" on public.banner_events
  for insert with check (true);
create policy "bannerhändelser läses av admin" on public.banner_events
  for select using (public.is_admin());

-- Sammanställning för admin-vyn (klick, visningar, CTR)
create or replace view public.banner_stats as
select
  b.id as banner_id,
  count(*) filter (where e.event = 'view')  as views,
  count(*) filter (where e.event = 'click') as clicks,
  case when count(*) filter (where e.event = 'view') > 0
       then round(count(*) filter (where e.event = 'click')::numeric
            / count(*) filter (where e.event = 'view') * 100, 2)
       else 0 end as ctr
from public.banners b
left join public.banner_events e on e.banner_id = b.id
group by b.id;

-- -------------------------------------------------------------
-- 3. HÄNDELSELOGG — allt admin gör loggas
-- -------------------------------------------------------------
create table public.admin_logs (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid not null references public.profiles(id) on delete cascade,
  action     text not null,        -- 'user.role_changed', 'page.published', ...
  target     text,                 -- läsbar beskrivning: 'användare johan', '/guider/x'
  meta       jsonb default '{}',
  created_at timestamptz not null default now()
);

create index admin_logs_time_idx on public.admin_logs(created_at desc);

alter table public.admin_logs enable row level security;
create policy "loggar admin" on public.admin_logs
  for all using (public.is_admin());

-- -------------------------------------------------------------
-- 4. INSTÄLLNINGAR — nyckel/värde, endast admin
-- -------------------------------------------------------------
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
create policy "inställningar admin" on public.app_settings
  for all using (public.is_admin());

insert into public.app_settings (key, value) values
  ('site',   '{"name":"Spelbok","currency":"SEK","registrations_open":true,"maintenance":false}'),
  ('notify', '{"new_user":"email","manual_settle":"email","api_quota":"email","competition_entry":"none"}')
on conflict do nothing;

-- -------------------------------------------------------------
-- 5. ANVÄNDARE — avstängning och aktivitet
-- -------------------------------------------------------------
alter table public.profiles
  add column if not exists banned       boolean not null default false,
  add column if not exists last_seen_at timestamptz;

-- Avstängda användare förlorar skrivåtkomst till spel
drop policy if exists "egna bets" on public.bets;
create policy "egna bets" on public.bets for all using (
  auth.uid() = user_id
  and not exists (select 1 from public.profiles where id = auth.uid() and banned)
);

-- -------------------------------------------------------------
-- 6. TÄVLINGAR — regler och pris enligt admin-designen
-- -------------------------------------------------------------
alter table public.competitions
  add column if not exists min_bets        int not null default 0,
  add column if not exists min_total_stake numeric(12,2) not null default 0,
  add column if not exists prize           text,
  add column if not exists visibility      text not null default 'public'
    check (visibility in ('public','invite'));

-- -------------------------------------------------------------
-- 7. SIDOR — footer-visning
-- -------------------------------------------------------------
alter table public.pages
  add column if not exists show_in_footer boolean not null default false;

-- -------------------------------------------------------------
-- 8. SÄTTLINGSKÖ — spel som inte kunnat auto-rättas
--    (fylls senare av settle-bets-funktionen; admin-vyn läser den redan nu)
-- -------------------------------------------------------------
create table public.settle_queue (
  id         uuid primary key default gen_random_uuid(),
  bet_id     uuid not null references public.bets(id) on delete cascade,
  reason     text not null,        -- 'fixture_missing' | 'postponed' | 'unclear'
  created_at timestamptz not null default now(),
  resolved   boolean not null default false
);

alter table public.settle_queue enable row level security;
create policy "sättlingskö admin" on public.settle_queue
  for all using (public.is_admin());

-- =============================================================
-- KLART. Generera om TypeScript-typerna efteråt:
--   npx supabase gen types typescript --project-id DITT_PROJEKT_REF > src/lib/types.ts
-- =============================================================
