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
      statistik/page.tsx      # KPI:er, aktiva per dag, klick, ligor, konvertering
      sattling/page.tsx       # manuell sättlingskö, väntande spel, fixtures-cache
      installningar/page.tsx  # allmänt, API-nycklar, notiser, loggar
    underhall/page.tsx        # visas när underhållsläget är på (rewrite i middleware)
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

## Automatisk sättling (byggd)

Edge-funktionen ligger i `supabase/functions/settle-bets/index.ts`. Den hämtar resultat för fixtures där avsparken passerat men slutstatus saknas, uppdaterar `fixtures` och rättar öppna spel vars tips går att maskinläsa (1X2 och totalen Över/Under). Allt annat — dubbelchans, DNB, handikapp, hörnor, kort, halvlek, målskytt — hamnar i `settle_queue` och hanteras i `/admin/sattling`.

```bash
supabase functions deploy settle-bets
supabase secrets set APIFOOTBALL_KEY=din-nyckel
```

Schemaläggningen (var 15:e minut via `pg_cron` + `pg_net`) står färdig och kommenterad i `db/cron.sql` — fyll i projekt-ref och service role-nyckel och kör blocket. Inget på Vercel behöver ändras, sättlingen sker helt i Supabase.

## SQL som ska köras (i ordning)

1. `supabase-schema.sql` — grundschemat
2. `db/admin-migration.sql` — admin: klick, bannerstatistik, loggar, inställningar, sättlingskö
3. `db/site-settings-policy.sql` — låter utloggade läsa nyckeln `site` (underhållsläge + öppen registrering)
4. `db/cron.sql` — schemalägg `settle-bets` (kommenterad, kräver dina nycklar)
5. `db/api-usage-migration.sql` — förbrukningslogg mot API-Sports + `get_api_usage` (krävs för `/admin/api-usage`)
6. `db/import-migration.sql` — `import_source`/`import_external_id`/`import_source_url` på `bets` + dubblettindex (krävs för Importera-knappen i Spelboken)
7. `db/google-oauth.sql` — användarnamn och avatar från Google-profilen vid OAuth-registrering (krävs för Google-inlogg)
8. `db/notifications.sql` — notiser i appen (klockan i headern + sidopanelen)
9. `db/coupons.sql` — kuponger, ben, mejllista, `bets.source_coupon_id`, bucket `coupon-proofs` (krävs för `/kuponger` och `/admin/kuponger`)
10. `db/popups.sql` — popups, `popup_events`, bucket `popups` samt notistypen `popup` och kolumnen `notifications.href` (krävs för `/admin/popups`). Kör efter `db/notifications.sql`.

## Google-inlogg

Knappen "Fortsätt med Google" finns på `/login` och `/registrera`, men den fungerar först när providern är påslagen i Supabase.

1. **Google Cloud Console** > APIs & Services > Credentials > Create OAuth client ID > Web application.
   - Authorized redirect URI: `https://<projekt-ref>.supabase.co/auth/v1/callback` (den enda som behövs — Google pratar bara med Supabase, aldrig med appen).
   - Fyll i OAuth consent screen: appnamn, supportmejl, logga, länk till integritetspolicy och villkor. Utan detta går appen inte att publicera och bara testanvändare kan logga in.
2. **Supabase** > Authentication > Providers > Google: slå på, klistra in Client ID och Client Secret.
3. **Supabase** > Authentication > URL Configuration:
   - Site URL: produktionsdomänen.
   - Redirect URLs: `https://<domän>/auth/callback` och `http://localhost:3000/auth/callback`.
4. Kör `db/google-oauth.sql`. Utan den får varje Google-konto ett användarnamn som `user_a3f19c02` i topplistan.

Appen använder PKCE-flödet, så inget behövs på Vercel utöver de miljövariabler som redan finns.

Loggar någon in med Google på en e-post som redan har ett lösenordskonto länkar Supabase ihop dem automatiskt (Google-adresser är verifierade) — det blir alltså inte två profiler.

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
