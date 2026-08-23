-- =============================================================
-- SPELBOK — Migrering: dubbla push-notiser
--
-- Två lager:
--   1. push_subscriptions får en endpoint per rad (dubbletter = samma
--      notis skickas två gånger till samma enhet).
--   2. sent_notifications gör själva utskicket idempotent. Raden skrivs
--      FÖRE pushen, så två parallella poll-live-körningar kan aldrig
--      skicka samma händelse två gånger — den andra får unique violation.
--
-- Kör hela filen i Supabase SQL Editor. Allt är idempotent.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Rensa dubbletter — behåll senaste raden per endpoint
-- -------------------------------------------------------------
delete from public.push_subscriptions a
using public.push_subscriptions b
where a.endpoint = b.endpoint
  and (a.created_at, a.id) < (b.created_at, b.id);

-- -------------------------------------------------------------
-- 2. Unik constraint på endpoint
--
-- db/push-subscriptions.sql skapade tabellen med "endpoint text not null
-- unique". Finns constrainten redan gör blocket ingenting; saknas den
-- (tabellen skapad för hand, eller unique bortplockad) läggs den till.
-- -------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_attribute a
      on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = 'public.push_subscriptions'::regclass
      and i.indisunique
      and i.indnkeyatts = 1
      and a.attname = 'endpoint'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_endpoint_key unique (endpoint);
  end if;
end $$;

-- -------------------------------------------------------------
-- 3. sent_notifications — en rad per utskickad händelse
--
-- event_key-format:
--   goal:{fixture_id}:{team_id}:{elapsed}:{home}-{away}
--   fulltime:{fixture_id}
--   settled:{bet_id}
--   settle-reminder:{bet_id}
--
-- Skrivs av service_role (Next.js /api/internal/notify). Ingen policy:
-- RLS är på och service_role går förbi den, alla andra är utestängda.
-- -------------------------------------------------------------
create table if not exists public.sent_notifications (
  id uuid primary key default gen_random_uuid(),
  fixture_id bigint,
  event_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists sent_notifications_fixture_idx
  on public.sent_notifications(fixture_id);

create index if not exists sent_notifications_created_idx
  on public.sent_notifications(created_at);

alter table public.sent_notifications enable row level security;

comment on table public.sent_notifications is
  'Idempotensnyckel per utskickad push. Raden skrivs före utskicket.';
comment on column public.sent_notifications.event_key is
  'goal:… / fulltime:… / settled:… / settle-reminder:… — unik per händelse.';

-- -------------------------------------------------------------
-- 4. Städning (valfritt)
--
-- Nycklarna behövs bara så länge samma händelse kan dyka upp i en ny
-- poll. En vecka är gott om marginal.
--
-- select cron.schedule(
--   'sent-notifications-cleanup',
--   '17 4 * * *',
--   $$delete from public.sent_notifications where created_at < now() - interval '7 days';$$
-- );
-- -------------------------------------------------------------

notify pgrst, 'reload schema';
