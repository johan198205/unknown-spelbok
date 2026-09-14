-- =============================================================
-- SPELBOK — Disclaimer-fält på spelbolag
--
-- Spellicensen kräver att 18+, villkor, Stödlinjen och Spelpaus
-- syns i anslutning till varje reklamlänk. Standardraden är samma
-- för alla bolag och ligger i koden (components/bets/BookmakerDisclaimer),
-- men två delar är bolagsspecifika och måste kunna redigeras i admin:
--
--   terms_url        — bolagets egen villkorssida, så "Regler & Villkor"
--                      kan länkas i stället för att bara stå som text.
--                      Saknas den renderas texten olänkad.
--   extra_disclaimer — fritext som vissa bolag kräver ordagrant
--                      (t.ex. Expekts egen formulering). Tom = bara
--                      standardraden visas.
--
-- Befintliga rader får null i båda och beter sig som förut.
-- Kolumnen `terms` (villkorstexten i kortet) rörs inte.
-- =============================================================

alter table public.bookmakers
  add column if not exists terms_url text;

alter table public.bookmakers
  add column if not exists extra_disclaimer text;
