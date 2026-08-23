-- =============================================================
-- SPELBOK — Signalmotor med admin-definierade regler
--
-- Bygger ovanpå db/daily-suggestions.sql. Kör den först.
--
-- Reglerna är data, inte kod: admin skapar och justerar dem i
-- /admin/regler utan deploy. Villkoren är strukturerad jsonb och
-- fältnamnen valideras mot ett fältbibliotek i koden — aldrig fri kod
-- som körs.
--
-- Signaler FÖRSTÄRKER, de gate:ar inte. En match som redan matchar
-- användarens profil kan få extra poäng och ett extra skäl; en match
-- utan profilträff blir inte föreslagen bara för att en signal slår.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Beräknad statistik per fixture och dag
--
-- Delas av alla användare: samma match har samma matchbild oavsett vem
-- som tittar. Därför ingen user_id och ingen RLS på ägarskap.
-- -------------------------------------------------------------
create table if not exists public.fixture_signals (
  id                  uuid primary key default gen_random_uuid(),
  fixture_id          bigint not null,
  signal_date         date not null,
  sport               text not null,
  league_id           bigint not null,
  season              int not null,
  metrics             jsonb not null,       -- hela fältbiblioteket, se SIGNAL_FIELDS
  home_matches_played int not null,
  away_matches_played int not null,
  computed_at         timestamptz not null default now(),
  unique (fixture_id, signal_date)
);

create index if not exists idx_fixture_signals_date
  on public.fixture_signals (signal_date);

-- -------------------------------------------------------------
-- 2. Reglerna
--
-- Ingen delete, varken i UI eller API — regler inaktiveras. Historiska
-- förslag pekar på rule_id i sina reasons, och en raderad regel hade
-- gjort gamla kort omöjliga att härleda.
-- -------------------------------------------------------------
create table if not exists public.signal_rules (
  id                uuid primary key default gen_random_uuid(),
  -- null = global adminregel. Kolumnen finns för framtida användarregler;
  -- RLS släpper i den här iterationen bara igenom null.
  user_id           uuid references auth.users(id) on delete cascade,
  name              text not null,
  bet_type          text not null,          -- 'over_2_5' | 'btts' | '1x2_home' | …
  sport             text not null,          -- 'football' | 'hockey'
  conditions        jsonb not null,         -- { all: [{ field, op, value }] }
  weight            int not null default 25 check (weight between 1 and 50),
  label_template    text not null,          -- "Målrikt: {combined.avg_goals} mål/match"
  min_matches_played int not null default 8 check (min_matches_played >= 0),
  active            boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid references auth.users(id)
);

create index if not exists idx_signal_rules_active
  on public.signal_rules (sport, bet_type)
  where active and user_id is null;

-- -------------------------------------------------------------
-- 3. Cache för api-sports-svar
--
-- Ett lag som spelar idag och imorgon ska kosta ett anrop, inte två.
-- Skrivs och läses bara av service role.
-- -------------------------------------------------------------
create table if not exists public.api_cache (
  cache_key  text primary key,
  payload    jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_cache_expires
  on public.api_cache (expires_at);

-- -------------------------------------------------------------
-- 4. RLS
--
-- OBS: promptboarden skriver is_admin(auth.uid()). Den signaturen finns
-- inte i det här schemat — public.is_admin() läser auth.uid() själv
-- (se supabase-schema.sql). Återanvänder den i stället för att skapa
-- parallell logik.
-- -------------------------------------------------------------
alter table public.fixture_signals enable row level security;
alter table public.signal_rules    enable row level security;
alter table public.api_cache       enable row level security;

drop policy if exists "Authenticated read signals" on public.fixture_signals;
create policy "Authenticated read signals"
  on public.fixture_signals for select
  using (auth.role() = 'authenticated');

drop policy if exists "Read active global rules" on public.signal_rules;
drop policy if exists "Admin insert rules"       on public.signal_rules;
drop policy if exists "Admin update rules"       on public.signal_rules;

-- Vanliga användare ser aktiva globala regler (skälen på korten refererar
-- dem). Admin ser även inaktiva.
create policy "Read active global rules"
  on public.signal_rules for select
  using (user_id is null and (active or public.is_admin()));

create policy "Admin insert rules"
  on public.signal_rules for insert
  with check (public.is_admin() and user_id is null);

create policy "Admin update rules"
  on public.signal_rules for update
  using (public.is_admin())
  with check (public.is_admin() and user_id is null);

-- api_cache: ingen policy alls. RLS på utan policy = ingen åtkomst för
-- anon/authenticated, och service role går förbi. Precis vad vi vill.

-- -------------------------------------------------------------
-- 5. updated_at
-- -------------------------------------------------------------
create or replace function public.touch_signal_rule()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists signal_rules_touch on public.signal_rules;
create trigger signal_rules_touch
  before update on public.signal_rules
  for each row execute function public.touch_signal_rule();

-- -------------------------------------------------------------
-- 6. Seed — fyra exempelregler, alla inaktiva
--
-- Admin aktiverar manuellt efter att ha kört förhandsgranskningen. Att
-- seeda dem aktiva vore att smyga in poängpåverkan på riktiga förslag
-- utan att någon tittat på utfallet.
--
-- on conflict do nothing via namnet: körs filen om ska seeden inte
-- dubbleras eller skriva över admins justeringar.
-- -------------------------------------------------------------
create unique index if not exists signal_rules_global_name_uidx
  on public.signal_rules (name)
  where user_id is null;

insert into public.signal_rules
  (name, bet_type, sport, weight, min_matches_played, label_template, conditions)
values
  -- Avsteg från promptboarden: den anger combined.avg_goals, som bara
  -- summerar vad lagen GÖR för mål och ignorerar vad de släpper in.
  -- combined.avg_total_goals väger anfall mot motståndarens försvar åt båda
  -- hållen, vilket är vad marknaden "över 2.5" faktiskt handlar om.
  --
  -- Villkoret och label-mallen måste peka på SAMMA fält. Gör de inte det
  -- motiverar badgen träffen med en siffra som inte klarar kravet — vilket
  -- hände i skarpt läge innan det upptäcktes.
  (
    'Målrik matchbild', 'over_2_5', 'football', 25, 8,
    'Målrik matchbild – {combined.avg_total_goals} mål/match i snitt',
    '{"all": [
       {"field": "home.over_2_5_pct",        "op": ">=", "value": 60},
       {"field": "away.over_2_5_pct",        "op": ">=", "value": 60},
       {"field": "combined.avg_total_goals", "op": ">=", "value": 3.0},
       {"field": "h2h.avg_goals_last_5",     "op": ">=", "value": 2.8}
     ]}'::jsonb
  ),
  (
    'Målfattig matchbild', 'under_2_5', 'football', 25, 8,
    'Målfattig matchbild – över 2.5 i {home.over_2_5_pct}/{away.over_2_5_pct} % av matcherna',
    '{"all": [
       {"field": "home.over_2_5_pct",   "op": "<=", "value": 40},
       {"field": "away.over_2_5_pct",   "op": "<=", "value": 40},
       {"field": "home.clean_sheet_pct", "op": ">=", "value": 35},
       {"field": "away.clean_sheet_pct", "op": ">=", "value": 35}
     ]}'::jsonb
  ),
  (
    'Båda lagen gör mål', 'btts', 'football', 25, 8,
    'Båda lagen gör mål i {home.btts_pct}/{away.btts_pct} % av matcherna',
    '{"all": [
       {"field": "home.btts_pct",        "op": ">=", "value": 65},
       {"field": "away.btts_pct",        "op": ">=", "value": 65},
       {"field": "home.clean_sheet_pct", "op": "<=", "value": 40},
       {"field": "away.clean_sheet_pct", "op": "<=", "value": 40}
     ]}'::jsonb
  ),
  (
    'Stark hemmaplan', '1x2_home', 'football', 20, 8,
    'Stark hemmaplan – {home.avg_goals_for_home} mål/match hemma, {home.form_points_last_5} poäng senaste fem',
    '{"all": [
       {"field": "home.avg_goals_for_home",  "op": ">=", "value": 1.8},
       {"field": "home.form_points_last_5",  "op": ">=", "value": 10},
       {"field": "h2h.home_wins_last_5",     "op": ">=", "value": 3}
     ]}'::jsonb
  )
on conflict do nothing;

-- =============================================================
-- Kontroll:
--   select name, bet_type, weight, active from public.signal_rules
--   where user_id is null order by name;
--
--   select signal_date, count(*) from public.fixture_signals
--   group by 1 order by 1 desc;
-- =============================================================
