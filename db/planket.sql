-- =============================================================
-- SPELBOK — Planket (community-flödet)
--
-- Fyra tabeller:
--   posts            ett inlägg, med eller utan bilaga
--   post_reactions   🔥 och 👍, en rad per användare, inlägg och sort
--   post_backs       ryggningar, en rad per användare och inlägg
--   post_reports     anmälningar, fem döljer inlägget i väntan på granskning
--
-- Två saker räknas ALDRIG i klienten och kan aldrig sättas för hand:
--   VERIFIERAD  — bets.placed_at < fixtures.kickoff, härlett i vyn
--                 planket_posts (och redan låst i kolumnen
--                 bets.logged_before_kickoff, se db/logged-before-kickoff.sql)
--   RÄKNARNA    — reaktioner och ryggningar aggregeras i vyer, inte i
--                 räknarkolumner som driftar isär vid samtidiga skrivningar
--
-- Kör hela filen i Supabase SQL Editor. Allt är idempotent.
-- Kräver: supabase-schema.sql, db/notifications.sql, db/coupons.sql,
--         db/logged-before-kickoff.sql, db/sheet-slug-rygga.sql
-- =============================================================

-- -------------------------------------------------------------
-- 1. POSTS
--
-- Bilagan är antingen ett spel eller en kupong, aldrig båda och aldrig
-- fel sort. Två constraints i stället för en: den första binder typen
-- till rätt kolumn, den andra hindrar ett tomt inlägg utan bilaga.
--
-- deleted_at i stället för delete: reaktioner och ryggningar i
-- historiken behåller sin referens. hidden_at är moderering (steg 6) och
-- är något annat än författarens egen radering.
-- -------------------------------------------------------------
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null default '',
  attachment_type text not null default 'none'
                  check (attachment_type in ('none', 'bet', 'coupon')),
  bet_id          uuid references public.bets(id) on delete set null,
  coupon_id       uuid references public.coupons(id) on delete set null,
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz,
  hidden_at       timestamptz,

  -- 500 tecken, samma gräns som teckenräknaren i composern. char_length,
  -- inte octet_length: "Frölunda" är åtta tecken, inte tio.
  constraint posts_body_len check (char_length(body) <= 500),

  -- Typen styr vilken kolumn som får vara satt. 'none' kräver att båda
  -- är null, så ett inlägg aldrig kan bära två bilagor.
  constraint posts_attachment_shape check (
    (attachment_type = 'bet'    and bet_id is not null and coupon_id is null) or
    (attachment_type = 'coupon' and coupon_id is not null and bet_id is null) or
    (attachment_type = 'none'   and bet_id is null and coupon_id is null)
  ),

  -- Tom brödtext är bara tillåtet när det finns något att titta på.
  -- Undantaget för raderat behövs i steg 4b: när källspelet försvinner
  -- nollas bilagan, och ett redan raderat inlägg ska inte hindra det.
  constraint posts_body_or_attachment check (
    deleted_at is not null
    or length(btrim(body)) > 0
    or attachment_type <> 'none'
  )
);

-- Flödet sorterar på created_at desc och hoppar över raderat.
create index if not exists posts_feed_idx
  on public.posts (created_at desc)
  where deleted_at is null;

create index if not exists posts_author_idx
  on public.posts (author_id, created_at desc);

-- "Redan postad" i bifoga-väljaren: ett spel får bara ligga i ett levande
-- inlägg. Partiellt unikt index — raderade inlägg frigör spelet igen.
create unique index if not exists posts_bet_uidx
  on public.posts (bet_id)
  where bet_id is not null and deleted_at is null;

comment on table public.posts is
  'Ett inlägg på Planket. Raderas aldrig hårt — deleted_at sätts så reaktioner och ryggningar behåller sin referens.';
comment on column public.posts.attachment_type is
  'none | bet | coupon. Styr vilken av bet_id och coupon_id som får vara satt — aldrig båda.';
comment on column public.posts.hidden_at is
  'Moderering: satt av trigger vid fem anmälningar eller för hand i adminpanelen. Skilt från författarens deleted_at.';

-- -------------------------------------------------------------
-- 2. POST_REACTIONS
--
-- Primärnyckeln gör jobbet: en användare kan ge både 🔥 och 👍 på samma
-- inlägg, men aldrig samma reaktion två gånger. Ingen räknarkolumn — se
-- vyn i steg 5.
-- -------------------------------------------------------------
create table if not exists public.post_reactions (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('fire', 'thumb')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

create index if not exists post_reactions_user_idx
  on public.post_reactions (user_id, created_at desc);

comment on table public.post_reactions is
  'En rad per användare, inlägg och sort. Antalet räknas i vyn post_reaction_counts.';

-- -------------------------------------------------------------
-- 3. POST_BACKS
--
-- bet_id pekar på den NYSKAPADE raden i ryggarens spelbok, inte på
-- källspelet. Källan finns redan i bets.copied_from_bet_id.
--
-- Det unika indexet är det som faktiskt nekar en andra ryggning. Den
-- gråade knappen i flödet är bekvämlighet, inte skydd.
-- -------------------------------------------------------------
create table if not exists public.post_backs (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  bet_id     uuid references public.bets(id) on delete set null,
  stake      numeric(12,2) not null check (stake > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists post_backs_post_user_uidx
  on public.post_backs (post_id, user_id);

create index if not exists post_backs_post_idx
  on public.post_backs (post_id);

create index if not exists post_backs_created_idx
  on public.post_backs (created_at desc);

comment on table public.post_backs is
  'En ryggning. bet_id är den nya raden i ryggarens spelbok — källspelet ligger i bets.copied_from_bet_id.';

-- -------------------------------------------------------------
-- 4. BETS.SOURCE_POST_ID
--
-- Spelet vet vilket inlägg det kom ifrån. Skilt från source_coupon_id
-- (redaktionens kuponger) och copied_from_bet_id (spel ur en publik
-- spelbok) — tre olika vägar in, tre olika härkomster att kunna följa.
-- -------------------------------------------------------------
alter table public.bets
  add column if not exists source_post_id uuid references public.posts(id) on delete set null;

create index if not exists bets_source_post_idx
  on public.bets (source_post_id)
  where source_post_id is not null;

comment on column public.bets.source_post_id is
  'Inlägget på Planket som spelet ryggades från. Null för spel som lagts på annat sätt.';

-- -------------------------------------------------------------
-- 4b. NÄR BILAGAN FÖRSVINNER
--
-- Raderar författaren spelet ur sin spelbok finns inget kvar att visa.
-- Foreign key on delete set null räcker inte: attachment_type = 'bet'
-- kräver ett bet_id, så nollningen skulle bryta mot constraintet och
-- raderingen av spelet fastna.
--
-- Triggern kör FÖRE raderingen, gör inlägget till en soft delete och
-- nollar bilagan. Reaktioner och ryggningar ligger kvar med sin
-- referens — det är hela poängen med soft delete.
-- -------------------------------------------------------------
create or replace function public.posts_detach_on_source_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'bets' then
    update public.posts
    set deleted_at      = coalesce(deleted_at, now()),
        attachment_type = 'none',
        bet_id          = null
    where bet_id = old.id;
  else
    update public.posts
    set deleted_at      = coalesce(deleted_at, now()),
        attachment_type = 'none',
        coupon_id       = null
    where coupon_id = old.id;
  end if;
  return old;
end $$;

drop trigger if exists bets_detach_posts on public.bets;
create trigger bets_detach_posts
  before delete on public.bets
  for each row execute function public.posts_detach_on_source_delete();

drop trigger if exists coupons_detach_posts on public.coupons;
create trigger coupons_detach_posts
  before delete on public.coupons
  for each row execute function public.posts_detach_on_source_delete();

-- -------------------------------------------------------------
-- 5. RÄKNARVYER
--
-- Aggregat, inte kolumner. En räknarkolumn kräver en trigger som ökar
-- och minskar den, och den driftar första gången två klick landar i
-- samma millisekund eller en cascade-radering går förbi triggern.
-- -------------------------------------------------------------
create or replace view public.post_reaction_counts as
select
  post_id,
  count(*) filter (where kind = 'fire')::int  as fire_count,
  count(*) filter (where kind = 'thumb')::int as thumb_count
from public.post_reactions
group by post_id;

create or replace view public.post_back_counts as
select post_id, count(*)::int as back_count
from public.post_backs
group by post_id;

comment on view public.post_reaction_counts is
  'Antal 🔥 och 👍 per inlägg. Räkna aldrig reaktioner i klienten eller i en räknarkolumn.';

-- -------------------------------------------------------------
-- 6. SPELBOKSSTATISTIK — underlaget till ROI-badgen
--
-- Badgen hör till FÖRFATTARENS SPELBOK, inte till inlägget. Ett inlägg
-- kan inte ha en ROI; en spelbok kan.
--
-- settled_bets följer med ut så klienten kan tillämpa 20-spelsgränsen
-- utan ett andra anrop. Gränsen finns för att en ROI på fem spel säger
-- ingenting — se PLANKET_MIN_ROI_BETS i src/lib/planket.ts.
--
-- Bara aggregat lämnar vyn: namn, antal och ROI. Enskilda spel i en
-- privat spelbok syns fortfarande bara via det spel som faktiskt postats.
-- -------------------------------------------------------------
create or replace view public.planket_sheet_stats as
select
  s.id                                                        as sheet_id,
  s.user_id,
  s.name                                                      as sheet_name,
  count(b.id)::int                                            as bets_count,
  count(b.id) filter (where b.result <> 'open')::int           as settled_bets,
  case
    when coalesce(sum(b.stake) filter (where b.result <> 'open'), 0) > 0
    then round(
      sum(b.payout - b.stake) filter (where b.result <> 'open')
      / sum(b.stake) filter (where b.result <> 'open') * 100
    , 1)
    else 0
  end                                                          as roi
from public.sheets s
left join public.bets b on b.sheet_id = s.id
group by s.id, s.user_id, s.name;

comment on view public.planket_sheet_stats is
  'Aggregat per spelbok: namn, antal spel, rättade spel och ROI. Underlag till ROI-badgen på Planket.';

-- -------------------------------------------------------------
-- 7. PLANKET_POSTS — det flödet faktiskt läser
--
-- Vyn bär spelets fält. Det är avsiktligt: ett spel ur en PRIVAT
-- spelbok som postas blir synligt just för det spelet, medan resten av
-- boken förblir bakom RLS på bets. Utan vyn hade ett postat spel varit
-- osynligt för alla utom författaren.
--
-- verified beräknas HÄR:
--   logged_before_kickoff sätts av triggern vid insert och är immutabel
--   (db/logged-before-kickoff.sql). Saknas den — spel från före den
--   migrationen — faller vi tillbaka på placed_at < kickoff. Utan
--   fixture finns ingen avspark att jämföra mot, och då finns ingen badge.
--
-- Vyn kör som ägare (postgres), inte som anroparen: det är den som gör
-- det postade spelet läsbart. Filtret nedan är därför hela skyddet —
-- raderat och dolt lämnar aldrig vyn.
-- -------------------------------------------------------------
create or replace view public.planket_posts as
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

  -- Spelboken i huvudet: bilagans bok när det finns en bilaga, annars
  -- författarens äldsta bok. Samma bok som ROI-badgen räknas på.
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

  -- Aldrig ett skrivbart fält. Aldrig klienten.
  case
    when b.id is null or f.kickoff is null then false
    else coalesce(b.logged_before_kickoff, b.placed_at < f.kickoff)
  end                               as verified,

  coalesce(rc.fire_count, 0)        as fire_count,
  coalesce(rc.thumb_count, 0)       as thumb_count,
  coalesce(bc.back_count, 0)        as back_count
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

comment on view public.planket_posts is
  'Flödet på Planket. Bär det postade spelets fält så ett spel ur en privat spelbok syns just för det spelet — resten av boken förblir privat.';

-- Bara inloggade. Vyn kör som ägare och går förbi RLS på bets — utan
-- den här begränsningen hade en utloggad kunnat läsa postade spel ur
-- privata spelböcker via PostgREST.
revoke all on public.planket_posts        from anon;
revoke all on public.planket_sheet_stats  from anon;
revoke all on public.post_reaction_counts from anon;
revoke all on public.post_back_counts     from anon;

grant select on public.planket_posts        to authenticated;
grant select on public.planket_sheet_stats  to authenticated;
grant select on public.post_reaction_counts to authenticated;
grant select on public.post_back_counts     to authenticated;

-- -------------------------------------------------------------
-- 8. MEST RYGGADE IDAG — högerkolumnens första kort
-- -------------------------------------------------------------
create or replace view public.planket_top_backed as
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

comment on view public.planket_top_backed is
  'Mest ryggade spel i dag (svensk dygnsgräns). Underlag till högerkolumnen.';

-- -------------------------------------------------------------
-- 8b. AKTIVA JUST NU
--
-- Aktivitet PÅ PLANKET den senaste timmen — inte profiles.last_seen_at,
-- som bara skrivs en gång i timmen och därför visar "aktiv nu" för den
-- som stängde fliken för 59 minuter sedan.
-- -------------------------------------------------------------
create or replace view public.planket_active_users as
select
  p.id,
  p.username,
  p.avatar_url,
  max(a.at) as last_active_at
from (
  select author_id as user_id, created_at as at from public.posts
    where created_at > now() - interval '1 hour' and deleted_at is null
  union all
  select user_id, created_at from public.post_reactions
    where created_at > now() - interval '1 hour'
  union all
  select user_id, created_at from public.post_backs
    where created_at > now() - interval '1 hour'
) a
join public.profiles p on p.id = a.user_id
where coalesce(p.banned, false) = false
group by p.id, p.username, p.avatar_url
order by max(a.at) desc;

revoke all on public.planket_active_users from anon;
grant select on public.planket_active_users to authenticated;

comment on view public.planket_active_users is
  'Användare som postat, reagerat eller ryggat på Planket den senaste timmen.';

-- -------------------------------------------------------------
-- 9. POST_REPORTS — anmälningar
-- -------------------------------------------------------------
create table if not exists public.post_reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null
              check (reason in ('spam', 'offensive', 'misleading', 'bad_link')),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz
);

-- Samma person anmäler samma inlägg en gång. Utan det här räcker det med
-- fem klick från ett konto för att dölja vilket inlägg som helst.
create unique index if not exists post_reports_post_reporter_uidx
  on public.post_reports (post_id, reporter_id);

create index if not exists post_reports_open_idx
  on public.post_reports (created_at desc)
  where handled_at is null;

comment on table public.post_reports is
  'Anmälningar. Fem olika anmälare på samma inlägg döljer det automatiskt i väntan på granskning.';

-- Adminvyn: ett anmält inlägg per rad, med anledningarna samlade.
create or replace view public.planket_reported_posts as
select
  p.id                                     as post_id,
  p.body,
  p.attachment_type,
  p.created_at,
  p.hidden_at,
  p.deleted_at,
  p.author_id,
  au.username                              as author_username,
  coalesce(au.banned, false)               as author_banned,
  count(r.id)::int                         as report_count,
  count(r.id) filter (where r.handled_at is null)::int as open_reports,
  array_agg(distinct r.reason)             as reasons,
  max(r.created_at)                        as last_reported_at
from public.post_reports r
join public.posts p     on p.id = r.post_id
join public.profiles au on au.id = p.author_id
group by p.id, p.body, p.attachment_type, p.created_at, p.hidden_at,
         p.deleted_at, p.author_id, au.username, au.banned
order by count(r.id) filter (where r.handled_at is null) desc,
         max(r.created_at) desc;

revoke all on public.planket_reported_posts from anon, authenticated;

comment on view public.planket_reported_posts is
  'Anmälda inlägg för /admin/planket. Läses med service role — aldrig direkt från klienten.';

-- -------------------------------------------------------------
-- 10. FEM ANMÄLNINGAR DÖLJER INLÄGGET
--
-- Trigger, inte klientlogik: gränsen ska hålla oavsett om anmälan kommer
-- från flödet, adminpanelen eller ett skript. Redaktionen får en notis
-- samtidigt, en per inlägg tack vare dedupe-nyckeln.
-- -------------------------------------------------------------
create or replace function public.post_reports_autohide()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_body  text;
begin
  select count(*) into v_count
  from public.post_reports
  where post_id = new.post_id;

  if v_count >= 5 then
    update public.posts
    set hidden_at = now()
    where id = new.post_id and hidden_at is null;

    if found then
      select left(coalesce(nullif(btrim(body), ''), '(inlägg utan text)'), 80)
        into v_body
      from public.posts where id = new.post_id;

      insert into public.notifications
        (user_id, type, title, body, dedupe_key, target_type, target_id, href)
      select
        pr.id,
        'post_report',
        'Inlägg dolt efter fem anmälningar',
        v_body,
        'post_report:' || new.post_id::text,
        null,
        null,
        '/admin/planket'
      from public.profiles pr
      where pr.role = 'admin'
      on conflict (user_id, dedupe_key) do nothing;
    end if;
  end if;

  return null;
end $$;

drop trigger if exists post_reports_autohide_trg on public.post_reports;
create trigger post_reports_autohide_trg
  after insert on public.post_reports
  for each row execute function public.post_reports_autohide();

-- -------------------------------------------------------------
-- 11. RATE LIMIT — på servern, inte i klienten
--
-- Max 10 inlägg och 60 reaktioner per användare och rullande timme.
-- Två triggers i stället för en kontroll i server-actionen: gränsen ska
-- hålla även för den som pratar med PostgREST direkt.
--
-- Felet bär antalet minuter kvar i meddelandet så UI:t kan skriva
-- "Försök igen om {n} minuter" utan ett extra anrop. Se
-- parseRateLimit() i src/lib/planket.ts.
-- -------------------------------------------------------------
create or replace function public.planket_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit   int;
  v_count   int;
  v_oldest  timestamptz;
  v_minutes int;
begin
  if tg_table_name = 'posts' then
    v_limit := 10;
    select count(*), min(created_at) into v_count, v_oldest
    from public.posts
    where author_id = new.author_id
      and created_at > now() - interval '1 hour';
  else
    v_limit := 60;
    select count(*), min(created_at) into v_count, v_oldest
    from public.post_reactions
    where user_id = new.user_id
      and created_at > now() - interval '1 hour';
  end if;

  if v_count >= v_limit then
    -- Minuter tills den äldsta raden i fönstret faller ut. Alltid minst 1
    -- så meddelandet aldrig säger "om 0 minuter".
    v_minutes := greatest(
      1,
      ceil(extract(epoch from (v_oldest + interval '1 hour' - now())) / 60)::int
    );
    raise exception 'planket_rate_limit:%', v_minutes
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists posts_rate_limit on public.posts;
create trigger posts_rate_limit
  before insert on public.posts
  for each row execute function public.planket_rate_limit();

drop trigger if exists post_reactions_rate_limit on public.post_reactions;
create trigger post_reactions_rate_limit
  before insert on public.post_reactions
  for each row execute function public.planket_rate_limit();

-- -------------------------------------------------------------
-- 12. BILAGAN MÅSTE VARA EGEN
--
-- RLS på insert kan kolla author_id = auth.uid(), men inte att bet_id
-- pekar på ett spel i en spelbok användaren äger — det kräver en
-- uppslagning. Triggern gör den, och gäller även för service role.
-- -------------------------------------------------------------
create or replace function public.posts_check_attachment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
begin
  if new.bet_id is not null then
    select s.user_id into v_owner
    from public.bets b
    join public.sheets s on s.id = b.sheet_id
    where b.id = new.bet_id;

    if v_owner is null then
      raise exception 'Spelet finns inte.' using errcode = 'check_violation';
    end if;
    if v_owner <> new.author_id then
      raise exception 'Du kan bara bifoga spel ur dina egna spelböcker.'
        using errcode = 'check_violation';
    end if;
  end if;

  if new.coupon_id is not null then
    if not exists (
      select 1 from public.coupons c
      where c.id = new.coupon_id and c.published_at <= now()
    ) then
      raise exception 'Kupongen finns inte.' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists posts_check_attachment_trg on public.posts;
create trigger posts_check_attachment_trg
  before insert or update of bet_id, coupon_id on public.posts
  for each row execute function public.posts_check_attachment();

-- -------------------------------------------------------------
-- 13. RLS
-- -------------------------------------------------------------
alter table public.posts          enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_backs     enable row level security;
alter table public.post_reports   enable row level security;

-- Läsning: alla inloggade, allt som inte är raderat. Dolda inlägg ligger
-- kvar synliga för sin författare — den som blivit anmäld ska kunna se
-- vad som hänt med sitt inlägg i stället för att det tyst försvinner.
drop policy if exists "planket läsbart" on public.posts;
create policy "planket läsbart" on public.posts
  for select to authenticated
  using (deleted_at is null and (hidden_at is null or author_id = auth.uid()));

drop policy if exists "admin läser alla inlägg" on public.posts;
create policy "admin läser alla inlägg" on public.posts
  for select using (public.is_admin());

drop policy if exists "skriv eget inlägg" on public.posts;
create policy "skriv eget inlägg" on public.posts
  for insert to authenticated with check (author_id = auth.uid());

-- Update täcker både redigering och soft delete. with check håller kvar
-- raden hos ägaren — author_id går inte att skriva om till någon annan.
drop policy if exists "ändra eget inlägg" on public.posts;
create policy "ändra eget inlägg" on public.posts
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "admin modererar inlägg" on public.posts;
create policy "admin modererar inlägg" on public.posts
  for update using (public.is_admin()) with check (public.is_admin());

-- Reaktioner: alla inloggade läser, var och en sköter sina egna.
drop policy if exists "reaktioner läsbara" on public.post_reactions;
create policy "reaktioner läsbara" on public.post_reactions
  for select to authenticated using (true);

drop policy if exists "egen reaktion" on public.post_reactions;
create policy "egen reaktion" on public.post_reactions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "ta bort egen reaktion" on public.post_reactions;
create policy "ta bort egen reaktion" on public.post_reactions
  for delete to authenticated using (user_id = auth.uid());

-- Ryggningar: räknaren "Ryggat av {n}" är publik, raden är din egen.
drop policy if exists "ryggningar läsbara" on public.post_backs;
create policy "ryggningar läsbara" on public.post_backs
  for select to authenticated using (true);

drop policy if exists "egen ryggning" on public.post_backs;
create policy "egen ryggning" on public.post_backs
  for insert to authenticated with check (user_id = auth.uid());

-- Anmälningar: skriv din egen, läs ingen annans. Redaktionen läser allt.
drop policy if exists "egen anmälan" on public.post_reports;
create policy "egen anmälan" on public.post_reports
  for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "se egen anmälan" on public.post_reports;
create policy "se egen anmälan" on public.post_reports
  for select to authenticated using (reporter_id = auth.uid());

drop policy if exists "admin läser anmälningar" on public.post_reports;
create policy "admin läser anmälningar" on public.post_reports
  for all using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- 14. NOTISER — tre nya typer
--
--   back         någon ryggade ditt spel        dedupe back:{post_back_id}
--   reaction     samlad per inlägg och timme    dedupe reaction:{post_id}:{timme}
--   post_report  fem anmälningar, till redaktionen
--
-- Reaktionsnotisen är den enda i appen som SKRIVS OM: dedupe-nyckeln
-- håller den till en rad per inlägg och timme, och titeln uppdateras när
-- fler reagerar ("3 personer reagerade på ditt inlägg"). Se
-- notifyPostReaction() i src/lib/planket-notify.ts.
-- -------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'goal','settled_win','settled_loss','coupon','competition','kickoff',
    'popup','back','reaction','post_report'
  ));

alter table public.notifications drop constraint if exists notifications_target_type_check;
alter table public.notifications add constraint notifications_target_type_check
  check (target_type in ('sheet','comp','coupon','bet','post'));

-- Sjunde kategorin i inställningarna. Mejl av som default: Planket är ett
-- flöde man besöker, inte något att bli mejlad om per reaktion.
alter table public.notification_settings
  add column if not exists planket_in_app boolean not null default true,
  add column if not exists planket_email  boolean not null default false;

notify pgrst, 'reload schema';

-- =============================================================
-- KLART. Kontrollera:
--   select count(*) from public.planket_posts;
--   select * from public.planket_top_backed limit 3;
--
-- Att ett inlägg aldrig kan bära två bilagor:
--   insert into public.posts (author_id, body, attachment_type, bet_id, coupon_id)
--   values (auth.uid(), 'test', 'bet', '<bet>', '<coupon>');   -- ska faila
--
-- Att samma inlägg bara ryggas en gång:
--   insert into public.post_backs (post_id, user_id, stake)
--   values ('<post>', auth.uid(), 100);                        -- andra ska faila
-- =============================================================
