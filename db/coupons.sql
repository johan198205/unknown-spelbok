-- =============================================================
-- SPELBOK — Kuponger (redaktionens spelförslag)
--
-- Publik läsning, redaktionell skrivning. Två tabeller plus en
-- mejllista:
--   coupons              en rad per publicerad kupong
--   coupon_legs          ett ben per objekt, kopplat till fixtures
--   coupon_subscribers   e-post för "notis vid ny kupong"
--
-- Statusen på kupongen räknas ALDRIG i klienten. Den härleds ur
-- benen av en trigger här nere, så samma regel gäller oavsett om
-- benen rättas av sättlingsjobbet eller för hand i adminpanelen.
--
-- Kör hela filen i Supabase SQL Editor. Allt är idempotent.
-- =============================================================

-- -------------------------------------------------------------
-- 0. REDAKTIONSROLL
--
-- is_admin() finns sedan grundschemat. Kuponger skrivs av
-- "redaktionen", vilket i dag är admin men inte behöver förbli det —
-- därför en egen funktion att bygga ut i stället för is_admin()
-- utspritt i tio policies.
-- -------------------------------------------------------------
create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'editor')
  );
$$;

comment on function public.is_editor is
  'Får publicera kuponger. Admin i dag, egen redaktionsroll den dag den behövs.';

-- -------------------------------------------------------------
-- 1. COUPONS
--
-- total_odds kan inte vara en generated column: produkten ligger i
-- en annan tabell och Postgres tillåter bara uttryck över den egna
-- raden. Kolumnen skrivs i stället av triggern i steg 4 och ska
-- aldrig sättas för hand.
-- -------------------------------------------------------------
create table if not exists public.coupons (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  kicker            text not null default '',
  type              text not null default 'single' check (type in ('single', 'combo')),
  body              text not null default '',
  stake             numeric(12,2) not null default 0 check (stake >= 0),
  total_odds        numeric(10,3) not null default 1,
  bookmaker_id      uuid references public.bookmakers(id) on delete set null,
  bookmaker_reason  text not null default '',
  proof_url         text,
  status            text not null default 'open'
                    check (status in ('open', 'won', 'lost', 'void')),
  published_at      timestamptz not null default now(),
  settled_at        timestamptz,
  author_id         uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);

-- Listan sorterar på publiceringstid och filtrerar bort framtida rader.
create index if not exists coupons_published_idx
  on public.coupons (published_at desc);

create index if not exists coupons_status_idx
  on public.coupons (status);

comment on table public.coupons is
  'Redaktionens spelförslag. Publik läsning via /kuponger, skrivning endast redaktion.';
comment on column public.coupons.kicker is
  'Kort etikett över titeln, t.ex. DAGENS KOMBI. Visas som pill i kortets huvud.';
comment on column public.coupons.total_odds is
  'Produkten av benens odds. Skrivs av trigger — sätt den aldrig manuellt.';
comment on column public.coupons.status is
  'Härledd ur benen av coupons_sync_from_legs(). Räkna den aldrig i klienten.';
comment on column public.coupons.proof_url is
  'Skärmbild av kupongen hos spelbolaget. Null = "spelbevis saknas" för läsaren.';

-- -------------------------------------------------------------
-- 2. COUPON_LEGS
--
-- result är null tills benet är rättat. Nullen är det som håller
-- kupongen öppen — se statusregeln i steg 4.
-- -------------------------------------------------------------
create table if not exists public.coupon_legs (
  id           uuid primary key default gen_random_uuid(),
  coupon_id    uuid not null references public.coupons(id) on delete cascade,
  sort_order   int not null default 0,
  fixture_id   bigint references public.fixtures(fixture_id) on delete set null,
  pick         text not null,
  odds         numeric(8,3) not null check (odds >= 1),
  result       text check (result in ('WIN', 'LOSS', 'PUSH', 'VOID'))
);

create index if not exists coupon_legs_coupon_idx
  on public.coupon_legs (coupon_id, sort_order);

create index if not exists coupon_legs_fixture_idx
  on public.coupon_legs (fixture_id)
  where result is null;

comment on table public.coupon_legs is
  'Ett objekt i en kupong. Avsparkstiden hämtas alltid från fixtures, aldrig från kupongen.';
comment on column public.coupon_legs.result is
  'Null = orättat. Kupongens status kan inte bli avgjord förrän alla ben har ett resultat.';

-- -------------------------------------------------------------
-- 3. COUPON_SUBSCRIBERS — "notis vid ny kupong"
--
-- En publik mejllista: vem som helst får skriva sin adress, ingen
-- får läsa listan. Därav insert-policy utan select-policy.
-- -------------------------------------------------------------
create table if not exists public.coupon_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- Skiftlägesokänsligt: Namn@Exempel.se och namn@exempel.se är samma person.
create unique index if not exists coupon_subscribers_email_uidx
  on public.coupon_subscribers (lower(email));

comment on table public.coupon_subscribers is
  'Mejllista för nya kuponger. Skrivbar för alla, läsbar för ingen utom service role.';

-- -------------------------------------------------------------
-- 4. STATUS OCH TOTALODDS UR BENEN
--
-- Regeln, i den ordning den prövas:
--   minst ett LOSS            → lost
--   alla WIN                  → won
--   alla PUSH/VOID            → void
--   inget orättat ben kvar,
--   inget LOSS, minst ett WIN → won   (kombination med push)
--   annars                    → open
--
-- Det fjärde fallet står inte i promptboarden men måste finnas: en
-- kombination där ett ben pushar och resten vinner är färdigrättad,
-- och utan regeln hade den legat kvar under Öppna för evigt.
-- Pushade ben räknas som odds 1,00 i utfallet (steg 5).
-- -------------------------------------------------------------
create or replace function public.coupons_sync_from_legs()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_coupon_id  uuid := coalesce(new.coupon_id, old.coupon_id);
  v_legs       int;
  v_open       int;
  v_win        int;
  v_loss       int;
  v_neutral    int;
  v_odds       numeric;
  v_status     text;
begin
  select
    count(*),
    count(*) filter (where result is null),
    count(*) filter (where result = 'WIN'),
    count(*) filter (where result = 'LOSS'),
    count(*) filter (where result in ('PUSH', 'VOID')),
    coalesce(exp(sum(ln(odds))), 1)
  into v_legs, v_open, v_win, v_loss, v_neutral, v_odds
  from public.coupon_legs
  where coupon_id = v_coupon_id;

  if v_legs = 0 then
    v_status := 'open';
    v_odds := 1;
  elsif v_loss > 0 then
    v_status := 'lost';
  elsif v_win = v_legs then
    v_status := 'won';
  elsif v_neutral = v_legs then
    v_status := 'void';
  elsif v_open = 0 and v_win > 0 then
    v_status := 'won';
  else
    v_status := 'open';
  end if;

  update public.coupons
  set
    total_odds = round(v_odds, 3),
    status     = v_status,
    -- Sätts vid övergången till avgjord och står sedan still: rättas ett
    -- ben om från won till lost är kupongen fortfarande rättad samma dag.
    -- Går den tillbaka till öppen nollställs tiden.
    settled_at = case
      when v_status = 'open' then null
      when coupons.settled_at is null then now()
      else coupons.settled_at
    end
  where id = v_coupon_id;

  return null;
end $$;

drop trigger if exists coupon_legs_sync on public.coupon_legs;
create trigger coupon_legs_sync
  after insert or update or delete on public.coupon_legs
  for each row execute function public.coupons_sync_from_legs();

-- -------------------------------------------------------------
-- 5. UTFALL
--
-- won  → stake × odds − stake, där odds är produkten av de ben som
--        faktiskt spelades (PUSH/VOID räknas som 1,00)
-- lost → −stake
-- void → 0
--
-- För en kupong där alla ben vann är produkten identisk med
-- total_odds, så funktionen ger exakt promptboardens formel.
-- -------------------------------------------------------------
create or replace function public.coupon_netto(p_coupon_id uuid)
returns numeric language sql stable set search_path = public as $$
  select case c.status
    when 'won' then round(
      c.stake * coalesce(
        (select exp(sum(ln(l.odds)))
         from public.coupon_legs l
         where l.coupon_id = c.id and l.result = 'WIN'),
        1
      ) - c.stake,
      2
    )
    when 'lost' then -c.stake
    else 0
  end
  from public.coupons c
  where c.id = p_coupon_id;
$$;

comment on function public.coupon_netto is
  'Kupongens netto. Pushade ben räknas som odds 1,00 så en delvis pushad kombination inte överbetalas.';

-- -------------------------------------------------------------
-- 6. RLS
--
-- Publicerade kuponger är läsbara för alla, även utloggade. Framtida
-- publiceringstider är osynliga tills klockan passerat — det är så
-- redaktionen köar en kupong utan att den läcker.
-- -------------------------------------------------------------
alter table public.coupons            enable row level security;
alter table public.coupon_legs        enable row level security;
alter table public.coupon_subscribers enable row level security;

drop policy if exists "publicerade kuponger" on public.coupons;
create policy "publicerade kuponger" on public.coupons
  for select using (published_at <= now());

drop policy if exists "redaktionen läser alla kuponger" on public.coupons;
create policy "redaktionen läser alla kuponger" on public.coupons
  for select using (public.is_editor());

drop policy if exists "redaktionen skapar kuponger" on public.coupons;
create policy "redaktionen skapar kuponger" on public.coupons
  for insert with check (public.is_editor() and author_id = auth.uid());

drop policy if exists "redaktionen ändrar kuponger" on public.coupons;
create policy "redaktionen ändrar kuponger" on public.coupons
  for update using (public.is_editor());

drop policy if exists "redaktionen raderar kuponger" on public.coupons;
create policy "redaktionen raderar kuponger" on public.coupons
  for delete using (public.is_editor());

drop policy if exists "ben i publicerade kuponger" on public.coupon_legs;
create policy "ben i publicerade kuponger" on public.coupon_legs
  for select using (
    exists (
      select 1 from public.coupons c
      where c.id = coupon_id and c.published_at <= now()
    )
  );

drop policy if exists "redaktionen sköter ben" on public.coupon_legs;
create policy "redaktionen sköter ben" on public.coupon_legs
  for all using (public.is_editor()) with check (public.is_editor());

-- Vem som helst får anmäla sig, ingen får läsa listan. Utskicken går
-- via service role, som ändå passerar förbi RLS.
drop policy if exists "anmäl mejladress" on public.coupon_subscribers;
create policy "anmäl mejladress" on public.coupon_subscribers
  for insert with check (true);

-- -------------------------------------------------------------
-- 7. KOPIERADE SPEL
--
-- source_coupon_id gör två saker: hindrar att samma kupong bokförs
-- två gånger, och låter oss följa hur redaktionens kuponger faktiskt
-- presterar hos användarna.
-- -------------------------------------------------------------
alter table public.bets
  add column if not exists source_coupon_id uuid references public.coupons(id) on delete set null;

create unique index if not exists bets_user_coupon_uidx
  on public.bets (user_id, source_coupon_id)
  where source_coupon_id is not null;

comment on column public.bets.source_coupon_id is
  'Kupongen spelet kopierades från. Unik per användare — samma kupong bokförs aldrig två gånger.';

-- -------------------------------------------------------------
-- 8. ANNONSPLATS PÅ KUPONGSIDAN
-- -------------------------------------------------------------
alter table public.banners drop constraint if exists banners_placement_check;
alter table public.banners add constraint banners_placement_check
  check (placement in ('home', 'sheet', 'topplista', 'spelbolag', 'kuponger'));

-- -------------------------------------------------------------
-- 9. STORAGE — spelbevis
--
-- Publik läsning (bilden ligger i kortet), skrivning bara redaktion.
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coupon-proofs',
  'coupon-proofs',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "publik läsning spelbevis" on storage.objects;
create policy "publik läsning spelbevis" on storage.objects
  for select using (bucket_id = 'coupon-proofs');

drop policy if exists "redaktionen skriver spelbevis" on storage.objects;
create policy "redaktionen skriver spelbevis" on storage.objects
  for insert with check (bucket_id = 'coupon-proofs' and public.is_editor());

drop policy if exists "redaktionen uppdaterar spelbevis" on storage.objects;
create policy "redaktionen uppdaterar spelbevis" on storage.objects
  for update using (bucket_id = 'coupon-proofs' and public.is_editor());

drop policy if exists "redaktionen raderar spelbevis" on storage.objects;
create policy "redaktionen raderar spelbevis" on storage.objects
  for delete using (bucket_id = 'coupon-proofs' and public.is_editor());
