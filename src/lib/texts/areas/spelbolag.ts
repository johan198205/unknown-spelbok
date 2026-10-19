import { defineTextArea } from "../define";

export default defineTextArea({
  id: "spelbolag",
  label: "Spelbolag",
  description: "Spelbolagslistan och spelbolagskort.",
  paths: ["/spelbolag"],
  texts: {
    // Filter och sortering ovanför listan
    "spelbolag.filter.popular": "Populära",
    "spelbolag.filter.new": "Nya spelbolag",
    "spelbolag.filter.bonus": "Bonus",
    "spelbolag.filter.freeBets": "Free bets",
    "spelbolag.filter.fastPayout": "Snabba uttag",
    "spelbolag.filter.swish": "Med Swish",
    "spelbolag.filter.live": "Livebetting",
    "spelbolag.filter.oddsBoost": "Odds boost",
    "spelbolag.sort.button": "Filter",
    "spelbolag.sort.active": "Filter: {sort}",
    "spelbolag.sort.rating": "Vårt betyg",
    "spelbolag.sort.bonus": "Högst bonus",
    "spelbolag.list.emptyBefore": "Inga spelbolag ännu. Kör",
    "spelbolag.list.emptyAfter": "efter att du satt miljövariablerna.",

    // Spelbolagskortet
    "spelbolag.unit.kr": "kr",
    "spelbolag.card.ratingTitle": "{rating} av 5 — vägt på odds, utbud, betalningar och support.",
    "spelbolag.card.noWagering": "Inget omsättningskrav",
    "spelbolag.card.wagering": "Omsättningskrav:",
    "spelbolag.card.fallbackName": "spelbolaget",
    "spelbolag.card.cta": "Till {name}",
    "spelbolag.hero.wrongType": "JPG, PNG eller WebP",
    "spelbolag.hero.tooLarge": "Max 1 MB",
    "spelbolag.hero.uploading": "Laddar upp…",
    "spelbolag.hero.drop": "Släpp bannerbild för {name} · 640×300",

    // Ansvarsraden under varje reklamlänk
    "spelbolag.disclaimer.age": "{age}+",
    "spelbolag.disclaimer.responsible": "Spela ansvarsfullt",
    "spelbolag.disclaimer.stodlinjen": "Stodlinjen.se",
    "spelbolag.disclaimer.spelpaus": "Spelpaus.se",
    "spelbolag.disclaimer.terms": "Regler & villkor gäller",
  },
  hints: {
    "spelbolag.filter.popular":
      "Filterknapparna ovanför listan. Filtret matchar fortfarande taggen i databasen, bara etiketten ändras.",
    "spelbolag.filter.new": "Filterknapp. Matchar taggen Nya spelbolag.",
    "spelbolag.filter.live": "Filterknapp. Matchar taggen Livebetting.",
    "spelbolag.sort.button": "Sorteringsknappen till höger när inget är valt",
    "spelbolag.sort.active": "Sorteringsknappen när något är valt. {sort} är det valda alternativet.",
    "spelbolag.sort.rating": "Alternativ i sorteringsmenyn",
    "spelbolag.sort.bonus": "Alternativ i sorteringsmenyn",
    "spelbolag.list.emptyBefore":
      "Tomläget när inga spelbolag finns, före kommandot npm run import:bookmakers",
    "spelbolag.list.emptyAfter": "Tomläget, efter kommandot npm run import:bookmakers",
    "spelbolag.unit.kr": "Valutan efter bonusbeloppet när bolaget saknar bonustext",
    "spelbolag.card.ratingTitle":
      "Tooltip på stjärnorna. {rating} är betyget med en decimal, t.ex. 4,5.",
    "spelbolag.card.noWagering": "Under bonusen när bolaget inte har något omsättningskrav",
    "spelbolag.card.wagering": "Under bonusen, före kravet i fetstil",
    "spelbolag.card.fallbackName": "Används i stället för namnet när bolaget saknar namn",
    "spelbolag.card.cta": "Den gröna knappen. {name} är spelbolagets namn.",
    "spelbolag.hero.wrongType": "Felmeddelande i redaktionsläge vid fel filtyp",
    "spelbolag.hero.tooLarge": "Felmeddelande i redaktionsläge när bilden är för stor",
    "spelbolag.hero.uploading": "Bannerytan i redaktionsläge medan bilden laddas upp",
    "spelbolag.hero.drop": "Bannerytan i redaktionsläge. {name} är spelbolagets namn.",
    "spelbolag.disclaimer.age":
      "Åldersgränsen först på ansvarsraden. {age} är bolagets gräns, 18 som standard.",
    "spelbolag.disclaimer.stodlinjen": "Länktext till stodlinjen.se",
    "spelbolag.disclaimer.spelpaus": "Länktext till spelpaus.se",
    "spelbolag.disclaimer.terms": "Sist på ansvarsraden, länk till bolagets villkor när det finns",
  },
});
