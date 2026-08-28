-- =============================================================
-- SPELBOK — Popups (kampanjrutor med egen trigger och placering)
--
-- Skiljs från banners: en banner ligger i en fast annonsyta och
-- konkurrerar aldrig om uppmärksamheten, en popup lägger sig ÖVER
-- sidan och måste därför bära både trigger ("när?"), räckvidd
-- ("var?") och frekvens ("hur ofta?").
--
-- Fyra tabeller/vyer berörs:
--   popups          en rad per kampanj
--   popup_events    visning, klick och stängning — samma modell som
--                   banner_events, så admin kan räkna CTR
--   popup_stats     sammanställningen admin-listan läser
--   notifications   utökas med typen 'popup' och en fri href, så
--                   varje visad popup landar i notissidopanelen
--
-- Kör hela filen i Supabase SQL Editor. Allt är idempotent.
-- =============================================================

-- -------------------------------------------------------------
-- 1. POPUPS
--
-- Innehållet är medvetet löst: en popup kan vara enbart en bild
-- (kampanjkreativ), enbart text, eller allt på en gång. Kravet är
-- att NÅGOT syns — se popups_content_check längst ner i blocket.
--
-- trigger_value bär olika enhet beroende på trigger_type:
--   delay   sekunder på sidan innan rutan visas
--   scroll  procent av sidans höjd som måste passeras
--   load    används inte (0)
--   exit    används inte (0) — rutan visas när muspekaren lämnar
--           fönstret uppåt, eller vid bakåtgest på mobil
--
-- target_scope styr räckvidden:
--   all     alla sidor i appen (utom admin/inlogg, se lib/popups.ts)
--   paths   bara sökvägarna i target_paths. Avslutande * matchar
--           allt under prefixet: /kuponger* träffar /kuponger/xyz.
-- -------------------------------------------------------------
create table if not exists public.popups (
  id            uuid primary key default gen_random_uuid(),
  title         text not null default '',
  body          text not null default '',
  image_url     text,
  button_label  text,
  button_url    text,

  trigger_type  text not null default 'load'
                check (trigger_type in ('load', 'delay', 'scroll', 'exit')),
  trigger_value int  not null default 0 check (trigger_value >= 0),

  target_scope  text not null default 'all'
                check (target_scope in ('all', 'paths')),
  target_paths  text[] not null default '{}',

  -- Vem rutan gäller: alla besökare, bara inloggade (kampanj i appen)
  -- eller bara utloggade (registreringslockbete).
  audience      text not null default 'all'
                check (audience in ('all', 'auth', 'anon')),

  -- Hur ofta samma besökare får se den. Avgörs i webbläsaren mot
  -- localStorage/sessionStorage — servern kan inte veta något om en
  -- utloggad besökare mellan sidvisningar.
  frequency     text not null default 'once'
                check (frequency in ('once', 'session', 'daily', 'always')),

  -- true = visningen skapar också en notis i sidopanelen, så en
  -- inloggad besökare kan hitta tillbaka till erbjudandet efteråt.
  notify        boolean not null default true,

  active        boolean not null default true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  sort          int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- En popup utan innehåll renderar en tom ruta mitt över sidan.
-- Kravet ligger i databasen och inte bara i serveråtgärden, så att en
-- rad som skapas via SQL eller Supabase-studio inte kan bli halvfärdig.
alter table public.popups drop constraint if exists popups_content_check;
alter table public.popups add constraint popups_content_check
  check (
    coalesce(nullif(trim(title), ''), nullif(trim(body), ''), nullif(trim(image_url), '')) is not null
  );

-- target_scope = 'paths' utan sökvägar hade betytt "visa aldrig", vilket
-- ser ut som en bugg i admin. Fånga det direkt.
alter table public.popups drop constraint if exists popups_paths_check;
alter table public.popups add constraint popups_paths_check
  check (target_scope <> 'paths' or array_length(target_paths, 1) >= 1);

-- Knappen behöver både text och mål — en av delarna ensam ger en knapp
-- som inte går att klicka, eller en länk utan etikett.
alter table public.popups drop constraint if exists popups_button_check;
alter table public.popups add constraint popups_button_check
  check (
    (nullif(trim(button_label), '') is null and nullif(trim(button_url), '') is null)
    or
    (nullif(trim(button_label), '') is not null and nullif(trim(button_url), '') is not null)
  );

-- Uppslaget sker alltid på aktiv + tidsfönster; sorteringen avgör vilken
-- av flera träffar som visas först.
create index if not exists popups_active_idx
  on public.popups (sort, created_at)
  where active;

comment on table public.popups is
  'Kampanjrutor som läggs över sidan. Trigger, räckvidd och frekvens styrs per rad från /admin/popups.';
comment on column public.popups.trigger_value is
  'Sekunder vid trigger_type = delay, procent av sidhöjden vid scroll. Oanvänd för load och exit.';
comment on column public.popups.target_paths is
  'Sökvägar rutan gäller när target_scope = paths. Avslutande * matchar allt under prefixet.';
comment on column public.popups.notify is
  'True = visningen skapar en notis i sidopanelen för inloggade (dedupe_key popup:{id}).';

-- -------------------------------------------------------------
-- 2. RLS
--
-- Läsning: alla får läsa AKTIVA rader — utloggade besökare ska också
-- kunna få en popup, och tidsfönstret filtreras i frågan. Admin ser
-- allt, annars går pausade rader inte att redigera.
--
-- Skrivning: bara admin.
-- -------------------------------------------------------------
alter table public.popups enable row level security;

drop policy if exists "aktiva popups läses av alla" on public.popups;
create policy "aktiva popups läses av alla" on public.popups
  for select using (active or public.is_admin());

drop policy if exists "popups skrivs av admin" on public.popups;
create policy "popups skrivs av admin" on public.popups
  for all using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------
-- 3. POPUP_EVENTS — visning, klick och stängning
--
-- Samma modell som banner_events. 'dismiss' finns bara här: en banner
-- går inte att stänga, en popup gör det, och skillnaden mellan "klickade
-- bort" och "klickade på knappen" är hela poängen med mätningen.
-- -------------------------------------------------------------
create table if not exists public.popup_events (
  id          uuid primary key default gen_random_uuid(),
  popup_id    uuid not null references public.popups(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  event       text not null check (event in ('view', 'click', 'dismiss')),
  path        text,
  occurred_at timestamptz not null default now()
);

create index if not exists popup_events_idx
  on public.popup_events (popup_id, event, occurred_at);
create index if not exists popup_events_time_idx
  on public.popup_events (occurred_at);

alter table public.popup_events enable row level security;

drop policy if exists "popuphändelser skrivs av alla" on public.popup_events;
create policy "popuphändelser skrivs av alla" on public.popup_events
  for insert with check (true);

drop policy if exists "popuphändelser läses av admin" on public.popup_events;
create policy "popuphändelser läses av admin" on public.popup_events
  for select using (public.is_admin());

-- CTR räknas på klick genom visningar, precis som för banners. Stängningar
-- ligger bredvid och räknas aldrig in i CTR:en.
create or replace view public.popup_stats as
select
  p.id as popup_id,
  count(*) filter (where e.event = 'view')    as views,
  count(*) filter (where e.event = 'click')   as clicks,
  count(*) filter (where e.event = 'dismiss') as dismissals,
  case when count(*) filter (where e.event = 'view') > 0
       then round(count(*) filter (where e.event = 'click')::numeric
            / count(*) filter (where e.event = 'view') * 100, 2)
       else 0 end as ctr
from public.popups p
left join public.popup_events e on e.popup_id = p.id
group by p.id;

-- -------------------------------------------------------------
-- 4. NOTISER — ny typ och fri länk
--
-- En popup pekar på en godtycklig URL (kampanjsida, spelbolag, extern
-- landningssida). target_type/target_id räcker inte: target_id är uuid
-- och de fyra befintliga måltyperna bygger sin sökväg själva. Därför en
-- valfri href som vinner över target_type när den är satt — se
-- notificationHref() i src/lib/notifications.ts.
-- -------------------------------------------------------------
alter table public.notifications
  add column if not exists href text;

comment on column public.notifications.href is
  'Färdig länk som vinner över target_type. Används av popup-notiser, som pekar på en fri URL.';

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('goal','settled_win','settled_loss','coupon','competition','kickoff','popup'));

-- Sjätte kategorin i inställningarna. Mejl är avstängt som default —
-- en kampanjruta man redan sett på sajten är inte värd ett mejl.
alter table public.notification_settings
  add column if not exists popup_in_app boolean not null default true,
  add column if not exists popup_email  boolean not null default false;

-- -------------------------------------------------------------
-- 5. STORAGE — popupbilder
--
-- Egen bucket i stället för att dela 'banners': kreativerna har helt
-- olika mått, och en admin som rensar bland bannerbilder ska inte råka
-- radera en popupbild.
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'popups',
  'popups',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "publik läsning popups" on storage.objects;
create policy "publik läsning popups" on storage.objects
  for select using (bucket_id = 'popups');

drop policy if exists "admin skriver popups" on storage.objects;
create policy "admin skriver popups" on storage.objects
  for insert with check (bucket_id = 'popups' and public.is_admin());

drop policy if exists "admin uppdaterar popups" on storage.objects;
create policy "admin uppdaterar popups" on storage.objects
  for update using (bucket_id = 'popups' and public.is_admin());

drop policy if exists "admin raderar popups" on storage.objects;
create policy "admin raderar popups" on storage.objects
  for delete using (bucket_id = 'popups' and public.is_admin());

notify pgrst, 'reload schema';

-- =============================================================
-- KLART. Kontrollera:
--   select id, title, trigger_type, target_scope, active from public.popups;
--   select * from public.popup_stats;
-- =============================================================
