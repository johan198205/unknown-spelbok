import { defineTextArea } from "../define";

export default defineTextArea({
  id: "pwa",
  label: "App och onboarding",
  description:
    "Installera appen, onboarding, offline-banner och knappen för push-notiser.",
  paths: ["/hem", "/installningar"],
  texts: {
    // Rutan "Lägg till på hemskärmen"
    "pwa.install.title": "Lägg till på hemskärmen",
    "pwa.install.subtitle": "Fullskärm, snabbare start",
    "pwa.install.add": "Lägg till",
    "pwa.install.close": "Stäng",
    "pwa.install.ios.step1": "1. Tryck på Dela-ikonen i Safari",
    "pwa.install.ios.step2": "2. Välj ”Lägg till på hemskärmen”",
    "pwa.install.ios.step3": "3. Bekräfta med Lägg till",

    // Onboarding i mobil
    "pwa.onboarding.skip": "Hoppa över",
    "pwa.onboarding.slide1.title": "Logga dina spel",
    "pwa.onboarding.slide1.body":
      "Svep för att sätta resultat och håll koll på varje tipp i spelkorten.",
    "pwa.onboarding.demo.league": "Premier League",
    "pwa.onboarding.demo.match": "Liverpool – Arsenal",
    "pwa.onboarding.demo.pick": "Ö2.5",
    "pwa.onboarding.slide2.title": "Följ din utveckling",
    "pwa.onboarding.slide2.body":
      "Se ackumulerat netto, ROI och vinstprocent växa över tid.",
    "pwa.onboarding.slide3.title": "Tävla mot andra",
    "pwa.onboarding.slide3.body":
      "Jämför dig i topplistorna mot andra publika spelböcker.",
    "pwa.onboarding.demo.row1": "1 · Anna +12%",
    "pwa.onboarding.demo.row2": "2 · Du +8%",
    "pwa.onboarding.demo.row3": "3 · Erik +3%",
    "pwa.onboarding.next": "Nästa",
    "pwa.onboarding.start": "Kom igång",

    "pwa.offlineBanner": "Offline — dina spel sparas lokalt och synkas automatiskt",

    // Push-notiser (inställningar)
    "pwa.push.unsupported": "Notiser kräver att appen är installerad på hemskärmen.",
    "pwa.push.denied":
      "Du har blockerat notiser. Aktivera dem i webbläsarens inställningar för att kunna ta emot push.",
    "pwa.push.active": "Notiser aktiverade",
    "pwa.push.disabling": "Stänger av…",
    "pwa.push.disable": "Stäng av",
    "pwa.push.enabling": "Aktiverar…",
    "pwa.push.enable": "Aktivera notiser",
    "pwa.push.error.noKeys": "Push-nycklar saknas. Kontakta admin.",
    "pwa.push.error.notGranted": "Notiser godkändes inte.",
    "pwa.push.error.saveFailed": "Kunde inte spara prenumerationen.",
    "pwa.push.error.enableFailed": "Kunde inte aktivera notiser.",
    "pwa.push.error.disableFailed": "Kunde inte stänga av notiser.",
  },
  hints: {
    "pwa.install.title": "Rutan som dyker upp i mobil efter tre spel.",
    "pwa.install.close": "Skärmläsartext på krysset.",
    "pwa.install.ios.step1": "Instruktionen som visas på iPhone efter tryck på Lägg till.",
    "pwa.onboarding.demo.league": "Exempelkortet på första bilden.",
    "pwa.onboarding.demo.row1": "Exempeltopplistan på tredje bilden.",
    "pwa.onboarding.next": "Knappen nere till höger.",
    "pwa.onboarding.start": "Knappen på sista bilden.",
    "pwa.offlineBanner": "Bannern i mobil när uppkopplingen saknas.",
    "pwa.push.unsupported": "När webbläsaren inte stöder push.",
    "pwa.push.denied": "När notiser är blockerade i webbläsaren.",
    "pwa.push.disabling": "Knappen medan notiserna stängs av.",
    "pwa.push.enabling": "Knappen medan notiserna aktiveras.",
    "pwa.push.error.noKeys": "Felmeddelande när servern saknar push-nycklar.",
    "pwa.push.error.saveFailed": "När servern inte svarar med eget fel.",
  },
});
