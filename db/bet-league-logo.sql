-- =============================================================
-- SPELBOK — Ligaloggor på bet-raden
-- Kör i Supabase SQL Editor.
--
-- Sparar league_id + league_logo vid matchval så listor kan
-- rendera loggan utan extra API-anrop. Befintliga rader med
-- fixture_id backfylls från fixtures-cachen.
-- =============================================================

alter table public.bets
  add column if not exists league_id int,
  add column if not exists league_logo text;

comment on column public.bets.league_id is
  'API-Sports league.id vid matchval; null för manuella spel utan liga-id';
comment on column public.bets.league_logo is
  'PNG-URL till ligalogga (media.api-sports.io); null → UI faller tillbaka till initial-badge';

-- Backfill från kopplad fixture
update public.bets b
set
  league_id = coalesce(b.league_id, f.league_id),
  league_logo = coalesce(b.league_logo, f.league_logo)
from public.fixtures f
where b.fixture_id = f.fixture_id
  and (b.league_id is null or b.league_logo is null);
