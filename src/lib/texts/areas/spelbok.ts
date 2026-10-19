import { defineTextArea } from "../define";

export default defineTextArea({
  id: "spelbok",
  label: "Spelbok",
  description: "Spreadsheet-vyn: tabell, filter, KPI:er, sättling och delning.",
  paths: ["/spelbok"],
  texts: {
    // Sida.
    "spelbok.page.empty":
      "Du har inga spreadsheets ännu. Skapa din första nedan.",
    "spelbok.page.loading": "Laddar…",
    "spelbok.page.usernameFallback": "användare",

    // Rubrik.
    "spelbok.header.by": "av",

    // Publik/privat.
    "spelbok.visibility.public": "Publik",
    "spelbok.visibility.private": "Privat",
    "spelbok.visibility.titlePublic":
      "Synlig för alla med länken. Klicka för att göra privat.",
    "spelbok.visibility.titlePrivate":
      "Endast du kan se spelboken. Klicka för att göra publik.",
    "spelbok.visibility.toastPublic": "Spelboken är publik",
    "spelbok.visibility.toastPrivate": "Spelboken är privat",
    "spelbok.visibility.updateFailed": "Kunde inte uppdatera",
    "spelbok.publicToggle.label": "Publik spelbok",
    "spelbok.publicToggle.onBody":
      "Din spelbok blir synlig för alla och kan delas via länk.",
    "spelbok.publicToggle.offBody": "Endast du kan se spelboken.",

    // Beskrivning.
    "spelbok.description.placeholder": "Beskriv din spelbok…",
    "spelbok.description.none": "Ingen beskrivning.",
    "spelbok.description.add": "Lägg till beskrivning…",
    "spelbok.description.editTitle": "Klicka för att redigera beskrivning",
    "spelbok.description.saveFailed": "Kunde inte spara beskrivningen",

    // Dela och följ.
    "spelbok.share.button": "Dela",
    "spelbok.share.copied": "Länk kopierad",
    "spelbok.share.copyFailed": "Kunde inte kopiera länken",
    "spelbok.follow.button": "Följ",
    "spelbok.follow.soon": "Kommer snart",

    // Flikar.
    "spelbok.tabs.newSheet": "+ Ny",

    // KPI.
    "spelbok.kpi.netto": "Netto",
    "spelbok.kpi.roi": "ROI",
    "spelbok.kpi.hitrate": "Vinstprocent",
    "spelbok.kpi.bets": "Spel",
    "spelbok.kpi.turnover": "Omsättning",
    "spelbok.kpi.avgOdds": "Snittodds",
    "spelbok.kpi.avgStake": "Snittinsats",

    // Graf.
    "spelbok.chart.title": "Ackumulerat netto",
    "spelbok.chart.meta": "{count} rättade spel · {period}",
    "spelbok.chart.empty": "Grafen fylls när du sätter resultat.",
    "spelbok.chart.aria": "Ackumulerat netto över tid",

    // Filter.
    "spelbok.filter.button": "Filter",
    "spelbok.filter.sport": "Sport",
    "spelbok.filter.league": "Liga",
    "spelbok.filter.allLeagues": "Alla ligor",
    "spelbok.filter.category": "Kategori",
    "spelbok.filter.allCategories": "Alla kategorier",
    "spelbok.filter.bookmaker": "Spelbolag",
    "spelbok.filter.allBookmakers": "Alla spelbolag",
    "spelbok.filter.bookmakerOption": "{name} ({count})",
    "spelbok.filter.result": "Rättning",
    "spelbok.filter.clear": "Rensa filter",
    "spelbok.filter.removeChip": "Ta bort filtret",
    "spelbok.filter.count": "{filtered} av {total} spel",

    // Tabell.
    "spelbok.table.date": "Datum",
    "spelbok.table.match": "Match",
    "spelbok.table.league": "Liga",
    "spelbok.table.pick": "Spel",
    "spelbok.table.bookmaker": "Bolag",
    "spelbok.table.stake": "Insats",
    "spelbok.table.odds": "Odds",
    "spelbok.table.result": "Rättning",
    "spelbok.table.netto": "Netto",
    "spelbok.table.actions": "Åtgärder",
    "spelbok.table.empty": "Inga spel i urvalet.",

    // Rättning.
    "spelbok.settle.groupAria": "Rättning",
    "spelbok.settle.winShort": "W",
    "spelbok.settle.win": "Vinst",
    "spelbok.settle.lossShort": "L",
    "spelbok.settle.loss": "Förlust",
    "spelbok.settle.voidShort": "P",
    "spelbok.settle.void": "Push / void",
    "spelbok.settle.openShort": "V",
    "spelbok.settle.open": "Väntar (orättat)",
    "spelbok.settle.failed": "Kunde inte sätta resultat",

    // Låsikon.
    "spelbok.lock.before": "Låst spel - detta spel bokfördes före matchstart.",
    "spelbok.lock.after": "Olåst spel - detta spel bokfördes efter matchstart.",
    "spelbok.lock.badgeBefore": "Låst – loggat före avspark",
    "spelbok.lock.badgeAfter": "Öppet – efterregistrerat",

    // Radåtgärder.
    "spelbok.actions.rygga": "Rygga spel",
    "spelbok.actions.remove": "Ta bort",

    // Ta bort spel.
    "spelbok.remove.afterKickoff":
      "Spelet kan inte raderas efter avspark. Använd Void om det lagts fel.",
    "spelbok.remove.confirm": "Ta bort spelet?",
    "spelbok.remove.failed": "Kunde inte radera spelet.",

    // Kortvy.
    "spelbok.cards.pick": "Spel",
    "spelbok.cards.stake": "Insats",
    "spelbok.cards.odds": "Odds",
    "spelbok.cards.result": "Resultat",
    "spelbok.cards.possibleWin": "Möjlig vinst",

    // Mobil.
    "spelbok.mobile.filter.all": "Alla",
    "spelbok.mobile.filter.open": "Öppna",
    "spelbok.mobile.filter.win": "Vinst",
    "spelbok.mobile.filter.loss": "Förlust",
    "spelbok.mobile.filter.void": "Void",
    "spelbok.mobile.filter.halfwin": "Halvvinst",
    "spelbok.mobile.filter.halfloss": "Halvförlust",
    "spelbok.mobile.syncing": "Synkar offline-kö…",
    "spelbok.mobile.empty": "Inga spel ännu.",
    "spelbok.mobile.card.leagueDate": "{league} · {date}",
    "spelbok.mobile.card.matchDate": "Match · {date}",
    "spelbok.mobile.card.more": "Fler alternativ",
    "spelbok.mobile.badge.syncFailed": "Kunde inte synkas",
    "spelbok.mobile.badge.pending": "Väntar på synk",
    "spelbok.mobile.swipe.win": "VINST",
    "spelbok.mobile.swipe.loss": "FÖRLUST",
    "spelbok.mobile.settle.win": "Vann",
    "spelbok.mobile.settle.loss": "Förlorade",
    "spelbok.mobile.settle.void": "Void",
    "spelbok.mobile.settle.open": "Öppen",
    "spelbok.mobile.sync.retry": "Försök igen",
    "spelbok.mobile.sync.loginRequired":
      "Du måste vara inloggad för att synka spelet.",
    "spelbok.mobile.sync.failed":
      "Spelet kunde inte synkas. Försök igen om en stund.",
    "spelbok.mobile.sync.invalidOdds":
      "Spelet saknar giltiga odds och kan inte synkas. Ta bort det och lägg in det igen.",
    "spelbok.mobile.menu.copy": "Kopiera spel",
    "spelbok.mobile.menu.remove": "Ta bort",
    "spelbok.mobile.menu.needsOnline": "Kräver uppkoppling",
    "spelbok.mobile.menu.close": "Stäng",

    // Sidbläddring.
    "spelbok.pagination.aria": "Sidor",
    "spelbok.pagination.prev": "Föregående",
    "spelbok.pagination.next": "Nästa",

    // Statistik.
    "spelbok.stats.title": "Statistik",
    "spelbok.stats.count": "Antal spel",
    "spelbok.stats.wins": "Vinster",
    "spelbok.stats.losses": "Förluster",
    "spelbok.stats.voids": "Void / push",
    "spelbok.stats.open": "Öppna spel",
    "spelbok.stats.openRisk": "Öppen risk",
    "spelbok.stats.openPotential": "Öppen potentiell vinst",
    "spelbok.stats.stake": "Insats",
    "spelbok.stats.won": "Vunnet",
    "spelbok.stats.lost": "Förlorat",
    "spelbok.stats.netto": "Netto",
    "spelbok.stats.roi": "ROI",
    "spelbok.stats.unitSize": "1 unit",
    "spelbok.stats.unitNetto": "Unitnetto",
    "spelbok.stats.hitrate": "Vinstprocent",
    "spelbok.stats.avgOdds": "Medelodds",
    "spelbok.stats.avgStake": "Medelinsats",
    "spelbok.stats.avgWin": "Medelvinst",
    "spelbok.stats.best": "Bästa spel",
    "spelbok.stats.worst": "Sämsta spel",
    "spelbok.stats.avgStakeOpen": "Snittinsats öppna",

    // Topp 3 spelbolag.
    "spelbok.affiliates.title": "Topp 3 spelbolag",
    "spelbok.affiliates.empty": "Inga spelbolag just nu.",
    "spelbok.affiliates.linkAria": "{name} – till spelbolaget",
    "spelbok.affiliates.bonusValue": "{amount} kr",

    // Spellistor.
    "spelbok.lists.error": "Kunde inte visa spellen: {message}",

    // Notis vid rättning.
    "spelbok.notifySettle.label": "När ett spel rättas",
    "spelbok.notifySettle.body": "Push när matchen är slut och spelet rättas.",
    "spelbok.notifySettle.saved": "Sparat i databasen.",
    "spelbok.notifySettle.saveFailed": "Kunde inte spara inställningen.",
  },
  hints: {
    "spelbok.page.empty": "När användaren saknar spelböcker",
    "spelbok.page.usernameFallback":
      "Visas efter \"av\" när användarnamn saknas",
    "spelbok.header.by":
      "Före användarnamnet under spelbokens namn (\"av johan\")",
    "spelbok.visibility.public": "Badge efter spelbokens namn",
    "spelbok.visibility.private": "Badge efter spelbokens namn",
    "spelbok.visibility.titlePublic":
      "Tooltip på badgen när spelboken är publik",
    "spelbok.visibility.titlePrivate":
      "Tooltip på badgen när spelboken är privat",
    "spelbok.visibility.toastPublic": "Notis efter byte",
    "spelbok.visibility.toastPrivate": "Notis efter byte",
    "spelbok.publicToggle.label": "Kryssrutan för publik spelbok",
    "spelbok.description.none":
      "Visas för andra när spelboken saknar beskrivning",
    "spelbok.description.add":
      "Visas för ägaren när spelboken saknar beskrivning",
    "spelbok.description.editTitle": "Tooltip på beskrivningen",
    "spelbok.share.copied": "Notis efter Dela",
    "spelbok.follow.button": "Knapp på någon annans spelbok (inte aktiv än)",
    "spelbok.follow.soon": "Tooltip på Följ",
    "spelbok.tabs.newSheet":
      "Knappen efter spelboksflikarna som skapar en ny spelbok",
    "spelbok.chart.meta":
      "Till höger om grafrubriken. {count} är antal rättade spel, {period} vald period.",
    "spelbok.chart.aria": "Skärmläsartext för grafen",
    "spelbok.filter.button": "Knappen som öppnar filterpanelen",
    "spelbok.filter.bookmakerOption":
      "Spelbolag i listan. {name} är bolaget, {count} antal spel.",
    "spelbok.filter.removeChip": "Skärmläsartext på ett aktivt filterchip",
    "spelbok.filter.count":
      "Antal spel i urvalet. {filtered} är antalet efter filter, {total} alla spel i spelboken.",
    "spelbok.table.actions":
      "Kolumnrubrik för ikonerna, läses bara av skärmläsare",
    "spelbok.table.empty": "Tabellen när filtren inte ger några spel",
    "spelbok.settle.groupAria": "Skärmläsartext för rättningsknapparna",
    "spelbok.settle.winShort": "Knapp för vinst",
    "spelbok.settle.win": "Tooltip på W-knappen",
    "spelbok.settle.lossShort": "Knapp för förlust",
    "spelbok.settle.loss": "Tooltip på L-knappen",
    "spelbok.settle.voidShort": "Knapp för push/void",
    "spelbok.settle.void": "Tooltip på P-knappen",
    "spelbok.settle.openShort": "Knapp för väntar (orättat)",
    "spelbok.settle.open": "Tooltip på V-knappen",
    "spelbok.lock.before": "Tooltip på det gröna hänglåset",
    "spelbok.lock.after": "Tooltip på det gula hänglåset",
    "spelbok.lock.badgeBefore": "Badge i spelets detaljvy",
    "spelbok.lock.badgeAfter": "Badge i spelets detaljvy",
    "spelbok.actions.rygga": "Tooltip på kopieringsikonen på ett spel",
    "spelbok.actions.remove": "Tooltip på papperskorgen på ett spel",
    "spelbok.remove.afterKickoff":
      "Dialog när man försöker ta bort ett spel efter avspark",
    "spelbok.remove.confirm": "Bekräftelsedialog",
    "spelbok.remove.failed": "Felmeddelande när borttagningen misslyckas",
    "spelbok.cards.result": "Rubrik över netto på avgjorda spel",
    "spelbok.cards.possibleWin": "Rubrik över möjlig vinst på öppna spel",
    "spelbok.mobile.filter.all": "Resultatfilter i mobilens spellista",
    "spelbok.mobile.filter.open": "Resultatfilter i mobilens spellista",
    "spelbok.mobile.filter.win": "Resultatfilter i mobilens spellista",
    "spelbok.mobile.filter.loss": "Resultatfilter i mobilens spellista",
    "spelbok.mobile.filter.void": "Resultatfilter i mobilens spellista",
    "spelbok.mobile.filter.halfwin": "Resultatfilter i mobilens spellista",
    "spelbok.mobile.filter.halfloss": "Resultatfilter i mobilens spellista",
    "spelbok.mobile.syncing": "Visas medan spel som lagts offline skickas",
    "spelbok.mobile.empty": "Mobilens spellista utan spel",
    "spelbok.mobile.card.leagueDate":
      "Överst på kortet. {league} är ligan, {date} avsparksdatum.",
    "spelbok.mobile.card.matchDate":
      "Överst på kortet när liga saknas. {date} är avsparksdatum.",
    "spelbok.mobile.card.more": "Skärmläsartext för ⋯-menyn på kortet",
    "spelbok.mobile.badge.syncFailed":
      "Märke på ett offline-spel som inte gick att skicka",
    "spelbok.mobile.badge.pending":
      "Märke på ett offline-spel som inte skickats än",
    "spelbok.mobile.swipe.win": "Syns när man drar kortet åt höger",
    "spelbok.mobile.swipe.loss": "Syns när man drar kortet åt vänster",
    "spelbok.mobile.settle.win": "Rättningsknapp på mobilkortet",
    "spelbok.mobile.settle.loss": "Rättningsknapp på mobilkortet",
    "spelbok.mobile.settle.void": "Rättningsknapp på mobilkortet",
    "spelbok.mobile.settle.open": "Rättningsknapp på mobilkortet",
    "spelbok.mobile.sync.retry":
      "Knapp på ett offline-spel som inte gick att skicka",
    "spelbok.mobile.menu.copy": "I menyn som öppnas med långtryck/⋯",
    "spelbok.mobile.menu.remove": "I menyn som öppnas med långtryck/⋯",
    "spelbok.mobile.menu.needsOnline":
      "Tooltip på Ta bort när mobilen är offline",
    "spelbok.mobile.menu.close":
      "Skärmläsartext för bakgrunden som stänger menyn",
    "spelbok.pagination.aria": "Skärmläsartext för sidbläddringen",
    "spelbok.affiliates.linkAria":
      "Skärmläsartext på länken. {name} är spelbolaget.",
    "spelbok.affiliates.bonusValue": "Bonusbeloppet. {amount} är beloppet.",
    "spelbok.lists.error":
      "När spellistan kraschar. {message} är felmeddelandet.",
    "spelbok.notifySettle.label": "Kryssruta under Inställningar → Notiser",
    "spelbok.notifySettle.body": "Under kryssrutan i Inställningar → Notiser",
    "spelbok.notifySettle.saved":
      "Bekräftelse under kryssrutan i Inställningar",
    "spelbok.notifySettle.saveFailed": "Fel under kryssrutan i Inställningar",
  },
});
