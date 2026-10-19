import { defineTextArea } from "../define";

export default defineTextArea({
  id: "profil",
  label: "Profil",
  description: "Publika profilsidor.",
  paths: [],
  texts: {
    "profil.header.subtitle": "Publik profil",
    "profil.header.editLink": "Redigera profilbild och bio",
    "profil.bio.label": "Om mig",
    "profil.kpi.bets": "Spel",
    "profil.kpi.netto": "Netto",
    "profil.kpi.roi": "ROI",
    "profil.kpi.hitrate": "Vinstprocent",
    "profil.best.title": "Bästa sport",
    "profil.best.titleWithSport": "Bästa sport: {sport}",
    "profil.best.criteria": "Minst {min} spel · rankas på ROI",
    "profil.best.sport": "Sport",
    "profil.best.league": "Liga",
    "profil.best.stats": "{count} spel · vinstprocent {hitrate}%",
    "profil.best.pending": "{label}: kvalificeras vid {min} satta spel",
    "profil.sheets.empty": "Inga publika spelböcker.",
  },
  hints: {
    "profil.header.subtitle": "Under användarnamnet på profilsidan.",
    "profil.header.editLink":
      "Länk under användarnamnet, syns bara på den egna profilen.",
    "profil.bio.label": "Rubriken ovanför användarens bio.",
    "profil.best.title":
      "Rubriken på rutan Bästa sport när ingen sport har kvalificerats än.",
    "profil.best.titleWithSport":
      "Rubriken på rutan Bästa sport. {sport} är sportens namn.",
    "profil.best.criteria":
      "Till höger om rubriken Bästa sport. {min} är minsta antal spel.",
    "profil.best.sport": "Etiketten på sportraden i Bästa sport.",
    "profil.best.league": "Etiketten på ligaraden i Bästa sport.",
    "profil.best.stats":
      "Under sportens/ligans namn. {count} är antal spel, {hitrate} vinstprocenten.",
    "profil.best.pending":
      "Visas i stället för en rad som inte kvalificerats. {label} är Sport eller Liga, {min} minsta antal spel.",
    "profil.sheets.empty":
      "Visas när användaren inte har några publika spelböcker.",
  },
});
