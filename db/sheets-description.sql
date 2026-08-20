-- Spelbok description (byline under sheet title)
alter table public.sheets
  add column if not exists description text;
