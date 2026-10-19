import { defineTextArea } from "../define";

export default defineTextArea({
  id: "forslag",
  label: "Matchförslag",
  description: "Dagens förslag, matcher för dig och AI-motiveringar.",
  paths: ["/hem", "/spelbok"],
  texts: {
    "forslag.daily.titleAccount": "Dagens matcher för dig",
    "forslag.daily.titleSheet": "Dagens matcher för spelboken",
    "forslag.daily.disclaimer":
      "Matcherna är valda utifrån din egen spelhistorik och är värda att kolla upp. Ingen prognos av utfallet.",
    "forslag.card.dismissAria": "Dölj {home} – {away}",
    "forslag.card.scoreTitle":
      "Matchpoäng: hur väl matchen stämmer med din spelhistorik (0–100)",
    "forslag.card.scoreSuffix": "/100",
    "forslag.forYou.title": "Matcher för dig",
    "forslag.forYou.scoreLabel": "Matchning",
    "forslag.forYou.dismissAria": "Dölj {home} – {away}",
    "forslag.forYou.disclaimer":
      "Matchningen visar hur nära matchen ligger din egen spelhistorik. Ingen prognos av utfallet.",
    "forslag.ai.button": "AI-analys",
    "forslag.ai.buttonTitle":
      "Kort motivering av varför matchen passar din historik",
    "forslag.ai.limitReached": "Dagens AI-analyser är slut ({limit}/dag)",
    "forslag.ai.failed": "Kunde inte generera just nu",
    "forslag.ai.loadingAria": "Genererar AI-analys",
    "forslag.ai.badge": "AI",
  },
  hints: {
    "forslag.daily.titleAccount": "Rubriken över förslagskorten på Hem.",
    "forslag.daily.titleSheet": "Rubriken över förslagskorten i en spelbok.",
    "forslag.daily.disclaimer": "Den lilla texten under förslagskorten på Hem.",
    "forslag.card.dismissAria":
      "Skärmläsartext på krysset på ett förslagskort. {home} och {away} är lagnamnen.",
    "forslag.card.scoreTitle":
      "Tooltip när man håller över poängen uppe till höger på ett förslagskort.",
    "forslag.card.scoreSuffix": "Står direkt efter poängen på förslagskortet.",
    "forslag.forYou.scoreLabel": "Etiketten under poängen i Matcher för dig.",
    "forslag.forYou.dismissAria":
      "Skärmläsartext på krysset i Matcher för dig. {home} och {away} är lagnamnen.",
    "forslag.forYou.disclaimer": "Den lilla texten under Matcher för dig.",
    "forslag.ai.button": "Knappen som genererar en AI-motivering.",
    "forslag.ai.buttonTitle": "Tooltip på AI-analys-knappen.",
    "forslag.ai.limitReached":
      "Notis och tooltip när dagens AI-analyser är slut. {limit} är antal analyser per dag.",
    "forslag.ai.failed": "Notis när AI-motiveringen inte gick att generera.",
    "forslag.ai.loadingAria":
      "Skärmläsartext medan AI-motiveringen genereras.",
    "forslag.ai.badge": "Märket ovanför en genererad AI-motivering.",
  },
});
