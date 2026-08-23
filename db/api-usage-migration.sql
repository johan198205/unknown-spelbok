-- =============================================================
-- SPELBOK — Migrering: API-förbrukning (api-sports)
-- Kör i Supabase SQL Editor EFTER db/apisports-migration.sql.
--
-- API-Sports sparar ingen historik: kvoten i deras dashboard är
-- bara "just nu". Därför loggar vi varje anrop själva — både de
-- som gick ut på nätet och de som serverades ur cachen — så
-- /admin/api-usage kan visa förbrukning över tid.
--
-- Tabellen är service role-only: Edge Functions och Next.js
-- skriver, adminsidan läser via service role. RLS är på och
-- helt utan policy, så anon/authenticated ser ingenting.
-- =============================================================

-- -------------------------------------------------------------
-- 1. LOGGTABELL
-- -------------------------------------------------------------
create table if not exists public.api_request_log (
  id                 bigint generated always as identity primary key,
  created_at         timestamptz not null default now(),
  provider           text not null,              -- 'api-football' | 'api-hockey'
  endpoint           text not null,              -- t.ex. '/fixtures', '/odds'
  params             jsonb,                      -- query-parametrar (aldrig API-nyckeln)
  status_code        int,
  cache_hit          boolean not null default false,  -- true = serverad ur cache, ingen extern request
  requests_remaining int,                        -- header x-ratelimit-requests-remaining
  requests_limit     int,                        -- header x-ratelimit-requests-limit
  response_time_ms   int
);

create index if not exists idx_api_log_created
  on public.api_request_log (created_at);
create index if not exists idx_api_log_provider
  on public.api_request_log (provider, created_at);

-- Kvotkorten läser senaste raden med kvotheaders per provider.
create index if not exists idx_api_log_quota
  on public.api_request_log (provider, created_at desc)
  where requests_remaining is not null;

-- RLS på, noll policies: bara service role kommer åt tabellen.
alter table public.api_request_log enable row level security;

-- -------------------------------------------------------------
-- 2. get_api_usage — all aggregering i SQL
--    Anropas med service role från /api/admin/api-usage.
--
--    p_group_by: 'day' (default) eller 'hour'. Buckets skapas i
--    svensk tid och gap-fylls, så grafen får en stapel per dygn
--    respektive timme även när inget loggades.
-- -------------------------------------------------------------
create or replace function public.get_api_usage(
  p_from timestamptz,
  p_to timestamptz,
  p_provider text default null,
  p_group_by text default 'day'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_unit text := case when p_group_by = 'hour' then 'hour' else 'day' end;
  v_step interval := case when p_group_by = 'hour' then interval '1 hour' else interval '1 day' end;
  v_fmt text := case when p_group_by = 'hour' then 'YYYY-MM-DD"T"HH24:00' else 'YYYY-MM-DD' end;
  v_result jsonb;
begin
  with filtered as (
    select
      l.endpoint,
      l.cache_hit,
      l.status_code,
      l.response_time_ms,
      date_trunc(v_unit, l.created_at at time zone 'Europe/Stockholm') as bucket
    from public.api_request_log l
    where l.created_at >= p_from
      and l.created_at < p_to
      and (p_provider is null or l.provider = p_provider)
  ),
  totals as (
    select
      count(*) filter (where not cache_hit)::bigint as external_requests,
      count(*) filter (where cache_hit)::bigint as cache_hits,
      count(*)::bigint as total_requests,
      count(*) filter (
        where not cache_hit and status_code is not null and status_code >= 400
      )::bigint as failed_requests,
      avg(response_time_ms) filter (where not cache_hit) as avg_response_ms
    from filtered
  ),
  buckets as (
    select generate_series(
      date_trunc(v_unit, p_from at time zone 'Europe/Stockholm'),
      date_trunc(v_unit, (p_to - interval '1 millisecond') at time zone 'Europe/Stockholm'),
      v_step
    ) as bucket
  ),
  series as (
    select
      b.bucket,
      -- cache_hit är NOT NULL i tabellen, så en tom bucket (left join utan
      -- träff) ger NULL och räknas varken som extern eller cache.
      count(*) filter (where f.cache_hit = false)::bigint as external_requests,
      count(*) filter (where f.cache_hit = true)::bigint as cache_hits
    from buckets b
    left join filtered f on f.bucket = b.bucket
    group by b.bucket
  ),
  endpoints as (
    select
      f.endpoint,
      count(*)::bigint as total_requests,
      count(*) filter (where not f.cache_hit)::bigint as external_requests,
      count(*) filter (where f.cache_hit)::bigint as cache_hits,
      avg(f.response_time_ms) filter (where not f.cache_hit) as avg_response_ms
    from filtered f
    group by f.endpoint
    order by count(*) desc, f.endpoint
    limit 10
  ),
  quota as (
    -- Senast kända kvotheaders per provider, oavsett vald period.
    select distinct on (l.provider)
      l.provider,
      l.requests_remaining,
      l.requests_limit,
      l.created_at
    from public.api_request_log l
    where l.requests_remaining is not null
      and l.created_at >= now() - interval '48 hours'
    order by l.provider, l.created_at desc
  ),
  today as (
    -- API-Sports nollställer dygnskvoten vid midnatt UTC.
    select
      l.provider,
      count(*) filter (where not l.cache_hit)::bigint as external_requests,
      count(*) filter (where l.cache_hit)::bigint as cache_hits
    from public.api_request_log l
    where l.created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
    group by l.provider
  )
  select jsonb_build_object(
    'group_by', v_unit,
    'from', p_from,
    'to', p_to,
    'provider', p_provider,
    'totals', jsonb_build_object(
      'external_requests', t.external_requests,
      'cache_hits', t.cache_hits,
      'total_requests', t.total_requests,
      'failed_requests', t.failed_requests,
      'avg_response_ms', case
        when t.avg_response_ms is null then null
        else round(t.avg_response_ms)::int
      end
    ),
    'series', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'bucket', to_char(s.bucket, v_fmt),
          'external_requests', s.external_requests,
          'cache_hits', s.cache_hits
        )
        order by s.bucket
      )
      from series s
    ), '[]'::jsonb),
    'endpoints', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'endpoint', e.endpoint,
          'total_requests', e.total_requests,
          'external_requests', e.external_requests,
          'cache_hits', e.cache_hits,
          'avg_response_ms', case
            when e.avg_response_ms is null then null
            else round(e.avg_response_ms)::int
          end,
          'share', case
            when t.total_requests > 0
              then round((e.total_requests::numeric / t.total_requests) * 100, 1)
            else 0
          end
        )
        order by e.total_requests desc
      )
      from endpoints e
    ), '[]'::jsonb),
    'quota', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'provider', q.provider,
          'requests_remaining', q.requests_remaining,
          'requests_limit', q.requests_limit,
          'recorded_at', q.created_at
        )
      )
      from quota q
    ), '[]'::jsonb),
    'today', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'provider', d.provider,
          'external_requests', d.external_requests,
          'cache_hits', d.cache_hits
        )
      )
      from today d
    ), '[]'::jsonb)
  )
  into v_result
  from totals t;

  return v_result;
end;
$$;

-- Funktionen läser hela loggen. Bara service role får köra den.
revoke all on function public.get_api_usage(timestamptz, timestamptz, text, text) from public;
grant execute on function public.get_api_usage(timestamptz, timestamptz, text, text) to service_role;
