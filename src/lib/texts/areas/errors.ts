import { defineTextArea } from "../define";

export default defineTextArea({
  id: "errors",
  label: "Felsidor och underhåll",
  description:
    "404, offline, underhållsläge och felmeddelanden när en sida kraschar.",
  paths: ["/sidan-finns-inte", "/offline", "/underhall"],
  texts: {
    "errors.notFound.metaTitle": "Sidan hittades inte · Spelbok",
    "errors.notFound.eyebrow": "404",
    "errors.notFound.title": "Sidan hittades inte",
    "errors.notFound.body":
      "Länken kan vara fel, eller så har sidan tagits bort. Privata spelböcker och borttagna kuponger syns inte heller här.",
    "errors.notFound.home": "Till startsidan",
    "errors.notFound.toplist": "Topplistan",

    // /offline
    "errors.offline.metaTitle": "Offline",
    "errors.offline.brand": "SPELBOK",
    "errors.offline.title": "Du är offline",
    "errors.offline.body":
      "Öppna spel synkas när uppkopplingen är tillbaka. Du kan bläddra i cachade sidor under tiden.",
    "errors.offline.retry": "Försök igen",

    // /underhall
    "errors.maintenance.metaTitle": "Underhåll",
    "errors.maintenance.metaDescription": "Spelbok är tillfälligt nere för underhåll.",
    "errors.maintenance.title": "Underhåll pågår",
    "errors.maintenance.body":
      "Vi jobbar på {site} just nu. Dina spel och din statistik är orörda — appen är tillbaka om en liten stund.",
    "errors.maintenance.adminQuestion": "Är du admin?",
    "errors.maintenance.adminLink": "Logga in i adminpanelen",

    // När spelboken kraschar
    "errors.spelbok.title": "Spelboken",
    "errors.spelbok.body": "Sidan gick inte att visa just nu.",
    "errors.spelbok.retry": "Försök igen",
  },
  hints: {
    "errors.notFound.metaTitle": "Fliktiteln i webbläsaren",
    "errors.offline.metaTitle": "Fliktiteln. Får · Spelbok efter sig.",
    "errors.offline.brand": "Loggan överst på offlinesidan.",
    "errors.maintenance.metaTitle": "Fliktiteln. Får · Spelbok efter sig.",
    "errors.maintenance.metaDescription": "Beskrivningen i sökresultat.",
    "errors.maintenance.body": "{site} är sajtens namn från inställningarna.",
    "errors.maintenance.adminQuestion": "Följs av länken till adminpanelen.",
    "errors.spelbok.title": "Rubriken när spelbokssidan inte gick att visa.",
  },
});
