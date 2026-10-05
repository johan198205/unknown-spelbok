-- =============================================================
-- SPELBOK — Cron: kommande matcher för alla sporter utom fotboll
--
-- Kräver db/cron.sql (call_edge_function + Vault-nyckeln).
--
-- sync-fixtures?sport=<slug> hämtar idag + 7 dagar framåt för sporten,
-- ett /games-anrop per dygn (8 anrop per sport och natt). Utan det hittar
-- matchsöket bara de dagar någon redan öppnat i matchväljaren.
--
-- Jobben sprids ut med fem minuters mellanrum efter fotbollssynken
-- (03:00 UTC) så att de inte trängs om samma Edge Function-instans.
-- Kör hela filen i SQL Editor. Den går att köra om.
-- =============================================================

do $$
declare
  sport text;
  minute int := 5;
begin
  foreach sport in array array[
    'hockey', 'basketball', 'american-football', 'baseball',
    'handball', 'rugby', 'volleyball', 'afl', 'mma'
  ]
  loop
    perform cron.unschedule('sync-' || sport || '-daily')
    where exists (select 1 from cron.job where jobname = 'sync-' || sport || '-daily');

    perform cron.schedule(
      'sync-' || sport || '-daily',
      format('%s 3 * * *', minute),
      format(
        $cmd$select public.call_edge_function('sync-fixtures?sport=%s', 120000);$cmd$,
        sport
      )
    );
    minute := minute + 5;
  end loop;
end;
$$;

-- Kontrollera:
-- select jobname, schedule, command from cron.job where jobname like 'sync-%' order by jobname;
--
-- Kör en sport direkt i stället för att vänta till natten:
-- select public.call_edge_function('sync-fixtures?sport=hockey', 120000);
--
-- Ta bort:
-- select cron.unschedule(jobname) from cron.job
-- where jobname like 'sync-%-daily' and jobname <> 'sync-fixtures-daily';
