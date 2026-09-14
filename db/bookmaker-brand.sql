-- Spelbolag: brandfärg + uttagstid (feedback prompt 19)
alter table public.bookmakers
  add column if not exists brand_color text,
  add column if not exists withdrawal_time text;

comment on column public.bookmakers.brand_color is
  'Hex-färg för logobakgrund på spelbolagssidan, t.ex. #1B2436';
comment on column public.bookmakers.withdrawal_time is
  'Visningstext för uttagstid, t.ex. "1–3 bankdagar"';
