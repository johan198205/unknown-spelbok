-- =============================================================
-- SPELBOK — AI-motiveringar på förslag (Nivå 2, on demand)
--
-- Bygger ovanpå db/daily-suggestions.sql. Kör den först.
--
-- AI:n väljer inga matcher och förutsäger inga utfall — den förklarar
-- varför en redan regelmatchad fixture passar användarens historik.
-- Generering sker ENDAST när användaren trycker på knappen; ingen cron,
-- ingen push, ingen automatik vid sidladdning.
--
-- Kräver ANTHROPIC_API_KEY i Vercel-miljön (server-side, aldrig i klienten).
-- =============================================================

-- -------------------------------------------------------------
-- 1. Cache på förslaget
--
-- En motivering genereras en gång och sparas. Routen läser den i
-- stället för att generera om — både för kostnaden och för att texten
-- ska vara stabil över sidladdningar.
-- -------------------------------------------------------------
alter table public.daily_suggestions
  add column if not exists ai_reason text,
  add column if not exists ai_generated_at timestamptz;

-- -------------------------------------------------------------
-- 2. Genereringslogg
--
-- Finns för rate limiting och kostnadskontroll, inte analys.
-- -------------------------------------------------------------
create table if not exists public.ai_generation_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  suggestion_id uuid not null references public.daily_suggestions(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create index if not exists idx_ai_log_user_day
  on public.ai_generation_log (user_id, created_at);

-- -------------------------------------------------------------
-- 3. RLS
--
-- Select för egen användare. Ingen insert-policy: raderna skrivs bara
-- av API-routen med service role, som går förbi RLS. Går det att skriva
-- från klienten går det också att nolla sin egen dagskvot.
-- -------------------------------------------------------------
alter table public.ai_generation_log enable row level security;

drop policy if exists "Users read own ai log" on public.ai_generation_log;

create policy "Users read own ai log"
  on public.ai_generation_log for select
  using (auth.uid() = user_id);

-- =============================================================
-- Kontroll — dagens förbrukning per användare (gränsen är 10/dygn):
--   select user_id, count(*)
--   from public.ai_generation_log
--   where created_at >= date_trunc('day', now() at time zone 'Europe/Stockholm')
--   group by user_id;
-- =============================================================
