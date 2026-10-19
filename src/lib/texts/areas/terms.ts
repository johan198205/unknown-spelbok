import { defineTextArea } from "../define";

export default defineTextArea({
  id: "terms",
  label: "Spelbegrepp",
  description: "Resultat, speltyper, kategorier, sporter och filteretiketter som används överallt.",
  paths: [],
  texts: {
    // Rättning som filter i spelboken.
    "terms.resultFilter.all": "Alla",
    "terms.resultFilter.open": "Öppen",
    "terms.resultFilter.win": "Vinst",
    "terms.resultFilter.loss": "Förlust",
    "terms.resultFilter.void": "Void",
    "terms.resultFilter.halfwin": "Halv vinst",
    "terms.resultFilter.halfloss": "Halv förlust",

    // Sportfiltret i spelboken.
    "terms.sportFilter.all": "Alla sporter",
    "terms.sportFilter.football": "Fotboll",
    "terms.sportFilter.hockey": "Hockey",

    // Perioder i spelbokens filterrad och dashboardens graf.
    "terms.period.30d": "30 dagar",
    "terms.period.3m": "3 månader",
    "terms.period.ytd": "I år",
    "terms.period.1y": "1 år",
    "terms.period.all": "Allt",

    // Perioder i statistikpanelen.
    "terms.statsPeriod.all": "Från start",
    "terms.statsPeriod.year": "Detta år",
    "terms.statsPeriod.month": "Denna månad",
    "terms.statsPeriod.week": "Denna vecka",
    "terms.statsPeriod.today": "Idag",

    // Vyväljare och täthet.
    "terms.view.table": "Tabell",
    "terms.view.cards": "Kort",
    "terms.density.result": "Resultat",

    // Spelbolag i filter.
    "terms.filter.unknownBookmaker": "Okänt spelbolag",
    "terms.filter.bookmakerFallback": "Spelbolag",

    // Kategorier härledda ur spelvalet.
    "terms.category.corners": "Hörnor",
    "terms.category.cards": "Kort",
    "terms.category.player": "Spelare",
    "terms.category.halfPeriod": "Halvlek & period",
    "terms.category.bothTeams": "Båda lagen mål",
    "terms.category.handicap": "Handikapp",
    "terms.category.totals": "Totaler",
    "terms.category.matchResult": "Matchresultat",
    "terms.category.other": "Övrigt",

    // Oddsintervall och okänd grupp i Fördelning.
    "terms.odds.under150": "Under 1.50",
    "terms.odds.150to199": "1.50–1.99",
    "terms.odds.200to299": "2.00–2.99",
    "terms.odds.300plus": "3.00 och över",
    "terms.breakdown.unknown": "Okänt",

    // Sporter.
    "terms.sport.football": "Fotboll",
    "terms.sport.hockey": "Ishockey",
    "terms.sport.basketball": "Basket",
    "terms.sport.americanFootball": "Amerikansk fotboll",
    "terms.sport.baseball": "Baseboll",
    "terms.sport.handball": "Handboll",
    "terms.sport.rugby": "Rugby",
    "terms.sport.volleyball": "Volleyboll",
    "terms.sport.afl": "AFL",
    "terms.sport.mma": "MMA",
    "terms.sport.tennis": "Tennis",

    // Grupper av snabbval i spelformuläret.
    "terms.pickGroup.matchResult": "Matchresultat",
    "terms.pickGroup.goalsTotal": "Mål – totalen",
    "terms.pickGroup.bothTeams": "Båda lagen",
    "terms.pickGroup.halves": "Halvlekar",
    "terms.pickGroup.corners": "Hörnor",
    "terms.pickGroup.cards": "Kort",
    "terms.pickGroup.handicap": "Handikapp",
    "terms.pickGroup.periods": "Perioder",
    "terms.pickGroup.player": "Spelare",
    "terms.pickGroup.winnerInclOt": "Matchvinnare inkl. övertid",
    "terms.pickGroup.pointsTotal": "Poäng – totalen",
    "terms.pickGroup.winnerInclInnings": "Matchvinnare inkl. extra innings",
    "terms.pickGroup.runLine": "Run line",
    "terms.pickGroup.runsTotal": "Runs – totalen",
    "terms.pickGroup.winner": "Matchvinnare",
    "terms.pickGroup.setResult": "Setresultat",
    "terms.pickGroup.setsTotal": "Set – totalen",
    "terms.pickGroup.method": "Vinstmetod",
    "terms.pickGroup.rounds": "Ronder",
    "terms.pickGroup.sets": "Set",
    "terms.pickGroup.games": "Games",
    "terms.pickGroup.other": "Övrigt",

    // Förklaring under korta spelval ("2" → "AIK vinner").
    "terms.pickHint.homeWins": "{home} vinner",
    "terms.pickHint.awayWins": "{away} vinner",
    "terms.pickHint.draw": "Oavgjort",
    "terms.pickHint.homeOrDraw": "{home} eller oavgjort",
    "terms.pickHint.awayOrDraw": "{away} eller oavgjort",
    "terms.pickHint.noDraw": "Ingen oavgjord",
    "terms.pickHint.homeDnb": "{home} utan oavgjort",
    "terms.pickHint.awayDnb": "{away} utan oavgjort",
    "terms.pickHint.over": "Över {line} {unit}",
    "terms.pickHint.under": "Under {line} {unit}",
    "terms.pickHint.goalsUnit": "mål",

    // Matchstatus i matchcellen och livekort.
    "terms.matchPhase.ft": "FT",
    "terms.matchPhase.ht": "HT",
    "terms.matchPhase.et": "ET",
    "terms.matchPhase.pen": "PEN",
    "terms.matchPhase.wo": "WO",
    "terms.matchPhase.canc": "Inst.",
    "terms.matchPhase.abd": "Avbr.",
    "terms.matchPhase.pst": "Uppskj.",
    "terms.matchPhase.minute": "{minute}'",
    "terms.matchPhase.stoppage": "{minute}+{extra}'",

    // Lag som saknar namn.
    "terms.fixture.homeFallback": "Hemma",
    "terms.fixture.awayFallback": "Borta",
  },
  hints: {
    "terms.resultFilter.all": "Filtret Rättning när inget är valt",
    "terms.sportFilter.hockey": "Filtret omfattar all hockey, även NHL",
    "terms.period.ytd": "Från 1 januari i år",
    "terms.density.result": "Täthet för matchcellen (dold kontroll)",
    "terms.filter.unknownBookmaker": "Spelbolag utan namn i spelbolagsfiltret",
    "terms.filter.bookmakerFallback": "Chip för ett valt spelbolag som inte hittas",
    "terms.category.bothTeams": "Kategori för spel som \"Båda lagen gör mål\"",
    "terms.odds.under150": "Oddsintervall i Fördelning",
    "terms.breakdown.unknown": "Grupp i Fördelning när spelbolag, spelform eller sport saknas",
    "terms.pickGroup.goalsTotal": "Rubrik över snabbvalen i spelformuläret",
    "terms.pickHint.homeWins": "Förklaring under spelet 1. {home} är hemmalaget.",
    "terms.pickHint.awayWins": "Förklaring under spelet 2. {away} är bortalaget.",
    "terms.pickHint.homeOrDraw": "Förklaring under 1X. {home} är hemmalaget.",
    "terms.pickHint.awayOrDraw": "Förklaring under X2. {away} är bortalaget.",
    "terms.pickHint.noDraw": "Förklaring under 12",
    "terms.pickHint.homeDnb": "Förklaring under Hemma DNB. {home} är hemmalaget.",
    "terms.pickHint.awayDnb": "Förklaring under Borta DNB. {away} är bortalaget.",
    "terms.pickHint.over":
      "Förklaring under t.ex. Ö2.5. {line} är gränsen (2,5), {unit} är enheten (mål).",
    "terms.pickHint.under":
      "Förklaring under t.ex. U2.5. {line} är gränsen (2,5), {unit} är enheten (mål).",
    "terms.pickHint.goalsUnit": "Enheten när spelet inte anger någon, t.ex. Ö2.5",
    "terms.matchPhase.ft": "Matchen är slut (full time)",
    "terms.matchPhase.ht": "Halvtid",
    "terms.matchPhase.et": "Förlängning",
    "terms.matchPhase.pen": "Straffar",
    "terms.matchPhase.wo": "Walkover",
    "terms.matchPhase.canc": "Matchen är inställd",
    "terms.matchPhase.abd": "Matchen är avbruten",
    "terms.matchPhase.pst": "Matchen är uppskjuten",
    "terms.matchPhase.minute": "Löpande spelminut. {minute} är minuten.",
    "terms.matchPhase.stoppage":
      "Tilläggstid, t.ex. 45+2'. {minute} är halvlekens slut, {extra} tilläggsminuten.",
    "terms.fixture.homeFallback": "Visas när hemmalaget saknar namn",
    "terms.fixture.awayFallback": "Visas när bortalaget saknar namn",
  },
});
