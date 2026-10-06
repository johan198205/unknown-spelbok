-- =============================================================
-- SPELBOK — Migrering: behörighetshål från genomlysningen 2026-10
-- Kör i Supabase SQL Editor EFTER db/public-sheet-fixtures.sql,
-- db/superadmin.sql, db/planket.sql och db/planket-image-replies.sql.
--
-- 1. Avstängda användare kunde häva sin egen avstängning (profiles.banned
--    skrevs via användarens egen update-policy).
-- 2. bets-policyn kontrollerade user_id men inte sheet_id: en inloggad
--    kunde lägga in eller flytta spel till någon annans spelbok.
-- 3. Planket-författare kunde själva avdölja modererade inlägg och sätta
--    created_at fritt.
-- 4. Utloggade såg "Okänt lag" på kuponger: fixtures-policyn för anon
--    täckte bara publika spelböcker, inte kupongben.
-- =============================================================

-- -------------------------------------------------------------
-- 1. PROFILER — banned får bara ändras av admin eller service role
-- -------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (new.role is distinct from old.role
          or new.is_superadmin is distinct from old.is_superadmin)
     and not public.is_superadmin() then
    raise exception 'Bara superadmin kan ändra roller';
  end if;
  if new.is_superadmin and new.role <> 'admin' then
    raise exception 'Superadmin måste ha rollen admin';
  end if;
  if auth.uid() is not null
     and new.banned is distinct from old.banned
     and not public.is_admin() then
    raise exception 'Bara admin kan ändra avstängning';
  end if;
  return new;
end $$;

-- -------------------------------------------------------------
-- 2. BETS — spelet måste ligga i en egen spelbok
-- -------------------------------------------------------------
drop policy if exists "egna bets" on public.bets;
create policy "egna bets" on public.bets for all
  using (
    auth.uid() = user_id
    and not exists (select 1 from public.profiles where id = auth.uid() and banned)
  )
  with check (
    auth.uid() = user_id
    and not exists (select 1 from public.profiles where id = auth.uid() and banned)
    and exists (
      select 1 from public.sheets s
      where s.id = sheet_id and s.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- 3. PLANKET — moderering och tidsstämplar sköts av servern
-- -------------------------------------------------------------
create or replace function public.guard_post_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Service role (auth.uid() null) och admin får sätta allt.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.edited_at  := null;
    new.hidden_at  := null;
    new.deleted_at := null;
    return new;
  end if;

  -- Författaren får ändra text och ta bort sitt inlägg, inget annat.
  new.author_id       := old.author_id;
  new.created_at      := old.created_at;
  new.hidden_at       := old.hidden_at;
  new.attachment_type := old.attachment_type;
  new.bet_id          := old.bet_id;
  new.coupon_id       := old.coupon_id;
  new.image_url       := old.image_url;
  if new.deleted_at is null and old.deleted_at is not null then
    new.deleted_at := old.deleted_at;
  end if;
  return new;
end $$;

drop trigger if exists posts_guard_fields on public.posts;
create trigger posts_guard_fields
  before insert or update on public.posts
  for each row execute function public.guard_post_fields();

-- -------------------------------------------------------------
-- 4. FIXTURES — utloggade läser även matcher i publicerade kuponger
-- -------------------------------------------------------------
create index if not exists coupon_legs_fixture_all_idx
  on public.coupon_legs (fixture_id)
  where fixture_id is not null;

drop policy if exists "fixtures i publicerade kuponger" on public.fixtures;
create policy "fixtures i publicerade kuponger" on public.fixtures
  for select to anon
  using (
    exists (
      select 1
      from public.coupon_legs l
      join public.coupons c on c.id = l.coupon_id
      where l.fixture_id = fixtures.fixture_id
        and c.published_at <= now()
    )
  );
