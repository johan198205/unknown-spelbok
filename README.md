# Spelbok

Next.js (App Router) + Supabase. Designreferens i `design/`, schema i `supabase-schema.sql`.

## Kom igång

1. Skapa Supabase-projekt (EU/Frankfurt) och kör `supabase-schema.sql` i SQL Editor.
2. Kopiera miljövariabler:
   ```bash
   cp .env.local.example .env.local
   ```
   Fyll i URL, anon key, service role key och API-Football-nyckel.
3. Installera och starta:
   ```bash
   npm install
   npm run dev
   ```
4. Registrera dig, gör dig till admin:
   ```sql
   update public.profiles set role = 'admin' where username = 'ditt_namn';
   ```
5. Importera spelbolag:
   ```bash
   npm run import:bookmakers
   ```

Se `START.md` för full struktur, cache-flöde och nästa steg (automatisk sättling, PWA).
