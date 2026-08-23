-- =============================================================
-- SPELBOK — Förslag per spelbok
--
-- Bygger ovanpå db/daily-suggestions.sql. Kör den först.
--
-- Efter den här migrationen finns två sorters rader i daily_suggestions:
--   sheet_id is null      → kontots 5 förslag, visas på Hem
--   sheet_id = <spelbok>  → spelbokens 3 egna, visas på Spelbok
--
-- En spelbok är en strategi. "Johans test" och "Spelbok 2" kan ha helt
-- olika profiler, så per-spelboks-förslagen räknas bara på just den
-- spelbokens rättade spel — annars hade båda visat samma matcher.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Koppling till spelbok
-- -------------------------------------------------------------
alter table public.daily_suggestions
  add column if not exists sheet_id uuid references public.sheets(id) on delete cascade;

-- -------------------------------------------------------------
-- 2. Unikhet med sheet_id
--
-- nulls not distinct (PG15+) krävs: med standardbeteendet räknas varje
-- null som unik, och kontoraderna hade kunnat dubbleras vid varje omkörning
-- — precis den idempotens upserten bygger på.
--
-- Partiella index vore alternativet, men PostgREST kan inte peka ut ett
-- partiellt index som konfliktmål i en upsert.
-- -------------------------------------------------------------
alter table public.daily_suggestions
  drop constraint if exists daily_suggestions_user_id_suggestion_date_fixture_id_key;

alter table public.daily_suggestions
  drop constraint if exists daily_suggestions_scope_key;

alter table public.daily_suggestions
  add constraint daily_suggestions_scope_key
  unique nulls not distinct (user_id, sheet_id, suggestion_date, fixture_id);

create index if not exists idx_daily_suggestions_sheet_date
  on public.daily_suggestions (sheet_id, suggestion_date)
  where sheet_id is not null;

-- RLS-policyerna filtrerar på user_id och gäller oförändrat för båda
-- sorternas rader. Spelboken ägs av samma användare.

-- -------------------------------------------------------------
-- 3. Profil per spelbok
--
-- p_sheet_id null = hela kontot (oförändrat beteende). Funktionen måste
-- droppas först: att lägga till en parameter med default skapar en
-- överlagring i stället för att ersätta, och då blir rpc-anropet med bara
-- p_user_id tvetydigt ("function is not unique").
-- -------------------------------------------------------------
drop function if exists public.get_user_betting_profile(uuid);

create or replace function public.get_user_betting_profile(
  p_user_id  uuid,
  p_sheet_id uuid default null
)
returns table (
  sport          text,
  league_id      int,
  league_name    text,
  bet_type       text,
  bets           int,
  weighted_bets  numeric,
  hitrate        numeric,
  roi            numeric,
  avg_odds       numeric,
  last_bet_at    timestamptz,
  established    boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with scoped as (
    select
      case
        when lower(coalesce(nullif(trim(b.sport), ''), f.sport, '')) in ('football', 'fotboll')
          then 'Fotboll'
        when lower(coalesce(nullif(trim(b.sport), ''), f.sport, '')) in ('hockey', 'ishockey')
          then 'Ishockey'
        else coalesce(nullif(trim(b.sport), ''), f.sport, 'Okänt')
      end                                                            as sport,
      coalesce(b.league_id, f.league_id)                             as league_id,
      coalesce(nullif(trim(b.league), ''), f.league_name, 'Övrigt')  as league_name,
      public.bet_type_family(b.pick)                                 as bet_type,
      case when b.placed_at >= now() - interval '90 days' then 2 else 1 end as w,
      case when b.result in ('win', 'halfwin') then 1 else 0 end     as is_win,
      b.stake,
      b.payout,
      b.odds,
      b.placed_at
    from public.bets b
    left join public.fixtures f on f.fixture_id = b.fixture_id
    where b.user_id = p_user_id
      and b.result <> 'open'
      and (p_sheet_id is null or b.sheet_id = p_sheet_id)
      and (auth.uid() is null or auth.uid() = p_user_id)
  )
  select
    s.sport,
    s.league_id,
    min(s.league_name)                                             as league_name,
    s.bet_type,
    count(*)::int                                                  as bets,
    sum(s.w)::numeric                                              as weighted_bets,
    round(sum(s.w * s.is_win)::numeric / nullif(sum(s.w), 0) * 100, 1) as hitrate,
    case
      when sum(s.w * s.stake) > 0
        then round(sum(s.w * (s.payout - s.stake)) / sum(s.w * s.stake) * 100, 1)
      else 0
    end                                                            as roi,
    round(sum(s.w * s.odds) / nullif(sum(s.w), 0), 2)              as avg_odds,
    max(s.placed_at)                                               as last_bet_at,
    count(*) >= 5                                                  as established
  from scoped s
  group by
    s.sport,
    s.league_id,
    case when s.league_id is null then lower(s.league_name) end,
    s.bet_type
  order by count(*) desc;
$$;

comment on function public.get_user_betting_profile(uuid, uuid) is
  'Aggregat per sport+liga+spelform. p_sheet_id null = hela kontot, annars bara den spelboken.';

-- -------------------------------------------------------------
-- 4. Kandidatspelböcker
--
-- Samma tröskel som för konton: minst p_min_bets rättade spel, annars
-- finns det för lite signal att matcha mot.
-- -------------------------------------------------------------
create or replace function public.suggestion_candidate_sheets(p_min_bets int default 10)
returns table (
  sheet_id       uuid,
  user_id        uuid,
  settled_bets   int,
  dominant_sport text
)
language sql
stable
security definer
set search_path = public
as $$
  with settled as (
    select
      b.sheet_id,
      b.user_id,
      case
        when lower(coalesce(nullif(trim(b.sport), ''), f.sport, '')) in ('football', 'fotboll')
          then 'Fotboll'
        when lower(coalesce(nullif(trim(b.sport), ''), f.sport, '')) in ('hockey', 'ishockey')
          then 'Ishockey'
        else coalesce(nullif(trim(b.sport), ''), f.sport, 'Okänt')
      end as sport
    from public.bets b
    left join public.fixtures f on f.fixture_id = b.fixture_id
    where b.result <> 'open'
  ),
  per_sport as (
    select
      sheet_id,
      user_id,
      sport,
      row_number() over (partition by sheet_id order by count(*) desc, sport) as rn,
      sum(count(*)) over (partition by sheet_id) as total
    from settled
    group by sheet_id, user_id, sport
  )
  select sheet_id, user_id, total::int, sport
  from per_sport
  where rn = 1 and total >= p_min_bets;
$$;

revoke all on function public.suggestion_candidate_sheets(int) from public, anon, authenticated;
grant execute on function public.suggestion_candidate_sheets(int) to service_role;

comment on function public.suggestion_candidate_sheets(int) is
  'Spelböcker med minst p_min_bets rättade spel, med dominant sport. Endast service role.';

-- =============================================================
-- Kontroll:
--   select * from public.suggestion_candidate_sheets(10);
--   select sheet_id, count(*) from public.daily_suggestions
--   where suggestion_date = current_date group by 1;
-- =============================================================
