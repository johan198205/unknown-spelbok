# Spelbok — teknisk startpunkt

Stack: Next.js (App Router) på Vercel, Supabase (databas, auth, storage, cron), byggt i Cursor.

## Kom igång, steg för steg

1. **Skapa Supabase-projekt** på supabase.com (region: EU/Frankfurt). Kör hela `supabase-schema.sql` i SQL Editor.
2. **Skapa Next.js-projektet** lokalt:
   ```bash
   npx create-next-app@latest spelbok --typescript --tailwind --app --src-dir
   cd spelbok
   npm install @supabase/supabase-js @supabase/ssr
   ```
3. **Miljövariabler** i `.env.local` (finns under Project Settings > API i Supabase):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # endast serversidan, aldrig NEXT_PUBLIC
   APIFOOTBALL_KEY=...             # endast serversidan
   ```
4. **Öppna i Cursor** och bygg vidare enligt strukturen nedan. Lägg designexporten (dc.html-filerna) i en `design/`-mapp i repot så kan Cursor läsa dem som referens för utseendet.
5. **Koppla Vercel**: pusha till GitHub, importera repot på vercel.com, lägg in samma miljövariabler. Klart, varje push deployas automatiskt.
6. **Gör dig själv till admin** (efter första registreringen):
   ```sql
   update public.profiles set role = 'admin' where username = 'ditt_namn';
   ```

## Projektstruktur

```
src/
  app/
    (public)/                 # publika sidor, delad layout med header/footer
      page.tsx                # startsida
      topplista/page.tsx      # leaderboard (läser vyn public.leaderboard)
      spelbolag/page.tsx      # affiliatesida (bookmakers-tabellen)
      [slug]/page.tsx         # CMS-sidor från pages-tabellen (markdown)
      login/page.tsx
      registrera/page.tsx
    (app)/                    # inloggat läge, skyddad layout
      spelbok/page.tsx        # spelboken (sheets + bets)
      statistik/page.tsx      # grafer, ROI, netto per liga/spelbolag
      tavlingar/page.tsx      # anmälan + pågående tävlingar
      installningar/page.tsx
    admin/                    # skyddad av role = 'admin'
      layout.tsx              # sidomeny + admin-koll (redirect om ej admin)
      anvandare/page.tsx      # lista, sök, ändra roll, stäng av konto
      spelbolag/page.tsx      # CRUD bookmakers + logouppladdning
      banners/page.tsx        # CRUD banners + bilduppladdning + placering
      sidor/page.tsx          # CRUD pages, markdown-editor, publicera
      tavlingar/page.tsx      # CRUD competitions
    api/
      fixtures/route.ts       # cachad proxy mot API-Football (se nedan)
  lib/
    supabase/
      client.ts               # browser-klient (anon key)
      server.ts               # serverklient med cookies (@supabase/ssr)
      admin.ts                # service role-klient, endast API-routes/cron
    types.ts                  # genereras: npx supabase gen types typescript
  components/
    ui/                       # knappar, kort, tabeller (designsystemet)
    bets/                     # BetRow, BetForm, MatchSelector
    admin/                    # DataTable, ImageUpload, MarkdownEditor
  middleware.ts               # session-refresh + skydd av (app)/ och admin/
```

## Designsystemet (från exporten)

- Bakgrund: `#0F1420` (mörk navy), vinst: `#66E38A`, accenter i cyan och gult
- Typsnitt: Oswald (rubriker), Barlow (UI-text), IBM Plex Mono (siffror)
- Lägg in som Tailwind-tokens i `tailwind.config.ts` så att Cursor använder dem konsekvent

## API-cachning (nyckeln exponeras aldrig)

Klienten anropar alltid `/api/fixtures`, aldrig API-Football direkt.

1. `/api/fixtures/route.ts` läser först fixtures-tabellen i Supabase.
2. Är datan äldre än 10 minuter hämtar routen från API-Football med `APIFOOTBALL_KEY`, skriver till tabellen via service role-klienten och svarar sedan.
3. Alla användare delar samma cache: 5 000 besökare kostar lika många API-anrop som 1.

## Automatisk sättling (nästa steg, redan förberett)

Schemat har `fixture_id` på varje spel och `settled_by ('user','auto')`. När det är dags:

1. Skapa en Supabase Edge Function `settle-bets` som hämtar resultat för fixtures med status LIVE/NS där kickoff passerat, uppdaterar `fixtures` och sätter `result` på öppna spel med matchande `fixture_id`.
2. Schemalägg med `pg_cron` var 15:e minut:
   ```sql
   select cron.schedule('settle-bets', '*/15 * * * *',
     $$ select net.http_post(
          url := 'https://DITT-PROJEKT.supabase.co/functions/v1/settle-bets',
          headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
        ) $$);
   ```

Inget på Vercel behöver ändras, sättlingen sker helt i Supabase.

## Import av spelbolagen

Data i `bookmakers.js` (Unibet, Bet365, Betsson, Svenska Spel m.fl.) mappar rakt mot bookmakers-tabellen: `name, bonus, terms, usp, payments, rating, fast_payout, bonus_value, tracking_url, review, plus, minus, rank`. Be Cursor skriva ett engångsscript (`scripts/import-bookmakers.ts`) som läser filen och insertar via service role-klienten. Ladda upp riktiga logotyper till storage-bucketen `logos` via admin-panelen sen.

## Ordning att bygga i

1. Auth (login, registrering, middleware) och profilsida
2. Spelboken: sheets + bets med CRUD och statistik
3. Publika sidor: topplista, spelbolag, CMS-sidor
4. Admin-panelen (användare, spelbolag, banners, sidor, tävlingar)
5. `/api/fixtures` med cache och matchväljaren i spelformuläret
6. Tävlingar + leaderboard
7. Automatisk sättling (Edge Function + pg_cron)
8. PWA-anpassningen enligt den mobila designen
