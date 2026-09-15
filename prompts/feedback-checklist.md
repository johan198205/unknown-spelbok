# Feedback-checklista — Spelbok

Källa: `prompts/feedback-deck.md`  
Bocka av när acceptanskriterierna är uppfyllda. Kör i ordning P0 → P1 → P2 → P3.

---

## Beslutade regler (påminnelse)

- [ ] **Radera spel:** tillåtet före avspark (låst/olåst); förbjudet efter
- [ ] **Void:** återbetalning (stake tillbaka)
- [ ] **AI-rekommendationer:** pausa/dölj i fas 1
- [ ] **Auto-rättning:** dölj/stäng av tills vidare
- [ ] **Design/färg/logga:** bestäms senare — ingen ny palett i dessa fixar
- [ ] **Kuponger:** redaktionella, inte kopplade till användarens spreadsheet

---

## P0 — Snabbvinster / synliga buggar

### 01 — Dölj AI-rekommendationer
- [ ] Inloggad hem visar inte AI-/förslag-sektion
- [ ] Inga trasiga imports eller dead UI-länkar kvar synliga

### 02 — Dölj / stäng av auto-rättning
- [ ] Öppna spel rättas inte automatiskt när match går FT i UI
- [ ] Manuell rättning via sheet/admin fungerar fortfarande
- [ ] En tydlig plats att slå på auto-rätt igen senare

### 03 — Lag- och ligalogotyper
- [ ] Spreadsheet visar lag- och ligalogor när data finns
- [ ] Boknings-UI visar logor för valda matcher
- [ ] Kupongkort visar laglogor konsekvent
- [ ] Graceful fallback om logo saknas (inga trasiga bildikoner)

### 04 — Datumkolumn = matchavspark
- [ ] Tabellvy: datum = avspark
- [ ] Kortvy: samma
- [ ] Sortering efter datum följer avspark (eller dokumenterat undantag)
- [ ] Fallback när fixture saknas (inga NaN/Invalid Date)

### 05 — “Spelrekommendation” → “Kommentar”
- [ ] Inga synliga “Spelrekommendation” i kupong-UI eller admin
- [ ] Innehållet i fältet oförändrat

---

## P1 — Startsida + footer + compliance

### 06 — Startsida cleanup
- [ ] Startsidan saknar keynotes och “bokför från X”-sektion
- [ ] Statistiksektion är mockup, inte live data
- [ ] Topplista fullbredd utan sido-bonusbox
- [ ] “Jämför svenska spelbolag” borttagen från startsidan
- [ ] Footer oförändrad i denna punkt (görs i 07)

### 07 — Footer utökad
- [ ] Footer visar logga + nav (Om oss, Kontakt) + ansvarslänkar
- [ ] Länkar fungerar (interna 200 / externa korrekta URL:er: stodlinjen.se, spelpaus.se)

### 08 — Spelbolags-disclaimers överallt
- [ ] Admin kan sätta/redigera extra disclaimer
- [ ] Visas på spelbolagskort, kupong-box, grid m.fl.
- [ ] Saknad extra disclaimer = endast standardrad  
  (`18+ | Regler & Villkor gäller | Spela ansvarsfullt | Stodlinjen.se | Spelpaus.se`)

---

## P2 — Annonser + spelbolagskälla

### 09 — Annonshantering HTML + rotation
- [ ] Admin kan spara desktop- och mobilkod separat
- [ ] Flera aktiva banners på samma placement roterar
- [ ] Ingen vit “ram”-bakgrund runt annonsen
- [ ] Klick når affiliate-URL

### 10 — Enhetlig spelbolagskälla + klickbar logga
- [ ] Ändring i admin speglas överallt utan manuella per-vy-länkar
- [ ] Logga och CTA går till samma tracking (`/go/[slug]`)
- [ ] Kupong-spelbolagsbox: logga + namn + bonus + CTA (ej “rekommenderat” / “bästa oddset”)

---

## P3 — Spreadsheet / kuponger / profil / planket

### 11 — Kortvy bokförda spel
- [ ] Card view: lagbox → avlång box för spelval → 3 boxar (resultat/insats, odds, spelbolag)
- [ ] Spelbolagslogga klickbar om 10 är klar
- [ ] Responsiv desktop + mobil

### 12 — Preloader vid API-hämtning av matcher
- [ ] Tydlig loading under fetch (spinner/skeleton, inte bara text)
- [ ] Resultatlista ersätter loadern när klar
- [ ] Felmeddelande vid fail

### 13 — Radera före avspark + Void
- [ ] Före kickoff: radera fungerar (låst och olåst)
- [ ] Efter kickoff: radera nekas i UI **och** API/action
- [ ] Void ger netto 0 / stake åter

### 14 — Ta bort slim-vy
- [ ] Ingen “Slimmad”-toggle synlig
- [ ] Gamla länkar med `slim` funkar (fallback till `result`)

### 15 — Kuponger redaktionellt
- [ ] Ingen “Redaktionens facit”-box synlig
- [ ] “Avregistrera när du vill. 18+” borttagen vid ny kupong (om den fanns)
- [ ] Admin/redaktör kan ladda upp spelbevis på kupongen
- [ ] Push vid avgjord kupong fungerar som innan
- [ ] Kuponger ej kopplade till användar-spreadsheet

### 16 — Sök och ligor prioritering
- [ ] Utan historik: priority-ligor överst
- [ ] Med historik: senast använda före övriga (sedan priority/övriga)

### 17 — Planket: bild, tråd, blockera länkar
- [ ] Skapa inlägg med endast bild + text
- [ ] Svara i tråd under inlägg
- [ ] URL:er syns men är inte klickbara (eller saneras)
- [ ] Admin-kupong-attach kopplar match, inte sheet-rad

### 18 — Spelarprofil livligare
- [ ] Upload avatar fungerar
- [ ] Bio sparas och visas publikt
- [ ] Tom bio = ingen trasig tom-ruta (dölj)

### 19 — Spelbolagssida redesign
- [ ] Sidan visar rankad lista med: nummer, stjärnor, logga+färg, USP:ar, bonus, uttagstid, CTA, expand villkor
- [ ] Expand för villkor fungerar
- [ ] Inte pixel-copy av konkurrent
- [ ] Admin styr stjärnor/USP/färg/uttagstid

### 20 — Snabbare flikar / SEK↔Units
- [x] Toggle SEK/Units känns omedelbar (<100 ms upplevt för lokala siffror)
- [x] Flikbyte utan onödig “vit skärm” (loading.tsx/skeletons)

### 21 — CSV/Excel-import + Sharp RSS research
- [ ] Användare kan preview + commit CSV/XLSX till sheet
- [ ] Research-notes-fil skapad för Sharp RSS (`prompts/sharp-rss-research-notes.md`)
- [x] Skärmdump+AI-OCR via Importera → Bild (Claude Vision)

---

## Bilagor

### A — Textändrings-Excel (mall)
- [ ] CSV-mall skapad (`prompts/textandringar-mall.csv`) med kända rader ifyllda
- [ ] Övriga rader lämnade till redaktion

### B — Manuella leveranser (utanför kod)
- [ ] HTML-bannerkoder (affiliate) — desktop + mobil per bolag/yta
- [ ] Färgkoder och designförslag till utvecklaren
- [ ] 20 mörktemade designförslag med accentfärger → skicka till Johan
- [ ] Ny logga och färgpalett — nästa runda (bygg inte i appen ännu)

### C — Fas 2 AI (bygg inte nu)
- [ ] _(Backlog endast)_ ≥50 spel-tröskel, premium ~19 kr/mån, UI dold tills fas 2

---

## Snabböversikt

| # | Titel | Prio | Klar |
|---|--------|------|------|
| 01 | Dölj AI-rekommendationer | P0 | [ ] |
| 02 | Dölj auto-rättning | P0 | [ ] |
| 03 | Lag-/ligalogotyper | P0 | [ ] |
| 04 | Datum = avspark | P0 | [ ] |
| 05 | Kommentar-label | P0 | [ ] |
| 06 | Startsida cleanup | P1 | [ ] |
| 07 | Footer | P1 | [ ] |
| 08 | Disclaimers | P1 | [ ] |
| 09 | Annonser HTML + rotation | P2 | [ ] |
| 10 | Enhetlig spelbolagskälla | P2 | [ ] |
| 11 | Kortvy | P3 | [ ] |
| 12 | Matcher-preloader | P3 | [ ] |
| 13 | Radera före avspark + void | P3 | [ ] |
| 14 | Ta bort slim | P3 | [ ] |
| 15 | Kuponger redaktionellt | P3 | [ ] |
| 16 | Sök/ligor | P3 | [ ] |
| 17 | Planket | P3 | [ ] |
| 18 | Spelarprofil | P3 | [ ] |
| 19 | Spelbolagssida redesign | P3 | [ ] |
| 20 | Performance SEK/flikar | P3 | [x] |
| 21 | Import + Sharp research | P3 | [ ] |
| A | Textändrings-CSV-mall | Bilaga | [ ] |
| B | Manuella leveranser | Bilaga | [ ] |
| C | Fas 2 AI-spec | Bilaga | — |

---

**Obs:** “Bifoga spel / nytt spel” på Planket (söka match utanför spelboken) fanns **inte** i feedback-decket — det byggdes separat. Lägg gärna till som egen punkt under 17 om du vill spåra det:

- [ ] Bifoga spel: kunna skapa nytt spel via sport/liga/match (inte bara från spelboken)
