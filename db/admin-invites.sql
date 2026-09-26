-- =============================================================
-- SPELBOK — Admininbjudningar
-- Kör i Supabase SQL Editor.
--
-- Admin har egen inloggning på /admin/login. Nya adminkonton skapas
-- bara via en inbjudningslänk som en befintlig admin tar fram under
-- Admin → Användare. Länken är personlig (knuten till en e-post),
-- går att använda en gång och slutar gälla efter 7 dagar.
--
-- Själva token sparas aldrig, bara dess SHA-256. Registreringen läser
-- och förbrukar inbjudan med service role, så anon behöver ingen åtkomst.
-- =============================================================

create table if not exists public.admin_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token_hash  text not null unique,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_at     timestamptz,
  used_by     uuid references public.profiles(id) on delete set null,
  revoked_at  timestamptz
);

create index if not exists admin_invites_created_idx
  on public.admin_invites(created_at desc);

alter table public.admin_invites enable row level security;

drop policy if exists "admininbjudningar admin" on public.admin_invites;
create policy "admininbjudningar admin" on public.admin_invites
  for all using (public.is_admin()) with check (public.is_admin());
