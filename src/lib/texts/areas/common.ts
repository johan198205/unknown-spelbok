import { defineTextArea } from "../define";

export default defineTextArea({
  id: "common",
  label: "Gemensamt",
  description: "Knappar, statusar och småtexter som återkommer på flera sidor.",
  paths: [],
  texts: {
    // Sajtens metadata
    "common.meta.siteName": "Spelboken",
    "common.meta.titleTemplate": "%s · Spelboken",
    "common.meta.description":
      "Bokför varje spel, se din riktiga ROI och jämför dig i topplistan.",
    "common.meta.appleTitle": "Spelboken",

    // Resultat på ett spel
    "common.result.open": "Öppen",
    "common.result.win": "Vinst",
    "common.result.loss": "Förlust",
    "common.result.void": "Void",
    "common.result.halfwin": "Halv vinst",
    "common.result.halfloss": "Halv förlust",

    // Resultatknapparna W/L/P/V
    "common.resultButtons.win": "W",
    "common.resultButtons.winTitle": "WIN",
    "common.resultButtons.loss": "L",
    "common.resultButtons.lossTitle": "LOSS",
    "common.resultButtons.push": "P",
    "common.resultButtons.pushTitle": "PUSH",
    "common.resultButtons.void": "V",
    "common.resultButtons.voidTitle": "VOID",

    // Rullgardinsmenyer med sök
    "common.dropdown.placeholder": "Välj …",
    "common.dropdown.search": "Sök …",
    "common.dropdown.empty": "Inget matchar sökningen.",
    "common.dropdown.customOption": "+ Annat – skriv själv",
    "common.dropdown.customPlaceholder": "Skriv själv …",

    // Insats och enheter
    "common.stake.tooLow": "Insatsen måste vara större än 0.",
    "common.stake.tooHigh":
      "Max {max} units per spel — {amount} med din unit-storlek.",
    "common.unit.units": "units",
    "common.currency.SEK": "Svenska kronor",
    "common.currency.NOK": "Norska kronor",
    "common.currency.DKK": "Danska kronor",
    "common.currency.EUR": "Euro",
    "common.currency.USD": "US-dollar",
    "common.currency.GBP": "Brittiska pund",

    // Vinstsvit
    "common.streak.title": "{count} raka vinster i rad",
    "common.streak.label": "raka vinster",
  },
  hints: {
    "common.meta.siteName": "Fliktiteln på sidor utan egen titel, och appens namn.",
    "common.meta.titleTemplate":
      "Fliktiteln på sidor med egen titel. %s byts mot sidans titel.",
    "common.meta.description": "Beskrivningen i sökresultat och delningar.",
    "common.meta.appleTitle": "Appens namn på hemskärmen i iOS.",
    "common.result.open": "Status på ett spel som inte är rättat.",
    "common.resultButtons.win": "Knapptexten. Tooltipen står i nyckeln …Title.",
    "common.dropdown.placeholder": "När inget är valt i en rullgardinsmeny.",
    "common.dropdown.search": "Sökfältet överst i rullgardinsmenyn.",
    "common.dropdown.customOption": "Sista valet i menyer där man får skriva eget.",
    "common.dropdown.customPlaceholder": "Fältet som öppnas efter Annat – skriv själv.",
    "common.stake.tooLow": "Felmeddelande när insatsen är 0 eller tom.",
    "common.stake.tooHigh":
      "Felmeddelande när insatsen är över taket. {max} är max antal units, {amount} taket i användarens valuta.",
    "common.unit.units": "Enheten i fältetiketter som Insats (units).",
    "common.currency.SEK": "Valutans namn i valutaväljaren.",
    "common.streak.title": "Tooltip på vinstsviten på profilen. {count} är antalet vinster.",
    "common.streak.label": "Står efter antalet i vinstsviten på profilen.",
  },
});
