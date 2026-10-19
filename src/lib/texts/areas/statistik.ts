import { defineTextArea } from "../define";

export default defineTextArea({
  id: "statistik",
  label: "Statistik",
  description: "Nettografen och Fördelning — på Hem och i spelboken.",
  paths: ["/hem", "/spelbok"],
  texts: {
    "statistik.dashboardChart.title": "Ackumulerat netto",
    "statistik.dashboardChart.empty": "Grafen fylls när du sätter resultat.",
    "statistik.dashboardChart.ariaLabel": "Ackumulerat netto över tid",
    "statistik.dashboardChart.legendTotal": "Totalt",
    "statistik.nettoChart.axisLabel": "ackumulerat netto",
    "statistik.nettoChart.legendTotal": "Totalt",
    "statistik.distribution.title": "Fördelning",
    "statistik.distribution.tab.liga": "Liga",
    "statistik.distribution.tab.kategori": "Kategori",
    "statistik.distribution.tab.spelform": "Spelform",
    "statistik.distribution.tab.spelbolag": "Spelbolag",
    "statistik.distribution.tab.sport": "Sport",
    "statistik.distribution.tab.odds": "Odds",
    "statistik.distribution.betsCount": "{count} spel",
    "statistik.distribution.hiddenMore": "+{count} till med färre spel",
    "statistik.distribution.roiNote":
      "ROI visas från fem spel och uppåt. Färre spel säger inget om träffsäkerhet.",
    "statistik.distribution.empty": "Ingen data ännu.",
  },
  hints: {
    "statistik.dashboardChart.title": "Rubriken på nettografen på Hem.",
    "statistik.dashboardChart.empty":
      "Visas i grafen när det inte finns rättade spel i vald period.",
    "statistik.dashboardChart.ariaLabel":
      "Beskrivning av grafen för skärmläsare.",
    "statistik.dashboardChart.legendTotal":
      "Förklaringen till totallinjen under grafen.",
    "statistik.nettoChart.axisLabel":
      "Texten mellan första och sista datumet under den mindre nettografen.",
    "statistik.nettoChart.legendTotal":
      "Förklaringen till totallinjen under den mindre nettografen.",
    "statistik.distribution.title":
      "Rubriken på panelen med flikar (liga, kategori, spelform …).",
    "statistik.distribution.betsCount":
      "Antal spel på en rad i Fördelning. {count} är antalet.",
    "statistik.distribution.hiddenMore":
      "Under listan när fler grupper finns än som visas. {count} är antalet dolda grupper.",
    "statistik.distribution.roiNote": "Den lilla förklaringen under listan.",
    "statistik.distribution.empty": "Visas när det inte finns rättade spel.",
  },
});
