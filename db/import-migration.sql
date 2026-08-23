-- =============================================================
-- SPELBOK — Migrering: import av spel från fil
-- Kör i Supabase SQL Editor.
--
-- Kolumnerna är medvetet generiska. Länkimport (Sharps m.fl.)
-- ryms i samma modell: bara prefixet i import_external_id byts
-- ('file:…' → 'sharps:…') och import_source sätts därefter.
-- =============================================================

alter table public.bets
  add column if not exists import_source      text,   -- 'file' (senare: 'sharps' m.fl.)
  add column if not exists import_external_id text,   -- 'file:a1b2c3d4e5f6:radhash'
  add column if not exists import_source_url  text;   -- filnamnet

-- Dubblettskyddet. Indexet är avsiktligt INTE partiellt: commit-rutten
-- använder upsert med ON CONFLICT (user_id, import_external_id) DO NOTHING,
-- och PostgREST kan inte skicka med det WHERE-villkor som Postgres kräver
-- för att härleda ett partiellt index. Rader utan import (NULL) krockar
-- ändå aldrig — flera NULL tillåts i ett unique-index.
create unique index if not exists bets_user_import_unique
  on public.bets (user_id, import_external_id);

-- Ingen ny RLS behövs: importerade rader ägs av användaren som vanligt och
-- täcks av policyn "egna bets".
