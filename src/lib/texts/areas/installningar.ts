import { defineTextArea } from "../define";

export default defineTextArea({
  id: "installningar",
  label: "Inställningar",
  description: "Användarens inställningar: konto, visning och spreadsheets.",
  paths: ["/installningar"],
  texts: {
    // Mobilens profilhuvud
    "installningar.hero.publicProfile": "Visa publik profil",
    "installningar.hero.kpi.netto": "Netto",
    "installningar.hero.kpi.roi": "ROI",
    "installningar.hero.kpi.bets": "Spel",
    "installningar.hero.kpi.sheets": "Böcker",
    "installningar.hero.sheetsTitle": "Spelbokslista",
    "installningar.hero.sheetPublic": "PUBLIK",
    "installningar.hero.sheetPrivate": "PRIVAT",
    "installningar.hero.sheetBets": "{count} spel",
    "installningar.hero.changeUsername": "Byt användarnamn",
    "installningar.hero.manageSheets": "Hantera spelböcker",

    // Desktopens sidhuvud
    "installningar.header.title": "Inställningar",
    "installningar.header.subtitle": "Uppdatera din profil",
    "installningar.header.publicProfile": "Visa publik profil",

    // Profilformuläret
    "installningar.profile.title": "Byt användarnamn",
    "installningar.profile.username": "Användarnamn",
    "installningar.profile.avatar": "Profilbild",
    "installningar.profile.avatarHint": "JPG, PNG eller WebP · dra hit eller bläddra",
    "installningar.profile.bio": "Om mig",
    "installningar.profile.bioPlaceholder":
      "Valfri kort presentation som syns på din publika profil (max 280 tecken)",
    "installningar.profile.bioCount": "{count}/280",
    "installningar.profile.role": "Roll:",
    "installningar.profile.saved": "Sparat.",
    "installningar.profile.saving": "Sparar…",
    "installningar.profile.save": "Spara",

    // Enheter och valuta
    "installningar.display.title": "Enheter och valuta",
    "installningar.display.body":
      "Gäller alla dina spelböcker. Växla mellan units och valuta direkt i headern.",
    "installningar.display.currency": "Valuta",
    "installningar.display.currencyNote":
      "Valutan är en etikett på dina belopp. Inga summor räknas om — 250 är 250 oavsett vilken valuta du väljer.",
    "installningar.display.unitLabel": "1 unit i {currency}",
    "installningar.display.maxUnits": "Max {max} units per spel",
    "installningar.display.maxStake": "— högsta insats blir",
    "installningar.display.period": ".",
    "installningar.display.saved": "Sparat.",
    "installningar.display.saving": "Sparar…",
    "installningar.display.save": "Spara",

    // Push till enheten
    "installningar.push.title": "Push till enheten",
    "installningar.push.body": "Meddelanden på låsskärmen, även när Spelbok är stängt.",

    // Fel från servern när visningsinställningar sparas
    "installningar.errors.invalidMode": "Ogiltigt visningsläge.",
    "installningar.errors.invalidCurrency": "Ogiltig valuta.",
    "installningar.errors.unitSize": "Unit-storleken måste vara större än 0.",
    "installningar.errors.notSignedIn": "Du är inte inloggad.",
  },
  hints: {
    "installningar.hero.kpi.netto": "Nyckeltal i mobilens profilhuvud",
    "installningar.hero.sheetPublic": "Märke på spelbok i mobilens lista",
    "installningar.hero.sheetPrivate": "Märke på spelbok i mobilens lista",
    "installningar.hero.sheetBets": "Under spelbokens namn i mobilens lista. {count} är antal spel.",
    "installningar.hero.changeUsername": "Länkrad i mobilens meny",
    "installningar.hero.manageSheets": "Länkrad i mobilens meny",
    "installningar.profile.title": "Rubrik på profilkortet, syns bara på mobil",
    "installningar.profile.bioCount": "Teckenräknare under Om mig. {count} är antal tecken.",
    "installningar.profile.role": "Före användarens roll",
    "installningar.display.unitLabel": "Fältets etikett. {currency} är vald valuta, t.ex. kr.",
    "installningar.display.maxUnits": "Under unit-fältet. {max} är högsta antal units per spel.",
    "installningar.display.maxStake":
      "Fortsättning efter Max-texten, följs av högsta insatsen i valuta",
    "installningar.display.period": "Avslutar meningen om högsta insats",
    "installningar.errors.invalidMode": "Fel när visningsläget i headern sparas",
    "installningar.errors.unitSize": "Visas både i formuläret och från servern",
  },
});
