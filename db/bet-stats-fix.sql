-- =============================================================
-- SPELBOK — rättning av get_bet_stats (Medelvinst)
-- Kör i Supabase SQL Editor efter db/bet-stats.sql.
--
-- Medelvinst var (vunnet + forlorat) / vinster, alltså totalt netto delat
-- med antal vinster. Det blandar in förlusterna och kan bli negativt.
-- Nu: vunnet / vinster = snittvinst per vinnande spel. Samma definition som
-- JS-fallbacken computeBetStatsFromRows i src/lib/bet-stats.ts.
-- =============================================================

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
      then round(a.vunnet / a.vinster, 2)
      else 0 end
  )
  into v_result
  from agg a;

  return v_result;
end;
$$;

grant execute on function public.get_bet_stats(uuid, timestamptz, timestamptz, numeric) to authenticated;
