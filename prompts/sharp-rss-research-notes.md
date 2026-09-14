# Sharp Sports RSS — research notes

**Datum:** 2026-09-14  
**Slutsats:** Implementera **inte** RSS nu. Använd CSV/Excel-import (`ImportBetsModal`) som primär väg.

## Fynd
- Sharp Sports är i första hand en betting-tracker / API-produkt, inte en publik RSS-publisher.
- Ingen dokumenterad, autentiseringsfri RSS-URL för användarens privata spelhistorik hittades.
- Partner-API (om det finns) kräver typiskt API-nyckel och OAuth — utan Sharp-partneravtal går det inte att bygga robust import.
- Historikexport via CSV/Excel från användarens Sharp-konto (eller manuell export) är den realistiska vägen idag.

## Rekommendation
1. Behåll och förbättra CSV/XLSX-import i appen.
2. Be Sharp om partner-API / webhook om RSS/API behövs senare.
3. Skärmdump + AI-OCR: out of scope (för avancerat för fas 1).

## När RSS ska återbesökas
- Sharp publicerar dokumenterad feed, **eller**
- Kunden får officiell API-access med historikfält (match, pick, odds, stake, result, kickoff).
