import { defineTextArea } from "../define";

export default defineTextArea({
  id: "landing",
  label: "Startsida",
  description: "Delar av startsidan som inte redigeras under Sidor → Startsida.",
  paths: ["/"],
  texts: {
    // Topplistan
    "landing.leaderboard.unknownOwner": "Okänd",
    "landing.leaderboard.rowMeta": "· {bets} spel · vinstprocent {hitrate}%",
    "landing.leaderboard.empty": "Inga publika spreadsheets ännu.",

    // Tävlingsrutan
    "landing.competition.none": "Ingen tävling just nu",
    "landing.competition.live": "Pågår",
    "landing.competition.noneBody": "Admin kan skapa tävlingar under Admin → Tävlingar.",
  },
  hints: {
    "landing.leaderboard.unknownOwner": "Ägarens namn när spelboken saknar användarnamn",
    "landing.leaderboard.rowMeta":
      "Efter ägarens namn på varje rad. {bets} är antal spel, {hitrate} är vinstprocenten.",
    "landing.leaderboard.empty": "När det inte finns några publika spelböcker",
    "landing.competition.none": "Rubrik när ingen tävling är aktiv",
    "landing.competition.live": "Märke på aktiv tävling",
    "landing.competition.noneBody": "Text när ingen tävling är aktiv",
  },
});
