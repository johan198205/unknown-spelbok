-- =============================================================
-- SPELBOK — Cron för fixtures-synk, live-polling och auto-rättning
--
-- Schemalägger:
--   sync-fixtures   03:00 UTC = 05:00 svensk sommartid (1 gång/dygn)
--   settle-results  var 15:e minut
--   poll-live       var 3:e minut (noll API-anrop när inget är live)
--
-- Anropas via pg_net mot Edge Function-URL:erna. Nyckeln till API-Sports
-- ligger i Edge Function secrets, inte i cron-jobbet.
--
-- FÖRUTSÄTTNINGAR (utan dessa gör jobben ingenting):
--   supabase functions deploy poll-live settle-results sync-fixtures
--   supabase secrets set APISPORTS_KEY=...          # annars: "APISPORTS_KEY saknas"
--   supabase secrets set SITE_URL=https://...       # annars skickas NOLL pushar
--   supabase secrets set APISPORTS_MAX_PER_MINUTE=30  # betald plan
--
-- Kör hela filen i SQL Editor. Byt ut SERVICE_ROLE_KEY i steg 2 —
-- nyckeln hamnar i Vault, inte i klartext i cron.job.
--
-- Alla scheman är i UTC: cron.timezone går inte att ändra på hostad
-- Supabase.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Extensions
-- -------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

-- OBS: cron.timezone går INTE att ändra på hostad Supabase
-- ("55P02: cannot be changed without restarting the server").
-- Alla scheman nedan är därför skrivna i UTC.

-- -------------------------------------------------------------
-- 2. Lägg nyckeln i Vault (körs en gång)
-- -------------------------------------------------------------
-- <<< BYT UT >>> mot projektets service_role-nyckel. Den hittar du under
-- Project Settings > API Keys > "Legacy API keys" > service_role.
--
-- Det MÅSTE vara JWT-varianten: börjar med "eyJ", ~219 tecken. De nya
-- sb_secret_… / sb_publishable_… -nycklarna är inte JWT:er och ger 401
-- mot verify_jwt varje gång.
select vault.create_secret('<<< BYT UT MOT service_role eyJ… >>>', 'edge_functions_key');

-- Om hemligheten redan finns, uppdatera i stället:
-- select vault.update_secret(
--   (select id from vault.secrets where name = 'edge_functions_key'),
--   '<<< BYT UT MOT service_role eyJ… >>>'
-- );

-- Kontrollera att rätt nyckel ligger där (hemligheten skrivs inte ut).
-- Förväntat: len = 219, prefix = eyJ
-- select name, length(decrypted_secret) as len, left(decrypted_secret, 3) as prefix
-- from vault.decrypted_secrets where name = 'edge_functions_key';

-- -------------------------------------------------------------
-- 3. Hjälpfunktion — anropar en Edge Function med nyckeln ur Vault
-- -------------------------------------------------------------
create or replace function public.call_edge_function(
  fn text,
  timeout_ms int default 55000
) returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  req_id bigint;
begin
  select net.http_post(
    url     := 'https://jciawttifqxsuwtcaknk.supabase.co/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'edge_functions_key'
      )
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := timeout_ms
  ) into req_id;
  return req_id;
end;
$$;

revoke all on function public.call_edge_function(text, int) from public, anon, authenticated;

-- -------------------------------------------------------------
-- 4. Schemalägg
-- -------------------------------------------------------------
select cron.unschedule('sync-fixtures-daily')      where exists (select 1 from cron.job where jobname = 'sync-fixtures-daily');
select cron.unschedule('settle-bets-var-15-min')   where exists (select 1 from cron.job where jobname = 'settle-bets-var-15-min');
select cron.unschedule('settle-results-var-15-min') where exists (select 1 from cron.job where jobname = 'settle-results-var-15-min');
select cron.unschedule('poll-live-var-3-min')      where exists (select 1 from cron.job where jobname = 'poll-live-var-3-min');

-- 03:00 UTC = 05:00 svensk sommartid (04:00 på vintern). Enda jobbet
-- som bryr sig om klockslag; de andra går på intervall.
select cron.schedule(
  'sync-fixtures-daily',
  '0 3 * * *',
  $$select public.call_edge_function('sync-fixtures', 120000);$$
);

select cron.schedule(
  'settle-results-var-15-min',
  '*/15 * * * *',
  $$select public.call_edge_function('settle-results', 55000);$$
);

select cron.schedule(
  'poll-live-var-3-min',
  '*/3 * * * *',
  $$select public.call_edge_function('poll-live', 55000);$$
);

-- -------------------------------------------------------------
-- 5. Kontrollera
-- -------------------------------------------------------------
-- select jobid, jobname, schedule, active from cron.job;
--
-- select jobid, status, return_message, start_time, end_time
-- from cron.job_run_details
-- order by start_time desc
-- limit 20;
--
-- HTTP-svaren från Edge Functions:
-- select id, status_code, content, created
-- from net._http_response
-- order by created desc
-- limit 20;
--
-- Vad jobben faktiskt gjorde:
-- select job, ok, requests, upserted, settled, error, started_at
-- from public.sync_log
-- order by started_at desc
-- limit 20;

-- -------------------------------------------------------------
-- 6. Pausa / ta bort
-- -------------------------------------------------------------
-- update cron.job set active = false where jobname in (
--   'sync-fixtures-daily', 'settle-results-var-15-min', 'poll-live-var-3-min'
-- );
-- select cron.unschedule('sync-fixtures-daily');
-- select cron.unschedule('settle-results-var-15-min');
-- select cron.unschedule('poll-live-var-3-min');

-- =============================================================
-- Testa manuellt (SERVICE_ROLE_KEY i headern):
--   curl -i -X POST -H "Authorization: Bearer SERVICE_ROLE_KEY" \
--     "https://jciawttifqxsuwtcaknk.supabase.co/functions/v1/poll-live?dry=1"
--   curl -i -X POST -H "Authorization: Bearer SERVICE_ROLE_KEY" \
--     "https://jciawttifqxsuwtcaknk.supabase.co/functions/v1/settle-results?dry=1"
-- =============================================================
