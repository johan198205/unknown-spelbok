-- =============================================================
-- SPELBOK — Kontaktformulär
--
-- contact_messages: inkommande meddelanden från /kontakt.
-- Publik INSERT går via API med service role (honeypot + rate
-- limit). Användare har ingen direkt write-access.
-- Retention: raderar rader äldre än 12 månader (nattligt cron).
--
-- Kör i Supabase SQL Editor. Idempotent.
-- =============================================================

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  topic       text not null,
  message     text not null,
  created_at  timestamptz not null default now(),
  handled_at  timestamptz
);

create index if not exists contact_messages_created_idx
  on public.contact_messages (created_at desc);

comment on table public.contact_messages is
  'Meddelanden från /kontakt. Skrivs av API med service role; läses av admin.';
comment on column public.contact_messages.handled_at is
  'När support markerat raden som besvarad. Null = oläst.';
comment on column public.contact_messages.topic is
  'Ärendechip: Support | Konto och data | Spelbolagslistan | Annonsering | Press | Annat.';

alter table public.contact_messages enable row level security;

-- Ingen policy för anon/authenticated — bara service role (bypass RLS).
drop policy if exists "contact_messages admin select" on public.contact_messages;
create policy "contact_messages admin select"
  on public.contact_messages
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "contact_messages admin update" on public.contact_messages;
create policy "contact_messages admin update"
  on public.contact_messages
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, update on public.contact_messages to authenticated;

-- -------------------------------------------------------------
-- Retention — 12 månader (samtyckestexten på /kontakt)
-- -------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule('contact-messages-retention')
  where exists (select 1 from cron.job where jobname = 'contact-messages-retention');

select cron.schedule(
  'contact-messages-retention',
  '50 3 * * *',
  $$delete from public.contact_messages where created_at < now() - interval '12 months';$$
);

notify pgrst, 'reload schema';
