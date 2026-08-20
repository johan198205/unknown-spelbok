-- =============================================================
-- SPELBOK — Statistikpanel + bottensektion
-- Kör i Supabase SQL Editor.
-- =============================================================

-- Unit-storlek per användare (default 100 kr)
alter table public.profiles
  add column if not exists unit_size numeric(12,2) not null default 100
    check (unit_size > 0);

comment on column public.profiles.unit_size is
  '1 unit i kronor för Unitnetto-beräkning. Default 100.';

-- is_public finns redan i grundschemat; säkerställ RLS för publika sheets
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sheets' and policyname = 'publika sheets'
  ) then
    create policy "publika sheets" on public.sheets
      for select using (is_public = true);
  end if;
end $$;

-- -------------------------------------------------------------
-- get_bet_stats — alla nyckeltal för en sheet + tidsperiod
-- RLS: security invoker → endast egna / publika sheets
-- -------------------------------------------------------------
create or replace function public.get_bet_stats(
  p_sheet_id uuid,
  p_from_date timestamptz default null,
  p_to_date timestamptz default null,
  p_unit_size numeric default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_unit numeric(12,2);
  v_result jsonb;
begin
  select coalesce(p_unit_size, pr.unit_size, 100)
  into v_unit
  from public.sheets s
  join public.profiles pr on pr.id = s.user_id
  where s.id = p_sheet_id;

  if v_unit is null then
    return null;
  end if;

  if v_unit <= 0 then
    v_unit := 100;
  end if;

  with filtered as (
    select
      b.result,
      b.stake::numeric as stake,
      b.odds::numeric as odds,
      (b.payout - b.stake)::numeric as netto
    from public.bets b
    where b.sheet_id = p_sheet_id
      and (p_from_date is null or b.placed_at >= p_from_date)
      and (p_to_date is null or b.placed_at < p_to_date)
  ),
  agg as (
    select
      count(*)::int as antal_spel,
      count(*) filter (where result in ('win', 'halfwin'))::int as vinster,
      count(*) filter (where result in ('loss', 'halfloss'))::int as forluster,
      count(*) filter (where result = 'void')::int as void_count,
      count(*) filter (where result = 'open')::int as oppna_spel,
      coalesce(sum(stake) filter (where result = 'open'), 0) as oppen_risk,
      coalesce(sum(stake * (odds - 1)) filter (where result = 'open'), 0) as oppen_potentiell_vinst,
      coalesce(sum(stake) filter (where result <> 'open'), 0) as insats,
      coalesce(sum(netto) filter (where result <> 'open' and netto > 0), 0) as vunnet,
      coalesce(sum(netto) filter (where result <> 'open' and netto < 0), 0) as forlorat,
      coalesce(avg(odds) filter (where result <> 'open'), 0) as medelodds,
      coalesce(avg(stake) filter (where result <> 'open'), 0) as medelinsats
    from filtered
  )
  select jsonb_build_object(
    'antal_spel', a.antal_spel,
    'vinster', a.vinster,
    'forluster', a.forluster,
    'void', a.void_count,
    'oppna_spel', a.oppna_spel,
    'oppen_risk', round(a.oppen_risk, 2),
    'oppen_potentiell_vinst', round(a.oppen_potentiell_vinst, 2),
    'insats', round(a.insats, 2),
    'vunnet', round(a.vunnet, 2),
    'forlorat', round(a.forlorat, 2),
    'netto', round(a.vunnet + a.forlorat, 2),
    'roi', case when a.insats > 0
      then round((a.vunnet + a.forlorat) / a.insats * 100, 2)
      else 0 end,
    'unit_size', v_unit,
    'unitnetto', case when v_unit > 0
      then round((a.vunnet + a.forlorat) / v_unit, 2)
      else 0 end,
    'vinstprocent', case when (a.vinster + a.forluster) > 0
      then round(a.vinster::numeric / (a.vinster + a.forluster) * 100, 2)
      else 0 end,
    'medelodds', round(a.medelodds, 2),
    'medelinsats', round(a.medelinsats, 2),
    'medelvinst', case when a.vinster > 0
      then round((a.vunnet + a.forlorat) / a.vinster, 2)
      else 0 end
  )
  into v_result
  from agg a;

  return v_result;
end;
$$;

-- -------------------------------------------------------------
-- get_league_stats — topp N ligor efter netto (avgjorda spel)
-- -------------------------------------------------------------
create or replace function public.get_league_stats(
  p_sheet_id uuid,
  p_from_date timestamptz default null,
  p_to_date timestamptz default null,
  p_limit int default 5
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 5), 50));
begin
  if not exists (select 1 from public.sheets where id = p_sheet_id) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb)
    from (
      select
        coalesce(nullif(trim(b.league), ''), 'Övrigt') as league,
        count(*)::int as bets,
        round(sum(b.payout - b.stake)::numeric, 2) as netto
      from public.bets b
      where b.sheet_id = p_sheet_id
        and b.result <> 'open'
        and (p_from_date is null or b.placed_at >= p_from_date)
        and (p_to_date is null or b.placed_at < p_to_date)
      group by 1
      order by sum(b.payout - b.stake) desc
      limit v_limit
    ) t
  ), '[]'::jsonb);
end;
$$;

-- -------------------------------------------------------------
-- get_public_sheets_leaderboard — publika sheets med ≥10 avgjorda
-- -------------------------------------------------------------
create or replace function public.get_public_sheets_leaderboard(
  p_limit int default 5,
  p_exclude_user_id uuid default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 5), 50));
begin
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb)
    from (
      select
        s.id as sheet_id,
        s.name as sheet_name,
        s.slug as sheet_slug,
        p.username,
        count(b.id) filter (where b.result <> 'open')::int as settled_bets,
        case when coalesce(sum(b.stake) filter (where b.result <> 'open'), 0) > 0
          then round(
            sum(b.payout - b.stake) filter (where b.result <> 'open')
            / sum(b.stake) filter (where b.result <> 'open') * 100
          , 1)
          else 0 end as roi
      from public.sheets s
      join public.profiles p on p.id = s.user_id
      left join public.bets b on b.sheet_id = s.id
      where s.is_public = true
        and (p_exclude_user_id is null or s.user_id <> p_exclude_user_id)
        and coalesce(p.banned, false) = false
      group by s.id, s.name, s.slug, p.username
      having count(b.id) filter (where b.result <> 'open') >= 10
      order by roi desc nulls last
      limit v_limit
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_bet_stats(uuid, timestamptz, timestamptz, numeric) to authenticated;
grant execute on function public.get_league_stats(uuid, timestamptz, timestamptz, int) to authenticated;
grant execute on function public.get_public_sheets_leaderboard(int, uuid) to authenticated, anon;

notify pgrst, 'reload schema';
