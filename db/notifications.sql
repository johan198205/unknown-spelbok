-- =============================================================
-- SPELBOK — Notiser i appen (klockan i headern + sidopanelen)
--
-- Två tabeller:
--   notifications          en rad per händelse och användare
--   notification_settings  en rad per användare, två booleans per typ
--
-- Skiljs från push: push är ett utskick (sent_notifications håller reda
-- på vad som gått iväg), det här är en LÄSBAR historik som ligger kvar.
-- En användare som stänger av en typ behåller sina gamla notiser.
--
-- Kör hela filen i Supabase SQL Editor. Allt är idempotent.
-- =============================================================

-- -------------------------------------------------------------
-- 1. NOTIFICATIONS
--
-- dedupe_key är kärnan: samma händelse får aldrig ge två rader.
-- Nyckeln byggs deterministiskt i jobben (src/lib/notify-events.ts):
--   goal        goal:{bet_id}:{home}-{away}   ← ställningen ingår
--   settled_*   settle:{bet_id}
--   coupon      coupon:{coupon_id}
--   competition comp:{competition_id}:{placering}
--   kickoff     kickoff:{bet_id}
-- Insert körs som ON CONFLICT (user_id, dedupe_key) DO NOTHING, så ett
-- jobb kan köras om hur många gånger som helst utan att dubblera.
-- -------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         text not null
               check (type in ('goal','settled_win','settled_loss','coupon','competition','kickoff')),
  title        text not null,
  body         text not null default '',
  created_at   timestamptz not null default now(),
  read_at      timestamptz,                    -- null = oläst
  amount       numeric(12,2),
  amount_kind  text check (amount_kind in ('netto','roi')),
  target_type  text check (target_type in ('sheet','comp','coupon','bet')),
  target_id    uuid,
  dedupe_key   text not null
);

-- Unik per användare, inte globalt: alla som har spel på matchen ska få
-- sin egen rad för samma mål.
create unique index if not exists notifications_dedupe_uidx
  on public.notifications (user_id, dedupe_key);

-- Panelen hämtar 30 senaste per användare och sidbläddrar med .range().
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- Räknaren i headern: "antal olästa för mig". Partiellt index — lästa
-- rader är den stora massan och behöver inte ligga i det.
create index if not exists notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

-- Nattlig rensning (steg 6) går på ålder över alla användare.
create index if not exists notifications_created_idx
  on public.notifications (created_at);

comment on table public.notifications is
  'Notiser i appen. Läst-status ligger i read_at — rader raderas aldrig vid läsning.';
comment on column public.notifications.dedupe_key is
  'Deterministisk nyckel per händelse. Unik tillsammans med user_id.';
comment on column public.notifications.amount is
  'Belopp att visa i notisen, t.ex. nettot för ett rättat spel. Null när notisen saknar siffra.';
comment on column public.notifications.target_type is
  'Vart klicket leder: sheet | comp | coupon | bet. Se notificationHref().';

-- -------------------------------------------------------------
-- 2. RLS — bara sina egna rader
--
-- Ingen insert-policy: jobben skriver med service role, som går förbi
-- RLS. Klienten ska aldrig kunna skapa en notis åt sig själv.
-- -------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "egna notiser" on public.notifications;
create policy "egna notiser" on public.notifications
  for select using (auth.uid() = user_id);

-- Uppdateringen som klienten gör är read_at = now(). with check håller
-- kvar raden hos ägaren — user_id går inte att skriva om till någon annan.
drop policy if exists "markera egen notis läst" on public.notifications;
create policy "markera egen notis läst" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 3. REALTIME
--
-- Räknaren i headern prenumererar på INSERT och UPDATE där
-- user_id = auth.uid(). REPLICA IDENTITY DEFAULT (PK) räcker för
-- INSERT; UPDATE behöver FULL för att filtret user_id=eq.… ska
-- matcha på gamla raden när read_at skrivs.
-- -------------------------------------------------------------
alter table public.notifications replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

-- -------------------------------------------------------------
-- 4. NOTIFICATION_SETTINGS — per typ, per kanal
--
-- Fem kategorier (settled_win och settled_loss delar rad — "spel rättat"
-- är en sak att slå av), två kanaler var. Allt på utom mejl vid
-- tävlingsplacering, som är för lågt värde för att mejla oombedd.
-- -------------------------------------------------------------
create table if not exists public.notification_settings (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  goal_in_app       boolean not null default true,
  goal_email        boolean not null default true,
  kickoff_in_app    boolean not null default true,
  kickoff_email     boolean not null default true,
  settled_in_app    boolean not null default true,
  settled_email     boolean not null default true,
  coupon_in_app     boolean not null default true,
  coupon_email      boolean not null default true,
  competition_in_app boolean not null default true,
  competition_email boolean not null default false,
  updated_at        timestamptz not null default now()
);

comment on table public.notification_settings is
  'Per användare och typ: notis i appen respektive mejl. Gäller framåt — befintliga notiser ligger kvar.';

alter table public.notification_settings enable row level security;

drop policy if exists "egna notisinställningar" on public.notification_settings;
create policy "egna notisinställningar" on public.notification_settings
  for select using (auth.uid() = user_id);

drop policy if exists "spara egna notisinställningar" on public.notification_settings;
create policy "spara egna notisinställningar" on public.notification_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Raden skapas av triggern nedan, men användaren måste kunna skapa sin
-- egen om triggern lades till efter att kontot registrerades.
drop policy if exists "skapa egna notisinställningar" on public.notification_settings;
create policy "skapa egna notisinställningar" on public.notification_settings
  for insert with check (auth.uid() = user_id);

-- Defaults vid registrering. Hänger på profiles, inte auth.users:
-- handle_new_user() skapar profilen, och den här körs direkt efter.
create or replace function public.handle_new_notification_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_profile_created_notification_settings on public.profiles;
create trigger on_profile_created_notification_settings
  after insert on public.profiles
  for each row execute function public.handle_new_notification_settings();

-- Backfill för konton som redan finns.
insert into public.notification_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- -------------------------------------------------------------
-- 5. JOBBEN
--
-- Avspark och tävlingsplacering körs i Next.js (/api/internal/notify),
-- inte som Edge Functions: de rör bara egna tabeller och behöver noll
-- API-Football-anrop. Mål och rättning hänger redan på poll-live och
-- settle-results via samma rutt.
--
-- Två hemligheter i Vault (kör en gång, byt ut värdena):
--
--   select vault.create_secret('https://spelbok.se', 'site_url');
--   select vault.create_secret('<INTERNAL_NOTIFY_SECRET>', 'internal_notify_secret');
--
-- Uppdatera i stället om de redan finns:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'site_url'), 'https://…');
-- -------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

create or replace function public.call_site_notify(kind text, timeout_ms int default 55000)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  req_id bigint;
  site   text;
  key    text;
begin
  select decrypted_secret into site from vault.decrypted_secrets where name = 'site_url';
  select decrypted_secret into key  from vault.decrypted_secrets where name = 'internal_notify_secret';
  if site is null or key is null then
    raise notice 'call_site_notify: site_url eller internal_notify_secret saknas i Vault';
    return null;
  end if;

  select net.http_post(
    url     := rtrim(site, '/') || '/api/internal/notify',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || key
    ),
    body    := jsonb_build_object('kind', kind),
    timeout_milliseconds := timeout_ms
  ) into req_id;
  return req_id;
end;
$$;

revoke all on function public.call_site_notify(text, int) from public, anon, authenticated;

select cron.unschedule('notify-kickoff-var-5-min')
  where exists (select 1 from cron.job where jobname = 'notify-kickoff-var-5-min');
select cron.unschedule('notify-competition-nightly')
  where exists (select 1 from cron.job where jobname = 'notify-competition-nightly');
select cron.unschedule('notifications-retention')
  where exists (select 1 from cron.job where jobname = 'notifications-retention');

-- Avspark: fönstret är 15 minuter, var 5:e minut ger tre chanser att
-- träffa det även om ett anrop faller bort.
select cron.schedule(
  'notify-kickoff-var-5-min',
  '*/5 * * * *',
  $$select public.call_site_notify('kickoff');$$
);

-- Tävlingsplacering: 02:15 UTC. cron.timezone går inte att ändra på
-- hostad Supabase, så alla scheman här är UTC precis som i db/cron.sql.
select cron.schedule(
  'notify-competition-nightly',
  '15 2 * * *',
  $$select public.call_site_notify('competition');$$
);

-- -------------------------------------------------------------
-- 6. RETENTION — 90 dagar
--
-- Ren SQL, inget anrop ut. Notiser äldre än så har ingen som helst
-- historik kvar att bidra med; spelen finns i spelboken.
-- -------------------------------------------------------------
select cron.schedule(
  'notifications-retention',
  '40 3 * * *',
  $$delete from public.notifications where created_at < now() - interval '90 days';$$
);

notify pgrst, 'reload schema';

-- =============================================================
-- KLART. Kontrollera:
--   select jobname, schedule, active from cron.job where jobname like 'notif%';
--   select id, status_code, content, created from net._http_response
--     order by created desc limit 10;
--
-- Testa jobben för hand (samma nyckel som Edge Functions använder):
--   curl -i -X POST -H "Authorization: Bearer INTERNAL_NOTIFY_SECRET" \
--     -H "Content-Type: application/json" -d '{"kind":"kickoff"}' \
--     https://spelbok.se/api/internal/notify
-- =============================================================
