-- =============================================================
-- SPELBOK — Målnotiser på som standard
--
-- bets.notify_goals lades till med default false, så varje spel
-- krävde ett klick på klockan i raden för att ge push vid mål.
-- Nu är det tvärtom: på som standard, klockan stänger av.
--
-- Kör hela filen i Supabase SQL Editor. Allt är idempotent.
-- =============================================================

-- Nya spel: alla insert-vägar (spelformuläret, mobilflödet, kuponger,
-- rygga, import) utelämnar kolumnen och får därmed defaulten.
alter table public.bets
  alter column notify_goals set default true;

-- Befintliga öppna spel: kolumnen var false för att defaulten var det,
-- inte för att någon valt bort notiserna. Rättade spel lämnas orörda —
-- de skickar ändå inget (jobben filtrerar på result = 'open').
update public.bets
   set notify_goals = true
 where result = 'open'
   and notify_goals = false;

notify pgrst, 'reload schema';
