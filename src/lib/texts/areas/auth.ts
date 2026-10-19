import { defineTextArea } from "../define";

export default defineTextArea({
  id: "auth",
  label: "Logga in och registrera",
  description: "Inloggning, registrering och utloggning.",
  paths: ["/login", "/registrera"],
  texts: {
    "auth.brand": "SPELBOK",
    "auth.loading": "LADDAR …",
    "auth.tabs.login": "Logga in",
    "auth.tabs.register": "Registrera",
    "auth.google.loading": "Öppnar Google …",
    "auth.google.login": "Logga in med Google",
    "auth.google.register": "Fortsätt med Google",
    "auth.divider": "eller",

    // Efter registrering när e-posten måste bekräftas
    "auth.confirm.title": "Bekräfta din e-post",
    "auth.confirm.before": "Vi har skickat en bekräftelselänk till",
    "auth.confirm.after":
      ". Klicka på länken i mejlet för att aktivera kontot. Hittar du det inte, titta i skräpposten.",
    "auth.confirm.otherEmail": "Använd en annan e-postadress",

    // Formuläret
    "auth.field.username": "Användarnamn",
    "auth.field.usernamePlaceholder": "t.ex. valuejagaren",
    "auth.field.email": "E-post",
    "auth.field.emailPlaceholder": "namn@exempel.se",
    "auth.field.password": "Lösenord",
    "auth.field.passwordPlaceholder": "••••••••",
    "auth.submit.loading": "Vänta…",
    "auth.submit.login": "Logga in",
    "auth.submit.register": "Skapa konto",
    "auth.error.emailTaken":
      "Det finns redan ett konto med den e-postadressen. Logga in i stället.",
    "auth.error.generic": "Något gick fel",
    "auth.back": "Tillbaka till startsidan",

    // /registrera när registreringen är stängd
    "auth.closed.badge": "STÄNGD",
    "auth.closed.title": "Registreringen är stängd",
    "auth.closed.body":
      "Just nu tar vi inte emot nya konton på {site}. Har du redan ett konto kan du logga in som vanligt.",
    "auth.closed.login": "Logga in",
  },
  hints: {
    "auth.brand": "Loggan ovanför formuläret.",
    "auth.loading": "Visas en kort stund medan formuläret laddas.",
    "auth.tabs.login": "Fliken överst i formuläret.",
    "auth.google.loading": "Google-knappen medan Google öppnas.",
    "auth.google.login": "Google-knappen på /login.",
    "auth.google.register": "Google-knappen på /registrera.",
    "auth.divider": "Mellan Google-knappen och formuläret.",
    "auth.confirm.before": "Följs av e-postadressen i fetstil.",
    "auth.confirm.after": "Står direkt efter e-postadressen.",
    "auth.submit.loading": "Skicka-knappen medan inloggningen pågår.",
    "auth.submit.login": "Skicka-knappen på /login.",
    "auth.submit.register": "Skicka-knappen på /registrera.",
    "auth.error.emailTaken": "När e-postadressen redan har ett konto.",
    "auth.error.generic": "När felet saknar eget meddelande.",
    "auth.back": "Länken under formuläret.",
    "auth.closed.badge": "Etiketten överst i rutan när registreringen är stängd.",
    "auth.closed.body": "{site} är sajtens namn från inställningarna.",
  },
});
