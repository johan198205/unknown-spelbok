import { defineTextArea } from "../define";

export default defineTextArea({
  id: "planket",
  label: "Planket",
  description: "Flödet, inlägg, kommentarer och skrivrutan.",
  paths: ["/planket"],
  texts: {
    // ---------- Sidan ----------
    "planket.meta.title": "Planket",
    "planket.meta.description":
      "Community-flödet i Spelbok. Användare postar spel och kuponger ur sin egen spelbok — och andra kan rygga dem.",

    // ---------- Flödet ----------
    "planket.feed.guest.register": "Skapa ett konto",
    "planket.feed.guest.middle":
      "för att posta, reagera och kommentera på Planket. Har du redan ett?",
    "planket.feed.guest.login": "Logga in",
    "planket.feed.guest.after": ".",
    "planket.feed.newPosts.one": "{count} nytt inlägg",
    "planket.feed.newPosts.other": "{count} nya inlägg",
    "planket.feed.newPosts.show": "Visa",
    "planket.feed.empty": "Inget här ännu. Posta först.",
    "planket.feed.ad": "Annons",
    "planket.feed.loading": "Hämtar…",

    // ---------- Skrivrutan ----------
    "planket.composer.pill": "Skriv till Planket…",
    "planket.composer.placeholder": "Skriv något till Planket…",
    "planket.composer.removeImage": "Ta bort bild",
    "planket.composer.attachBet": "Bifoga spel",
    "planket.composer.betAttached": "Spel bifogat",
    "planket.composer.attachImage": "Bifoga bild",
    "planket.composer.imageAttached": "Bild bifogad",
    "planket.composer.post": "Posta",
    "planket.composer.posting": "Postar…",
    "planket.composer.removeAttachment": "Ta bort bilagan",
    "planket.composer.privateNote":
      "Spelet blir synligt på Planket. Resten av {sheet} förblir privat.",
    "planket.composer.imageNotImage": "Filen måste vara en bild",
    "planket.composer.imageTooLarge": "Max 4 MB",

    // ---------- Bifoga-väljaren ----------
    "planket.picker.tabBook": "Från spelboken",
    "planket.picker.tabNew": "Nytt spel",
    "planket.picker.close": "Stäng väljaren",
    "planket.picker.searchBets": "Sök lag eller marknad…",
    "planket.picker.searchCoupons": "Sök kupong…",
    "planket.picker.loading": "Hämtar…",
    "planket.picker.emptyBets": "Inga spel i spelboken att bifoga.",
    "planket.picker.createNew": "Skapa ett nytt spel",
    "planket.picker.emptyCoupons": "Inga öppna kuponger just nu.",
    "planket.picker.posted": "Postad",
    "planket.picker.privateNote":
      "Spelet blir synligt på Planket. Resten av boken förblir privat.",
    "planket.picker.couponLegs": "{count} spel",

    // ---------- Nytt spel i väljaren ----------
    "planket.newBet.noSheets":
      "Skapa en spelbok först under Spelbok — spelet sparas där när du bifogar det.",
    "planket.newBet.match": "Match",
    "planket.newBet.changeMatch": "Ändra match",
    "planket.newBet.pickLabel": "Speltyp",
    "planket.newBet.customPick": "Eget spel…",
    "planket.newBet.odds": "Odds",
    "planket.newBet.stake": "Insats ({unit})",
    "planket.newBet.bookmaker": "Bolag",
    "planket.newBet.possibleWin": "Möjlig vinst",
    "planket.newBet.savedIn":
      "Spelet sparas i {sheet} och syns på Planket när du postar.",
    "planket.newBet.savedInFallback": "spelboken",
    "planket.newBet.restPrivate": "Resten av boken förblir privat.",
    "planket.newBet.submit": "Bifoga spel",
    "planket.newBet.saving": "Sparar…",
    "planket.newBet.sheetFallback": "Spelbok",
    "planket.newBet.errorPick": "Välj match och speltyp.",
    "planket.newBet.errorOdds": "Ange giltiga odds.",
    "planket.newBet.errorSave": "Kunde inte spara spelet.",

    // ---------- Inläggskortet ----------
    "planket.post.editorial": "Redaktionens spel",
    "planket.post.pinned": "· Fäst överst",
    "planket.post.edited": "· redigerat",
    "planket.post.sheetBets": "{count} spel",
    "planket.post.save": "Spara",
    "planket.post.saving": "Sparar…",
    "planket.post.cancel": "Avbryt",
    "planket.post.back": "Rygga spelet",
    "planket.post.settled": "Avgjort",
    "planket.post.started": "Avspark passerad",

    // ---------- Reaktioner ----------
    "planket.reactions.fire": "Het",
    "planket.reactions.thumb": "Tummen upp",
    "planket.reactions.loginAria": "{label} – logga in för att reagera",
    "planket.reactions.loginTitle": "Logga in för att reagera",

    // ---------- ···-menyn ----------
    "planket.menu.more": "Fler val",
    "planket.menu.report": "Anmäl",
    "planket.menu.copyLink": "Kopiera länk",
    "planket.menu.edit": "Redigera",
    "planket.menu.delete": "Ta bort",
    "planket.menu.reasonHeading": "Anledning",
    "planket.menu.copied": "Länken är kopierad.",
    "planket.menu.copyFailed": "Kunde inte kopiera länken.",
    "planket.menu.reported": "Tack — anmälan är skickad till redaktionen.",
    "planket.menu.confirmDelete": "Ta bort inlägget?",
    "planket.menu.deleted": "Inlägget är borttaget.",

    // ---------- Anmälningsorsaker ----------
    "planket.report.spam": "Spam",
    "planket.report.offensive": "Kränkande",
    "planket.report.misleading": "Vilseledande",
    "planket.report.bad_link": "Fel spelbolagslänk",

    // ---------- Tråden ----------
    "planket.thread.hide": "Dölj diskussion",
    "planket.thread.count.one": "{count} kommentar",
    "planket.thread.count.other": "{count} kommentarer",
    "planket.thread.open": "Svara / diskutera",
    "planket.thread.delete": "Ta bort",
    "planket.thread.deleting": "Tar bort…",
    "planket.thread.confirmDelete": "Ta bort din kommentar?",
    "planket.thread.placeholder": "Skriv ett svar… (länkar är inte klickbara)",
    "planket.thread.submit": "Svara",
    "planket.thread.guest.login": "Logga in",
    "planket.thread.guest.or": "eller",
    "planket.thread.guest.register": "skapa ett konto",
    "planket.thread.guest.after": "för att kommentera.",
    "planket.thread.authorFallback": "användare",

    // ---------- Spelkortet ----------
    "planket.bet.odds": "Odds",
    "planket.bet.market": "Marknad",
    "planket.bet.stake": "Insats",
    "planket.bet.settled": "RÄTTAT",
    "planket.bet.outcomeWin": "Vinst {amount}",
    "planket.bet.outcomeLoss": "Förlust {amount}",
    "planket.bet.outcomeVoid": "Void {amount}",
    "planket.bet.verified": "Verifierad",
    "planket.bet.verifiedTitle": "Loggat i spelboken före avspark",
    "planket.bet.verifiedAria": "Verifierad — loggat i spelboken före avspark",
    "planket.bet.roiTitle": "ROI i spelboken",

    // ---------- Kupongkortet ----------
    "planket.coupon.label": "Kupong",
    "planket.coupon.metaCombo": "{count} spel · Kombination",
    "planket.coupon.metaSingle": "{count} spel · Enkel",
    "planket.coupon.totalOdds": "Totalodds",
    "planket.coupon.stake": "Insats",
    "planket.coupon.outcome": "Utfall",
    "planket.coupon.possibleWin": "Möjlig vinst",

    // ---------- Tid och enheter ----------
    "planket.time.today": "Idag {time}",
    "planket.time.tomorrow": "Imorgon {time}",
    "planket.age.now": "just nu",
    "planket.age.minutes": "för {count} min",
    "planket.age.hours.one": "för {count} timme",
    "planket.age.hours.other": "för {count} timmar",
    "planket.age.days.one": "för {count} dag",
    "planket.age.days.other": "för {count} dagar",
    "planket.units.kr": "kr",

    // ---------- Felmeddelanden ----------
    "planket.errors.auth": "Du måste vara inloggad.",
    "planket.errors.duplicate": "Det där är redan gjort.",
    "planket.errors.rateLimit.one":
      "Du har postat mycket på kort tid. Försök igen om {minutes} minut.",
    "planket.errors.rateLimit.other":
      "Du har postat mycket på kort tid. Försök igen om {minutes} minuter.",
    "planket.errors.maxBody": "Max {max} tecken.",
    "planket.errors.pickBet": "Välj ett spel att bifoga.",
    "planket.errors.pickCoupon": "Välj en kupong att bifoga.",
    "planket.errors.emptyPost": "Skriv något, bifoga en bild eller ett spel.",
    "planket.errors.postFailed": "Kunde inte posta.",
    "planket.errors.replyEmpty": "Skriv ett svar.",
    "planket.errors.replySaveFailed": "Kunde inte spara svaret.",
    "planket.errors.replyDeleteFailed": "Kunde inte ta bort svaret.",
    "planket.errors.replyNotFound": "Svaret hittades inte.",
    "planket.errors.postNotFound": "Inlägget hittades inte.",
    "planket.errors.deleteFailed": "Kunde inte ta bort inlägget.",
    "planket.errors.reactionRemoveFailed": "Kunde inte ta bort reaktionen.",
    "planket.errors.reactionSaveFailed": "Kunde inte spara reaktionen.",
    "planket.errors.backPickSheet": "Välj en av dina egna spelböcker.",
    "planket.errors.backPostGone": "Inlägget finns inte längre.",
    "planket.errors.backNoAttachment": "Inlägget har inget spel att rygga.",
    "planket.errors.backAlready": "Du har redan ryggat det här inlägget.",
    "planket.errors.backSettled": "Spelet är redan rättat.",
    "planket.errors.backStarted": "Avspark passerad",
    "planket.errors.backCouponGone": "Kupongen finns inte längre.",
    "planket.errors.backCouponEmpty": "Kupongen saknar spel.",
    "planket.errors.backAlreadyBooked": "Du har redan bokfört det här spelet.",
    "planket.errors.backBookFailed": "Kunde inte lägga spelet i spelboken.",
    "planket.errors.backRegisterFailed": "Kunde inte registrera ryggningen.",
    "planket.errors.reportReason": "Välj en anledning.",
    "planket.errors.reportFailed": "Kunde inte skicka anmälan.",

    // ---------- Notiser ----------
    "planket.notify.backTitle": "{username} ryggade ditt spel",
    "planket.notify.backBody": "{match} · {pick} @ {odds}",
    "planket.notify.backerFallback": "Någon",
    "planket.notify.reaction.one": "Någon reagerade på ditt inlägg",
    "planket.notify.reaction.other": "{count} personer reagerade på ditt inlägg",
  },
  hints: {
    "planket.meta.title": "Fliktiteln i webbläsaren",
    "planket.meta.description": "Beskrivningen i sökmotorer och vid delning",
    "planket.feed.guest.register":
      "Länktext i rutan överst för utloggade, först i meningen",
    "planket.feed.guest.middle":
      "Texten mellan länkarna Skapa ett konto och Logga in i rutan för utloggade",
    "planket.feed.guest.login": "Länktext i rutan för utloggade",
    "planket.feed.guest.after": "Det som står efter länken Logga in",
    "planket.feed.newPosts.one":
      "Bannern när ett nytt inlägg kommit. {count} är antalet",
    "planket.feed.newPosts.other":
      "Bannern när flera nya inlägg kommit. {count} är antalet",
    "planket.feed.newPosts.show": "Knappen i bannern om nya inlägg",
    "planket.feed.empty": "Visas när flödet saknar inlägg",
    "planket.feed.ad": "Märkningen ovanför annonser i mobilflödet",
    "planket.feed.loading": "Visas medan fler inlägg hämtas",
    "planket.composer.pill": "Den hopfällda skrivrutan på mobil",
    "planket.composer.removeAttachment":
      "Tooltip och skärmläsartext på ×-knappen över ett bifogat spel",
    "planket.composer.privateNote":
      "Gul not när det bifogade spelet kommer ur en privat spelbok. {sheet} är spelbokens namn",
    "planket.composer.imageNotImage": "Felmeddelande när filen inte är en bild",
    "planket.composer.imageTooLarge": "Felmeddelande när bilden är för stor",
    "planket.picker.close": "Skärmläsartext på ×-knappen i väljaren",
    "planket.picker.posted": "Märkning på spel som redan postats",
    "planket.picker.privateNote": "Gul not på spel ur en privat spelbok",
    "planket.picker.couponLegs": "Antal spel på en kupong i väljaren. {count} är antalet",
    "planket.newBet.noSheets": "Visas när användaren saknar spelbok",
    "planket.newBet.match": "Visas i stället för ligan när matchen saknar liga",
    "planket.newBet.stake":
      "Etikett över insatsfältet. {unit} är enheten, t.ex. kr eller units",
    "planket.newBet.bookmaker": "Rubrik över spelbolagsknapparna",
    "planket.newBet.savedIn":
      "Not under formuläret. {sheet} är spelbokens namn",
    "planket.newBet.savedInFallback":
      "Används i noten när spelboken saknar namn",
    "planket.newBet.restPrivate":
      "Läggs till efter noten när spelboken är privat",
    "planket.newBet.sheetFallback":
      "Spelbokens namn när det saknas, i noten om privat spelbok",
    "planket.post.editorial": "Rubriken på inlägg från redaktionen",
    "planket.post.pinned": "Efter Redaktionens spel när inlägget är fäst",
    "planket.post.edited": "Efter inläggets ålder när det redigerats",
    "planket.post.sheetBets":
      "Antal spel i författarens spelbok, i inläggets huvud. {count} är antalet",
    "planket.post.back": "Knappen som skickar vidare till spelbolaget",
    "planket.post.settled": "I stället för Rygga spelet när spelet är avgjort",
    "planket.post.started":
      "I stället för Rygga spelet när matchen har börjat",
    "planket.reactions.fire": "Skärmläsarnamn på 🔥-knappen",
    "planket.reactions.thumb": "Skärmläsarnamn på 👍-knappen",
    "planket.reactions.loginAria":
      "Skärmläsartext på reaktionsknappen för utloggade. {label} är reaktionens namn",
    "planket.reactions.loginTitle": "Tooltip på reaktionsknappen för utloggade",
    "planket.menu.more": "Skärmläsartext på ···-knappen",
    "planket.menu.reasonHeading": "Rubrik över anmälningsorsakerna",
    "planket.menu.copied": "Notis när länken kopierats",
    "planket.menu.copyFailed": "Notis när länken inte gick att kopiera",
    "planket.menu.reported": "Notis när anmälan skickats",
    "planket.menu.confirmDelete": "Bekräftelsedialog innan inlägget tas bort",
    "planket.menu.deleted": "Notis när inlägget tagits bort",
    "planket.report.bad_link": "Anmälningsorsak, syns även i admin",
    "planket.thread.count.one":
      "Knappen under inlägget med en kommentar. {count} är antalet",
    "planket.thread.count.other":
      "Knappen under inlägget med flera kommentarer. {count} är antalet",
    "planket.thread.open": "Knappen under inlägget när det saknar kommentarer",
    "planket.thread.confirmDelete": "Bekräftelsedialog innan kommentaren tas bort",
    "planket.thread.guest.login": "Länktext under tråden för utloggade",
    "planket.thread.guest.or": "Mellan länkarna under tråden för utloggade",
    "planket.thread.guest.register": "Länktext under tråden för utloggade",
    "planket.thread.guest.after": "Efter länkarna under tråden för utloggade",
    "planket.thread.authorFallback":
      "Visas som namn när kommentarens författare saknar användarnamn",
    "planket.bet.settled": "Etikett före utfallet på ett rättat spel",
    "planket.bet.outcomeWin": "Utfall på vunnet spel. {amount} är nettot, t.ex. +1 196 kr",
    "planket.bet.outcomeLoss": "Utfall på förlorat spel. {amount} är nettot, t.ex. −1 300 kr",
    "planket.bet.outcomeVoid": "Utfall på void-spel. {amount} är 0 kr",
    "planket.bet.verified": "Grön badge på spel loggade före avspark",
    "planket.bet.verifiedTitle": "Tooltip på Verifierad-badgen",
    "planket.bet.verifiedAria": "Skärmläsartext på bocken (mobil)",
    "planket.bet.roiTitle": "Tooltip på ROI-badgen vid författarens namn",
    "planket.coupon.metaCombo":
      "Överraden på en kupong med flera spel. {count} är antalet",
    "planket.coupon.metaSingle":
      "Överraden på en kupong med ett spel. {count} är antalet",
    "planket.time.today": "Avsparkstid idag. {time} är klockslaget",
    "planket.time.tomorrow": "Avsparkstid imorgon. {time} är klockslaget",
    "planket.age.now": "Inläggets ålder under en minut",
    "planket.age.minutes": "Inläggets ålder. {count} är antal minuter",
    "planket.age.hours.one": "Inläggets ålder. {count} är 1",
    "planket.age.hours.other": "Inläggets ålder. {count} är antal timmar",
    "planket.age.days.one": "Inläggets ålder. {count} är 1",
    "planket.age.days.other": "Inläggets ålder. {count} är antal dagar",
    "planket.units.kr": "Valutan efter belopp på Planket",
    "planket.errors.duplicate": "När något redan är gjort, t.ex. dubbelpostning",
    "planket.errors.rateLimit.one":
      "När användaren postat för mycket. {minutes} är minuter kvar (1)",
    "planket.errors.rateLimit.other":
      "När användaren postat för mycket. {minutes} är minuter kvar",
    "planket.errors.maxBody": "{max} är teckentaket",
    "planket.errors.backStarted": "Fel när man försöker rygga efter avspark",
    "planket.notify.backTitle":
      "Notisrubrik till författaren när någon ryggat. {username} är den som ryggade",
    "planket.notify.backBody":
      "Notistext vid ryggning. {match} är matchen, {pick} speltypen, {odds} oddset",
    "planket.notify.backerFallback":
      "Används som namn i ryggningsnotisen när användarnamn saknas",
    "planket.notify.reaction.one": "Notisrubrik när en person reagerat",
    "planket.notify.reaction.other":
      "Notisrubrik när flera reagerat inom samma timme. {count} är antalet",
  },
});
