-- Planket: trådsvar + body-constraint för bild-only (feedback prompt 17)
-- Kör efter db/planket.sql
--
-- image_url-kolumnen och flödesvyn ligger i planket.sql. Den här filen
-- utökar constraintet (bild räcker som bilaga) och lägger till replies.

alter table public.posts
  add column if not exists image_url text;

comment on column public.posts.image_url is
  'Valfri bildbilaga (Storage-URL). Fristående från bet/coupon.';

alter table public.posts drop constraint if exists posts_body_or_attachment;
alter table public.posts
  add constraint posts_body_or_attachment check (
    deleted_at is not null
    or length(btrim(coalesce(body, ''))) > 0
    or attachment_type <> 'none'
    or image_url is not null
  );

create table if not exists public.post_replies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) > 0 and char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists post_replies_post_idx
  on public.post_replies (post_id, created_at asc);

alter table public.post_replies enable row level security;

drop policy if exists "planket replies läsbara" on public.post_replies;
create policy "planket replies läsbara" on public.post_replies
  for select to authenticated using (true);

drop policy if exists "skriv eget reply" on public.post_replies;
create policy "skriv eget reply" on public.post_replies
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "ändra eget reply" on public.post_replies;
create policy "ändra eget reply" on public.post_replies
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "radera eget reply" on public.post_replies;
create policy "radera eget reply" on public.post_replies
  for delete to authenticated
  using (author_id = auth.uid());

-- Flödesvyn med image_url skapas i db/planket.sql. Om den saknas
-- (äldre miljö där bara den här filen körts) återskapas den här.
-- CREATE OR REPLACE får inte ta bort kolumner — droppa först.
drop view if exists public.planket_top_backed cascade;
drop view if exists public.planket_posts cascade;

create view public.planket_posts as
select
  p.id,
  p.author_id,
  p.body,
  p.attachment_type,
  p.bet_id,
  p.coupon_id,
  p.created_at,
  p.edited_at,

  au.username                       as author_username,
  au.avatar_url                     as author_avatar,

  st.sheet_id,
  st.sheet_name,
  st.bets_count                     as sheet_bets_count,
  st.settled_bets                   as sheet_settled_bets,
  st.roi                            as sheet_roi,

  b.match                           as bet_match,
  b.pick                            as bet_pick,
  b.odds                            as bet_odds,
  b.stake                           as bet_stake,
  b.result                          as bet_result,
  b.payout                          as bet_payout,
  b.sport                           as bet_sport,
  b.league                          as bet_league,
  b.league_id                       as bet_league_id,
  b.league_logo                     as bet_league_logo,
  b.placed_at                       as bet_placed_at,
  b.bookmaker_id                    as bet_bookmaker_id,
  bm.name                           as bet_bookmaker_name,
  bm.logo_url                       as bet_bookmaker_logo,

  f.fixture_id,
  f.kickoff,
  f.status                          as fixture_status,
  f.home_name,
  f.home_logo,
  f.home_team_id,
  f.away_name,
  f.away_logo,
  f.away_team_id,

  case
    when b.id is null or f.kickoff is null then false
    else coalesce(b.logged_before_kickoff, b.placed_at < f.kickoff)
  end                               as verified,

  coalesce(rc.fire_count, 0)        as fire_count,
  coalesce(rc.thumb_count, 0)       as thumb_count,
  coalesce(bc.back_count, 0)        as back_count,
  p.image_url
from public.posts p
join public.profiles au on au.id = p.author_id
left join public.bets b on b.id = p.bet_id
left join public.bookmakers bm on bm.id = b.bookmaker_id
left join public.fixtures f on f.fixture_id = b.fixture_id
left join public.planket_sheet_stats st on st.sheet_id = coalesce(
  b.sheet_id,
  (select s2.id from public.sheets s2
    where s2.user_id = p.author_id
    order by s2.created_at, s2.id
    limit 1)
)
left join public.post_reaction_counts rc on rc.post_id = p.id
left join public.post_back_counts bc on bc.post_id = p.id
where p.deleted_at is null
  and p.hidden_at is null;

revoke all on public.planket_posts from anon;
grant select on public.planket_posts to authenticated;

-- planket_top_backed droppades med cascade — återskapa (samma som planket.sql).
create view public.planket_top_backed as
select
  v.id                as post_id,
  v.bet_id,
  v.bet_league        as league,
  v.bet_league_id     as league_id,
  v.bet_league_logo   as league_logo,
  v.bet_sport         as sport,
  v.bet_match         as match,
  v.bet_pick          as pick,
  v.bet_odds          as odds,
  v.author_username,
  count(pb.id)::int   as backed_today
from public.planket_posts v
join public.post_backs pb on pb.post_id = v.id
where v.attachment_type = 'bet'
  and pb.created_at >= date_trunc('day', now() at time zone 'Europe/Stockholm')
                       at time zone 'Europe/Stockholm'
group by v.id, v.bet_id, v.bet_league, v.bet_league_id, v.bet_league_logo,
         v.bet_sport, v.bet_match, v.bet_pick, v.bet_odds, v.author_username
order by count(pb.id) desc, v.bet_odds desc;

revoke all on public.planket_top_backed from anon;
grant select on public.planket_top_backed to authenticated;
