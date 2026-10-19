# Redigerbara texter

Varje text som syns för besökare och inloggade ligger i ett register med
standardvärden i koden. Admin → Texter (`/admin/texter`) sparar
överskrivningar i `app_settings` under nyckeln `texts`, och de vinner över
standardvärdet. Kör `db/site-texts.sql` så nyckeln blir läsbar för anon.

## Lägga till en text

1. Lägg nyckeln i rätt område under `areas/`, t.ex. `areas/hem.ts`:

   ```ts
   texts: {
     "hem.kpi.netto": "Netto",
     "hem.empty.body": "Du har inga spel än. Lägg till ditt första.",
     "hem.greeting": "Hej {name}!",
   },
   hints: {
     "hem.greeting": "Rubriken högst upp. {name} är användarnamnet.",
   },
   ```

   Nyckeln börjar alltid med områdets id. Variabler skrivs `{namn}`.

2. Använd texten:

   - Serverkomponent, `generateMetadata`, route handler, server action:
     ```ts
     import { getT } from "@/lib/texts/server";
     const t = await getT();
     t("hem.greeting", { name: profile.username });
     ```
   - Klientkomponent:
     ```ts
     import { useT } from "@/components/TextsProvider";
     const t = useT();
     ```
   - Ren hjälpfunktion som anropas från båda: ta emot `t: TFunction`
     (`import type { TFunction } from "@/lib/texts"`) som parameter.

`t()` är typat mot registret, så en felstavad nyckel ger typfel.

## Vad som inte hör hit

- Innehåll som redan redigeras under Sidor (startsidan, Om oss, Kontakt,
  sidintro), Spelbolag, Banners, Popups och Kuponger.
- Data från databasen och API:er: lagnamn, ligor, användarnamn, inlägg.
- Adminpanelen.
- Kod som körs utanför Next (scripts/, supabase/functions): `getT` bygger på
  `unstable_cache` och fungerar bara i Next.
