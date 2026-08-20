-- =============================================================
-- SPELBOK — Verifierad tidsstämpel (logged_before_kickoff)
-- Kör i Supabase SQL Editor.
--
-- Kolumnen sätts EN gång vid INSERT via trigger (server-side),
-- oberoende av klientpayload. UPDATE på kolumnen blockeras.
-- =============================================================

alter table public.bets
  add column if not exists logged_before_kickoff boolean;

comment on column public.bets.logged_before_kickoff is
  'true = loggat före avspark, false = efter matchstart, null = ej verifierbart (manuellt utan fixture)';

-- Befintliga rader får null automatiskt (kan ej verifieras retroaktivt).

-- -------------------------------------------------------------
-- INSERT: beräkna värdet från fixture.kickoff vs now()
-- Överskriver alltid klientens värde.
-- -------------------------------------------------------------
create or replace function public.bets_set_logged_before_kickoff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kickoff_at timestamptz;
begin
  if new.fixture_id is null then
    new.logged_before_kickoff := null;
  else
    select f.kickoff
      into kickoff_at
      from public.fixtures f
     where f.fixture_id = new.fixture_id;

    if kickoff_at is null then
      new.logged_before_kickoff := null;
    else
      new.logged_before_kickoff := (now() < kickoff_at);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bets_set_logged_before_kickoff on public.bets;
create trigger bets_set_logged_before_kickoff
  before insert on public.bets
  for each row
  execute function public.bets_set_logged_before_kickoff();

-- -------------------------------------------------------------
-- UPDATE: kolumnen är immutabel
-- -------------------------------------------------------------
create or replace function public.bets_lock_logged_before_kickoff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.logged_before_kickoff is distinct from old.logged_before_kickoff then
    raise exception 'logged_before_kickoff is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists bets_lock_logged_before_kickoff on public.bets;
create trigger bets_lock_logged_before_kickoff
  before update on public.bets
  for each row
  execute function public.bets_lock_logged_before_kickoff();
