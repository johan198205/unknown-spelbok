import { defineTextArea } from "../define";

export default defineTextArea({
  id: "kontakt",
  label: "Kontakt",
  description: "Kontaktformuläret. Sidans övriga innehåll redigeras under Sidor → Kontakt.",
  paths: ["/kontakt"],
  texts: {
    // Formulärets huvud
    "kontakt.form.title": "Skicka ett meddelande",
    "kontakt.form.subtitle": "Vi svarar till den e-post du anger.",
    "kontakt.form.honeypot": "Webbplats",

    // Fält
    "kontakt.form.name": "Namn",
    "kontakt.form.email": "E-post",
    "kontakt.form.topic": "Ärende",
    "kontakt.form.message": "Meddelande",
    "kontakt.form.counter": "{count}/{max}",

    // Ärenden
    "kontakt.topics.support": "Support",
    "kontakt.topics.account": "Konto och data",
    "kontakt.topics.bookmakers": "Spelbolagslistan",
    "kontakt.topics.ads": "Annonsering",
    "kontakt.topics.press": "Press",
    "kontakt.topics.other": "Annat",
    "kontakt.form.bookmakersNotice":
      "Vi ändrar aldrig betyg eller rankning mot ersättning. Skriv gärna, men vet att listan bygger på vår egen bedömning.",

    // Samtycke, kvitto och knapp
    "kontakt.form.consent":
      "Jag godkänner att Spelboken sparar mitt meddelande och min e-post för att kunna svara. Uppgifterna raderas inom 12 månader.",
    "kontakt.form.sent":
      "Tack, meddelandet är skickat. Du får en kopia till din e-post. Vi hör av oss inom 24 timmar på vardagar.",
    "kontakt.form.submit": "Skicka meddelande",
    "kontakt.form.submitting": "Skickar…",
    "kontakt.form.submitted": "Skickat",

    // Felmeddelanden, i formuläret och från servern
    "kontakt.errors.nameEmail": "Fyll i namn och e-post så vi kan svara.",
    "kontakt.errors.email": "E-postadressen ser inte rätt ut.",
    "kontakt.errors.message": "Skriv ett meddelande.",
    "kontakt.errors.consent":
      "Du behöver godkänna att vi sparar meddelandet för att kunna svara.",
    "kontakt.errors.generic": "Något gick fel. Försök igen om en stund.",
    "kontakt.errors.badRequest": "Ogiltig begäran.",
    "kontakt.errors.rateLimit": "För många meddelanden. Försök igen om en stund.",
    "kontakt.errors.topic": "Ogiltigt ärende.",
    "kontakt.errors.tooLong": "Meddelandet är för långt.",
    "kontakt.errors.saveFailed": "Kunde inte spara meddelandet. Försök igen.",
  },
  hints: {
    "kontakt.form.honeypot": "Dold etikett för skräppostfällan. Syns inte för besökare.",
    "kontakt.form.counter": "Teckenräknare. {count} är antal tecken, {max} är maxlängden.",
    "kontakt.topics.support": "Knapp under Ärende",
    "kontakt.topics.bookmakers": "Knapp under Ärende",
    "kontakt.form.bookmakersNotice": "Visas när ärendet Spelbolagslistan är valt",
    "kontakt.form.sent": "Kvittot efter att meddelandet skickats",
    "kontakt.form.submitted": "Knappen efter att meddelandet skickats",
    "kontakt.errors.generic": "När servern inte svarar",
    "kontakt.errors.saveFailed": "När meddelandet inte kunde sparas i databasen",
  },
});
