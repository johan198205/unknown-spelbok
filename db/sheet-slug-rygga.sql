-- =============================================================
-- SPELBOK — Sheet slug (delbar URL) + Rygga-spel provenance
-- Kör i Supabase SQL Editor.
-- =============================================================

-- Kort URL-säker slug (stabil även om namnet ändras)
alter table public.sheets
  add column if not exists slug text;

create unique index if not exists sheets_slug_uidx
  on public.sheets (slug)
  where slug is not null;

-- Backfill befintliga sheets utan slug
update public.sheets
set slug = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
where slug is null;

alter table public.sheets
  alter column slug set not null;

-- Default för nya inserts (klienten kan också skicka egen slug)
alter table public.sheets
  alter column slug set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

comment on column public.sheets.slug is
  'Stabil, URL-säker delbar identifierare (t.ex. /s/{slug}).';

-- Provenance för ryggade spel
alter table public.bets
  add column if not exists copied_from_bet_id uuid references public.bets(id) on delete set null;

alter table public.bets
  add column if not exists copied_from_user_id uuid;

comment on column public.bets.copied_from_bet_id is
  'Källspel vid rygg. Null om spelet skapades manuellt.';
comment on column public.bets.copied_from_user_id is
  'Ägare av källspelet vid rygg (för framtida notiser/statistik).';

-- Ett ryggat källspel får bara finnas en gång per målspelbok
create unique index if not exists bets_rygga_dedup_uidx
  on public.bets (copied_from_bet_id, sheet_id)
  where copied_from_bet_id is not null;

-- RLS: publika sheets/bets (säkerställ om tidigare migration saknas)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sheets' and policyname = 'publika sheets'
  ) then
    create policy "publika sheets" on public.sheets
      for select using (is_public = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bets' and policyname = 'publika bets'
  ) then
    create policy "publika bets" on public.bets for select using (
      exists (select 1 from public.sheets s where s.id = sheet_id and s.is_public)
    );
  end if;
end $$;

-- Leaderboard inkl. slug för delbara länkar
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

grant execute on function public.get_public_sheets_leaderboard(int, uuid) to authenticated, anon;

notify pgrst, 'reload schema';
