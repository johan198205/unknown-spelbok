-- =============================================================
-- SPELBOK — Dagens matcher för dig (Nivå 1, regelmotor)
--
-- Skapar:
--   public.bet_type_family(text)           spelform-familj ur ett pick
--   public.get_user_betting_profile(uuid)  aggregat per sport+liga+spelform
--   public.daily_suggestions               dagens förslag per användare
--
-- Kör hela filen i Supabase SQL Editor. Idempotent — går att köra om.
--
-- Skrivning sker ENDAST via service role (Edge Function
-- generate-daily-suggestions). Användaren får läsa och uppdatera
-- clicked/dismissed på sina egna rader, inget annat.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Spelform-familj
--
-- `bets.pick` är fritext ("Ö2.5", "1 (hemma)", "Hemma -1.5"). För
-- matchningen behövs en grövre nivå: ett segment på enskilda pick
-- får aldrig ihop 5 rättade spel, och "68 % på Ö2.5" säger mindre
-- än "68 % på över/under".
--
-- Ordningen i CASE:en är betydelsefull. "Ö1.5 mål 1:a halvlek" är
-- halvlek, inte över/under, och "Hemma inkl. övertid" innehåller
-- delsträngen "över" utan att vara ett över/under-spel.
-- -------------------------------------------------------------
create or replace function public.bet_type_family(p_pick text)
returns text
language plpgsql
immutable
as $$
declare
  v text := lower(coalesce(trim(p_pick), ''));
begin
  if v = ''                                        then return 'Okänt';           end if;
  if v ~ 'hörn'                                    then return 'Hörnor';          end if;
  if v ~ 'kort'                                    then return 'Kort';            end if;
  if v ~ 'målskytt|poäng när som helst|skott på mål'
                                                   then return 'Spelarspel';      end if;
  if v ~ 'övertid'                                 then return 'Inkl. övertid';   end if;
  if v ~ 'båda lagen'                              then return 'Båda lagen mål';  end if;
  if v ~ 'håller nollan'                           then return 'Håller nollan';   end if;
  if v ~ 'dnb|draw no bet'                         then return 'DNB';             end if;
  if v ~ 'asiatisk' or v ~ '^(hemma|borta) [+-]'   then return 'Handikapp';       end if;
  if v ~ 'halvlek|period'                          then return 'Halvlek/period';  end if;
  if v ~ '^(hemma|borta) [öu][0-9]'                then return 'Lagets mål';      end if;
  if v ~ '^[öu][0-9]' or v ~ 'över|under'          then return 'Över/under';      end if;
  if v in ('1x', 'x2', '12')                       then return 'Dubbelchans';     end if;
  if v ~ '^(1|x|2)([^0-9]|$)'                      then return '1X2';             end if;
  if v ~ 'set|games|tiebreak|break'                then return 'Tennisspel';      end if;
  return 'Övrigt';
end $$;

comment on function public.bet_type_family(text) is
  'Normaliserar bets.pick till en spelform-familj (Över/under, 1X2, Handikapp …).';

-- -------------------------------------------------------------
-- 2. Spelprofil per användare
--
-- Ett segment = sport + liga + spelform. Endast rättade spel räknas
-- (result <> 'open'); hitrate följer appens definition i
-- computeStats(): (win + halfwin) / rättade, void ligger kvar i
-- nämnaren.
--
-- Recency: spel de senaste 90 dagarna väger dubbelt. Vikten slår
-- igenom på weighted_bets, hitrate, roi och avg_odds — inte på
-- bets, som är det råa antalet och det enda som avgör om segmentet
-- är etablerat (>= 5 rättade spel).
--
-- security invoker: en inloggad användare får bara sina egna spel
-- ur RLS ändå. Argumentet spärras dessutom explicit så att en
-- användare inte kan läsa aggregat för någon annans publika spelbok.
-- Service role (auth.uid() is null) får läsa vem som helst.
-- -------------------------------------------------------------
create or replace function public.get_user_betting_profile(p_user_id uuid)
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
  -- Manuellt inskrivna ligor saknar league_id. Utan namnet i group by
  -- skulle alla sådana slås ihop till ett enda "liga null"-segment.
  --
  -- lower(): fritextfältet stavas som användaren råkade skriva, så
  -- "Premier league" och "Premier League" är samma liga. Utan
  -- normaliseringen blir de två segment som var för sig aldrig når fem
  -- rättade spel.
  group by
    s.sport,
    s.league_id,
    case when s.league_id is null then lower(s.league_name) end,
    s.bet_type
  order by count(*) desc;
$$;

comment on function public.get_user_betting_profile(uuid) is
  'Aggregat per sport+liga+spelform. Recency-viktat (90 dagar väger dubbelt). established = minst 5 rättade spel.';

-- -------------------------------------------------------------
-- 2b. Kandidater för dagens förslag
--
-- Endast användare med minst 10 rättade spel totalt. Dominant sport
-- följer med direkt — annars hade Edge Functionen behövt ett extra
-- anrop per användare bara för att räkna den.
--
-- security definer: körs av service role från Edge Functionen och ska
-- kunna se alla användares spel. Rättigheten återkallas från anon och
-- authenticated nedan så att ingen inloggad klient kan lista andra.
-- -------------------------------------------------------------
create or replace function public.suggestion_candidate_users(p_min_bets int default 10)
returns table (
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
      user_id,
      sport,
      count(*) as n,
      row_number() over (partition by user_id order by count(*) desc, sport) as rn,
      sum(count(*)) over (partition by user_id) as total
    from settled
    group by user_id, sport
  )
  select user_id, total::int, sport
  from per_sport
  where rn = 1 and total >= p_min_bets;
$$;

-- Explicit grant efter revoke: EXECUTE kommer normalt via PUBLIC, och att
-- bara återkalla därifrån hade stängt ute Edge Functionen också.
revoke all on function public.suggestion_candidate_users(int) from public, anon, authenticated;
grant execute on function public.suggestion_candidate_users(int) to service_role;

comment on function public.suggestion_candidate_users(int) is
  'Användare med minst p_min_bets rättade spel, med dominant sport. Endast service role.';

-- -------------------------------------------------------------
-- 3. Dagens förslag
--
-- home_team_id/away_team_id/league_logo finns utöver promptboardens
-- kolumner: kortet ritar liga- och lagloggor, och klicket ska kunna
-- förifylla kaskad-väljaren utan att först slå mot /api/fixtures.
-- -------------------------------------------------------------
create table if not exists public.daily_suggestions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  suggestion_date   date not null,
  fixture_id        bigint not null,
  sport             text not null,                 -- 'football' | 'hockey'
  league_id         bigint not null,
  league_name       text not null,
  league_logo       text,
  home_team         text not null,
  home_team_id      bigint,
  home_logo         text,
  away_team         text not null,
  away_team_id      bigint,
  away_logo         text,
  kickoff           timestamptz not null,
  suggested_bet_type text,                         -- spelform-familj i segmentet
  match_score       numeric not null,              -- relevanspoäng 0–100
  reasons           jsonb not null default '[]',   -- [{ type, label, weight }]
  clicked           boolean not null default false,
  dismissed         boolean not null default false,
  created_at        timestamptz not null default now(),
  unique (user_id, suggestion_date, fixture_id)
);

create index if not exists idx_daily_suggestions_user_date
  on public.daily_suggestions (user_id, suggestion_date);

-- Uppföljningen (Nivå 1, punkt 6): vilka förslag som klickas respektive
-- avfärdas ska gå att läsa ut utan seq scan när datan växer.
create index if not exists idx_daily_suggestions_feedback
  on public.daily_suggestions (user_id, suggestion_date)
  where clicked or dismissed;

-- -------------------------------------------------------------
-- 4. RLS
--
-- Ingen insert- eller delete-policy: raderna skapas bara av
-- Edge Functionen med service role, som går förbi RLS.
-- -------------------------------------------------------------
alter table public.daily_suggestions enable row level security;

drop policy if exists "Users read own suggestions"   on public.daily_suggestions;
drop policy if exists "Users update own suggestions" on public.daily_suggestions;

create policy "Users read own suggestions"
  on public.daily_suggestions for select
  using (auth.uid() = user_id);

create policy "Users update own suggestions"
  on public.daily_suggestions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 5. Cron — 05:00 UTC
--
-- = 07:00 svensk sommartid, 06:00 på vintern. cron.timezone går inte
-- att ändra på hostad Supabase (se db/cron.sql), så tidpunkten driver
-- en timme över vinterhalvåret precis som sync-fixtures gör.
--
-- Kräver att db/cron.sql redan körts (pg_cron, pg_net, vault-nyckeln
-- och public.call_edge_function).
-- -------------------------------------------------------------
select cron.unschedule('generate-daily-suggestions')
  where exists (select 1 from cron.job where jobname = 'generate-daily-suggestions');

select cron.schedule(
  'generate-daily-suggestions',
  '0 5 * * *',
  $$select public.call_edge_function('generate-daily-suggestions', 120000);$$
);

-- =============================================================
-- Kontroll:
--   select * from public.get_user_betting_profile('<user-uuid>');
--   select suggestion_date, count(*) from public.daily_suggestions
--   group by 1 order by 1 desc;
-- =============================================================
