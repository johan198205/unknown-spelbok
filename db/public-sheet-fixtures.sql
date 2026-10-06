-- =============================================================
-- SPELBOK — Migrering: matchdata i publika spelböcker
-- Kör i Supabase SQL Editor EFTER db/apisports-migration.sql.
--
-- apisports-migration.sql gjorde fixtures och teams läsbara bara för
-- inloggade. En utloggad besökare på /s/<slug> eller /profil/<namn> fick
-- därför null i fixtures-joinen och lagnamnsuppslaget: datumet föll
-- tillbaka på placed_at i stället för avspark, matchstatus visades fel
-- och lagloggorna saknades.
--
-- Utloggade får nu läsa de matcher som finns i en publik spelbok — inte
-- hela API-cachen. Lagkatalogen (namn + logga) är publik.
-- =============================================================

-- Policyn slår upp bets per fixture_id; befintligt index gäller bara öppna.
create index if not exists bets_fixture_id_idx
  on public.bets (fixture_id)
  where fixture_id is not null;

drop policy if exists "fixtures i publika spelböcker" on public.fixtures;
create policy "fixtures i publika spelböcker" on public.fixtures
  for select to anon
  using (
    exists (
      select 1
      from public.bets b
      join public.sheets s on s.id = b.sheet_id
      where b.fixture_id = fixtures.fixture_id
        and s.is_public
    )
  );

drop policy if exists "teams läsbara alla" on public.teams;
create policy "teams läsbara alla" on public.teams
  for select using (true);
