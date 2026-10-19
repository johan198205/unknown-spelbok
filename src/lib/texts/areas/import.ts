import { defineTextArea } from "../define";

export default defineTextArea({
  id: "import",
  label: "Importera spel",
  description: "Importdialogen för CSV, Excel och skärmdumpar.",
  paths: ["/spelbok"],
  texts: {
    // Knappen och dialogens ram
    "import.button": "Importera",
    "import.title": "Importera spel",
    "import.close": "Stäng",
    "import.subtitle.excel": "Ladda upp en Excel- eller CSV-fil med dina spel.",
    "import.subtitle.image":
      "Ladda upp en skärmdump av en speltabell eller kupong från spelbolag.",
    "import.subtitle.map": "Kontrollera att kolumnerna hamnat rätt.",
    "import.subtitle.preview": "Välj vilka spel som ska importeras.",
    "import.back": "Tillbaka",
    "import.cancel": "Avbryt",

    // Steg 1: välj fil eller bild
    "import.tabs.label": "Importtyp",
    "import.tabs.excel": "Excel / CSV",
    "import.tabs.image": "Bild",
    "import.drop.file": "Dra hit din fil eller välj den nedan",
    "import.drop.image": "Dra hit en bild eller välj den nedan",
    "import.drop.fileBusy": "Läser filen…",
    "import.drop.imageBusy": "AI tolkar bilden…",
    "import.drop.fileLimits": ".xlsx eller .csv · max 2 MB · max 1000 rader",
    "import.drop.imageLimits":
      "JPEG, PNG eller WebP · max 5 MB · skärmdump av tabell eller kupong",
    "import.drop.chooseFile": "Välj fil",
    "import.drop.chooseImage": "Välj bild",
    "import.template.download": "Ladda ner mall ›",

    // Importmallen (Excel-filen som laddas ner)
    "import.template.filename": "spelbok-importmall.xlsx",
    "import.template.sheetName": "Spel",
    "import.template.header.date": "Datum",
    "import.template.header.sport": "Sport",
    "import.template.header.league": "Liga",
    "import.template.header.match": "Match",
    "import.template.header.pick": "Spel",
    "import.template.header.odds": "Odds",
    "import.template.header.stake": "Insats",
    "import.template.header.bookmaker": "Spelbolag",
    "import.template.header.result": "Resultat",
    "import.template.header.payout": "Vinst",

    // Fel när filen läses
    "import.parse.unreadable": "Filen kunde inte läsas.",
    "import.parse.tooLarge": "För stor fil (max 2 MB).",
    "import.parse.wrongType": "Välj en .xlsx- eller .csv-fil.",
    "import.parse.noRows": "Inga spel hittades i filen.",
    "import.parse.firstSheetOnly": "Endast första bladet importeras.",
    "import.parse.truncated":
      "Filen har {count} rader. De {max} senaste importeras.",
    "import.parse.columnFallback": "Kolumn {n}",

    // Bildimport
    "import.image.wrongType": "Endast JPEG, PNG eller WebP.",
    "import.image.tooLarge": "Bilden är för stor (max 5 MB).",
    "import.image.unreadable": "Kunde inte läsa bilden.",
    "import.image.failed": "Kunde inte tolka bilden.",
    "import.vision.invalidJson": "AI returnerade ogiltig JSON",
    "import.vision.noBets": "AI returnerade inga spel",
    "import.vision.refused": "Modellen avböjde att tolka bilden",
    "import.vision.empty": "Tomt svar från AI",
    "import.vision.noticeNoBets": "Inga spel kunde läsas från bilden.",
    "import.vision.noticeTruncated":
      "Max {max} rader — överskjutande rader hoppades över.",

    // Steg 2: kolumnmappning
    "import.map.fileSummary": "{filename} · {count} rader",
    "import.map.ignore": "Ignorera",
    "import.map.taken": " (upptagen)",
    "import.map.reading": "Läser…",
    "import.map.continue": "Fortsätt",
    "import.map.missingTitle": "Mappa {fields}",
    "import.map.missingHint": "Mappa {fields} för att gå vidare.",
    "import.field.placed_at": "Datum",
    "import.field.sport": "Sport",
    "import.field.league": "Liga",
    "import.field.match_label": "Match",
    "import.field.market": "Spel",
    "import.field.odds": "Odds",
    "import.field.stake": "Insats",
    "import.field.bookmaker": "Spelbolag",
    "import.field.result": "Resultat",
    "import.field.payout": "Vinst (utdelning)",
    "import.field.netto": "Netto (vinst/förlust)",

    // Steg 3: förhandsgranskning
    "import.preview.unitPrompt": "Insatserna ser ut att vara units. 1 unit =",
    "import.preview.unitCurrency": "kr",
    "import.preview.selectedCount": "{selected} av {total} valda",
    "import.preview.col.date": "Datum",
    "import.preview.col.match": "Match",
    "import.preview.col.pick": "Spel",
    "import.preview.col.odds": "Odds",
    "import.preview.col.stake": "Insats",
    "import.preview.col.result": "Resultat",
    "import.preview.rowCheckbox": "Importera {match}",
    "import.preview.rowFallback": "rad",
    "import.preview.softDuplicate": "Möjlig dubblett",
    "import.preview.duplicate": "Redan importerad",
    "import.preview.result.win": "Vinst",
    "import.preview.result.loss": "Förlust",
    "import.preview.result.void": "Void",
    "import.preview.result.halfwin": "Halv vinst",
    "import.preview.result.halfloss": "Halv förlust",
    "import.preview.result.pending": "Orättat",
    "import.row.reason.noMatch": "Saknar match",
    "import.row.reason.noOdds": "Saknar odds",
    "import.row.reason.badOdds": "Ogiltigt odds",
    "import.row.reason.noStake": "Saknar insats",
    "import.row.reason.badStake": "Ogiltig insats",
    "import.row.warning.unknownResult": "Okänt resultatvärde — tolkas som orättat",
    "import.row.warning.overCap": "Över {max} units — importeras ändå",
    "import.preview.importing": "Importerar…",
    "import.preview.submit": "Importera {count} spel",

    // Efter import
    "import.toast.imported": "{imported} spel importerade",
    "import.toast.importedSkipped":
      "{imported} spel importerade · {skipped} hoppades över",
    "import.error.preview": "Kunde inte förhandsgranska.",
    "import.error.previewFile": "Kunde inte förhandsgranska filen.",
    "import.error.commit": "Kunde inte spara spelen.",

    // Fel från servern
    "import.request.broken": "Trasig data.",
    "import.request.noRows": "Inga spel hittades i filen.",
    "import.request.tooManyRows": "Max {max} rader per import.",
    "import.request.noMapping": "Kolumnmappning saknas.",
    "import.request.badMapping": "Ogiltig kolumnmappning.",
    "import.request.missingRequired":
      "Match, Odds och Insats måste vara mappade innan import.",
    "import.api.notLoggedIn": "Ej inloggad",
    "import.api.rateLimited": "För många försök. Vänta en stund.",
    "import.api.imageRateLimited": "För många bildtolkningar. Vänta en stund.",
    "import.api.imageDailyLimit":
      "Max {max} bildtolkningar per dygn. Försök igen imorgon.",
    "import.api.imageMissing": "Bilden saknas.",
    "import.api.imageInvalid": "Ogiltig bilddata.",
    "import.api.imageEmpty": "Bilden är tom.",
    "import.api.aiNotConfigured": "AI-import är inte konfigurerad.",
    "import.api.noneSelected": "Inga spel valda.",
    "import.api.sheetNotFound": "Spelboken hittades inte.",
    "import.api.noValidSelected": "Inga giltiga spel valda.",
    "import.api.migrationMissing":
      "Importfunktionen kräver migrationen db/import-migration.sql.",
    "import.api.saveFailed": "Kunde inte spara spelen.",
  },
  hints: {
    "import.button": "Knappen i spelboken som öppnar importdialogen.",
    "import.close": "Skärmläsartext för stängknappen (×).",
    "import.subtitle.excel": "Underrubrik i steg 1 när Excel / CSV är vald.",
    "import.subtitle.image": "Underrubrik i steg 1 när Bild är vald.",
    "import.subtitle.map": "Underrubrik i steg 2, kolumnmappningen.",
    "import.subtitle.preview": "Underrubrik i steg 3, förhandsgranskningen.",
    "import.tabs.label": "Skärmläsartext för flikarna Excel / CSV och Bild.",
    "import.drop.fileBusy": "Medan filen läses in.",
    "import.drop.imageBusy": "Medan AI tolkar bilden.",
    "import.template.filename":
      "Filnamnet på mallen som laddas ner. Behåll .xlsx på slutet.",
    "import.template.sheetName": "Bladets namn i mallfilen.",
    "import.template.header.date":
      "Kolumnrubrik i mallfilen. Rubrikerna känns igen automatiskt vid import, så byt bara till ord som betyder samma sak.",
    "import.template.header.payout": "Kolumnrubrik i mallfilen för utdelningen.",
    "import.parse.truncated":
      "Notis när filen har för många rader. {count} är antal rader i filen, {max} hur många som importeras.",
    "import.parse.columnFallback":
      "Namn på en kolumn utan rubrik. {n} är kolumnens nummer.",
    "import.vision.invalidJson": "Fel när AI-svaret på en bild inte gick att tolka.",
    "import.vision.noticeNoBets":
      "Visas när AI inte hittar några spel i bilden.",
    "import.vision.noticeTruncated":
      "Notis när bilden har fler spel än gränsen. {max} är maxantalet.",
    "import.map.fileSummary": "Ovanför kolumnlistan. {filename} är filens namn, {count} antal rader.",
    "import.map.taken":
      "Läggs efter fältnamnet i listan när fältet redan används av en annan kolumn. Börjar med mellanslag.",
    "import.map.missingTitle":
      "Verktygstips på Fortsätt när obligatoriska fält saknas. {fields} är fältnamnen.",
    "import.map.missingHint":
      "Text bredvid Fortsätt när obligatoriska fält saknas. {fields} är fältnamnen.",
    "import.field.placed_at": "Fältnamn i kolumnmappningen.",
    "import.preview.unitPrompt":
      "Visas när insatserna ser ut att vara units, före fältet för unitvärdet.",
    "import.preview.unitCurrency": "Efter fältet för unitvärdet.",
    "import.preview.selectedCount":
      "{selected} är antal valda spel, {total} antal rader i filen.",
    "import.preview.rowCheckbox":
      "Skärmläsartext för kryssrutan på en rad. {match} är matchen.",
    "import.preview.rowFallback":
      "Används som {match} i texten ovan när raden saknar match.",
    "import.preview.softDuplicate":
      "Verktygstips på varningsikonen när spelet troligen redan importerats från en annan fil.",
    "import.preview.result.win": "Resultatet i förhandsgranskningen.",
    "import.row.reason.noMatch": "Orsak när en rad inte kan importeras.",
    "import.row.warning.overCap":
      "Varning på raden när insatsen överstiger taket. {max} är max units per spel.",
    "import.preview.submit": "{count} är antal valda spel.",
    "import.toast.imported": "Notis efter import. {imported} är antal importerade spel.",
    "import.toast.importedSkipped":
      "Notis efter import när några hoppades över. {imported} är antal importerade, {skipped} antal överhoppade.",
    "import.request.tooManyRows": "{max} är maxantal rader per import.",
    "import.api.imageDailyLimit": "{max} är maxantal bildtolkningar per dygn.",
    "import.api.migrationMissing":
      "Fel när databasen saknar importkolumnerna. Riktar sig till den som driftar sajten.",
  },
});
