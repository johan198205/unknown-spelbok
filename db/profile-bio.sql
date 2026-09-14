-- Bio / om-mig på profilen (feedback prompt 18)
alter table public.profiles
  add column if not exists bio text;

comment on column public.profiles.bio is
  'Valfri kort presentation på publik profil.';
