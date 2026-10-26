import { defineTextArea } from "../define";

export default defineTextArea({
  id: "topplista",
  label: "Topplista",
  description: "Topplistan och placeringar.",
  paths: ["/topplista"],
  texts: {
    "topplista.unknownOwner": "Okänd",
    "topplista.unit.kr": "kr",

    // Huvudlistan, desktop
    "topplista.table.rank": "#",
    "topplista.table.sheet": "Spreadsheet",
    "topplista.table.bets": "Spel",
    "topplista.table.roi": "ROI",
    "topplista.table.netto": "Netto",
    "topplista.table.hitrate": "vinstprocent {hitrate}%",
    "topplista.table.rowAria": "Till spelboken",
    "topplista.table.empty":
      "Inga publika spreadsheets ännu. Markera din bok som publik under Spelboken.",

    // Huvudlistan, mobil
    "topplista.mobile.you": "Du",
    "topplista.mobile.empty": "Inga publika spreadsheets ännu.",

    // Egen placering längst ner på mobil
    "topplista.self.rank": "Du: plats {rank}",

    // Topplistorna under huvudlistan
    "topplista.lists.title": "Topplistor",
    "topplista.lists.subtitle": "Baserat på publika spelböcker",
    "topplista.lists.roi.title": "Topp 10 spelböcker",
    "topplista.lists.roi.subtitle": "ROI · minst {min} avgjorda spel",
    "topplista.lists.roi.empty": "Inga spelböcker kvalar in ännu.",
    "topplista.lists.week.title": "Topp 10 senaste veckan",
    "topplista.lists.week.subtitle": "ROI 7 dagar · minst {min} avgjorda spel",
    "topplista.lists.week.empty": "Inga avgjorda spel den senaste veckan.",
    "topplista.lists.netto.title": "Topp 10 största netto",
    "topplista.lists.netto.subtitle": "Netto i kronor · alla tider",
    "topplista.lists.netto.empty": "Inga spelböcker kvalar in ännu.",
    "topplista.lists.count.title": "Topp 10 flest spel",
    "topplista.lists.count.subtitle": "Loggade spel i publika spelböcker",
    "topplista.lists.count.empty": "Inga loggade spel ännu.",
    "topplista.lists.form.title": "Topp 10 bäst form",
    "topplista.lists.form.subtitle": "Raka vinster just nu · minst {min} i rad",
    "topplista.lists.form.empty": "Ingen har {min} raka vinster just nu.",
    "topplista.lists.form.value": "{streak} raka",
    "topplista.lists.odds.title": "Topp 10 högsta vunna odds",
    "topplista.lists.odds.subtitle": "Högsta odds på ett vunnet spel · singel eller kombination",
    "topplista.lists.odds.empty": "Inga vunna spel ännu.",
  },
  hints: {
    "topplista.unknownOwner": "Visas i stället för spelarnamnet när det saknas",
    "topplista.unit.kr": "Valutan efter beloppen på listan Största netto",
    "topplista.table.rank": "Kolumnrubrik för placeringen",
    "topplista.table.hitrate":
      "Under spelbokens namn, efter spelaren. {hitrate} är vinstprocenten utan decimaler.",
    "topplista.table.rowAria": "Skärmläsartext på raden som länkar till spelboken",
    "topplista.table.empty": "Tomläget i huvudlistan på desktop",
    "topplista.mobile.you": "Efter ditt namn på din egen rad i mobillistan",
    "topplista.mobile.empty": "Tomläget i huvudlistan på mobil",
    "topplista.self.rank":
      "Raden som ligger fast längst ner på mobil när du är utanför topp 5. {rank} är din placering.",
    "topplista.lists.roi.subtitle": "{min} är minsta antal avgjorda spel",
    "topplista.lists.week.subtitle": "{min} är minsta antal avgjorda spel",
    "topplista.lists.form.subtitle": "{min} är minsta antal raka vinster",
    "topplista.lists.form.empty": "{min} är minsta antal raka vinster",
    "topplista.lists.form.value": "Värdet på varje rad. {streak} är antalet raka vinster.",
  },
});
