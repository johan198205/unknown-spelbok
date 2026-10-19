import { defineTextArea } from "../define";

export default defineTextArea({
  id: "hem",
  label: "Hem",
  description: "Dashboarden för inloggade.",
  paths: ["/hem"],
  texts: {
    "hem.header.greeting": "Hej {name}",
    "hem.header.greetingFallback": "spelare",
    "hem.header.summary":
      "totalt netto · {sheets} spreadsheets · {bets} spel",
    "hem.kpi.netto": "Netto",
    "hem.kpi.roi": "ROI",
    "hem.kpi.roiThinNote": "litet underlag",
    "hem.kpi.hitrate": "Vinstprocent",
    "hem.kpi.hitrateThinNote": "{count} rättade",
    "hem.kpi.stake": "Omsättning",
    "hem.kpi.bets": "Spel",
    "hem.kpi.open": "Levande",
    "hem.sheets.title": "Mina spreadsheets",
    "hem.sheets.manage": "Hantera",
    "hem.sheets.public": "Publik",
    "hem.sheets.private": "Privat",
    "hem.sheets.roi": "ROI",
    "hem.sheets.bets": "Spel",
    "hem.sheets.netto": "Netto",
    "hem.sheets.empty": "Skapa din första spelbok under Spelboken.",
    "hem.recent.title": "Senaste resultat",
    "hem.recent.empty": "Inga rättade spel ännu.",
  },
  hints: {
    "hem.header.greeting":
      "Hälsningen ovanför det stora nettobeloppet. {name} är användarnamnet.",
    "hem.header.greetingFallback":
      "Används som {name} i hälsningen när användarnamn saknas.",
    "hem.header.summary":
      "Raden under nettobeloppet. {sheets} är antal spreadsheets, {bets} antal spel.",
    "hem.kpi.roiThinNote":
      "Liten text under ROI-rutan när det finns färre än 20 spel.",
    "hem.kpi.hitrateThinNote":
      "Liten text under Vinstprocent när det finns färre än 20 spel. {count} är antal rättade spel.",
    "hem.kpi.open": "Rutan med antal spel som ännu inte är rättade.",
    "hem.sheets.manage": "Länken till inställningar bredvid Mina spreadsheets.",
    "hem.sheets.public": "Märket på en spelbok som är publik.",
    "hem.sheets.private": "Märket på en spelbok som är privat.",
    "hem.sheets.roi": "Kolumnrubrik på varje spelboksrad.",
    "hem.sheets.bets": "Kolumnrubrik på varje spelboksrad.",
    "hem.sheets.netto": "Kolumnrubrik på varje spelboksrad.",
    "hem.sheets.empty": "Visas när användaren inte har någon spelbok.",
    "hem.recent.empty": "Visas under Senaste resultat när inget spel är rättat.",
  },
});
