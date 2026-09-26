-- =============================================================
-- SPELBOK — Superadmin
-- Kör i Supabase SQL Editor EFTER admin-invites.sql.
--
-- Superadmin är en admin som dessutom får skapa konton, bjuda in
-- admins och ändra roller. Vanliga admins sköter innehållet men kan
-- inte ge sig själva eller andra mer behörighet.
--
-- Första superadmin skapas med:  npm run admin:superuser
-- =============================================================

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_superadmin
  );
$$;

-- Roll och superadmin-flagga får bara ändras av en superadmin, eller av
-- backend (service role, där auth.uid() är null). Utan detta kunde en
-- vanlig admin göra sig själv till superadmin via policyn "admin profiler".
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
  return new;
end $$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Inbjudningar till admin: bara superadmin.
drop policy if exists "admininbjudningar admin" on public.admin_invites;
drop policy if exists "admininbjudningar superadmin" on public.admin_invites;
create policy "admininbjudningar superadmin" on public.admin_invites
  for all using (public.is_superadmin()) with check (public.is_superadmin());
