import { defineTextArea } from "../define";

export default defineTextArea({
  id: "tavlingar",
  label: "Tävlingar",
  description: "Tävlingssidan och topplistor för tävlingar.",
  paths: ["/tavlingar"],
  texts: {
    // Sidhuvud och flikar
    "tavlingar.page.title": "Tävlingar",
    "tavlingar.page.intro": "Anmäl dig och tävla på ROI under tävlingsperioden.",
    "tavlingar.tabs.toplist": "Topplista",
    "tavlingar.tabs.competitions": "Tävlingar",
    "tavlingar.page.empty":
      "Inga aktiva tävlingar. En admin kan skapa dem under Admin → Tävlingar.",

    // Tävlingskortet
    "tavlingar.status.live": "Pågår",
    "tavlingar.status.upcoming": "Planerad",
    "tavlingar.status.done": "Avslutad",
    "tavlingar.card.entrants": "{count} deltagare",
    "tavlingar.countdown.done": "Avslutad",
    "tavlingar.countdown.startsTomorrow": "Startar i morgon",
    "tavlingar.countdown.startsIn": "Startar om {days} dagar",
    "tavlingar.countdown.endsToday": "Slutar i dag",
    "tavlingar.countdown.endsTomorrow": "Slutar i morgon",
    "tavlingar.countdown.endsIn": "Slutar om {days} dagar",
    "tavlingar.rules.summary": "Kvalificering: {rules}",
    "tavlingar.rules.minBets": "minst {count} spel",
    "tavlingar.rules.minStake": "minst {stake} i insats",
    "tavlingar.unit.kr": "kr",
    "tavlingar.card.prize": "Pris: {prize}",
    "tavlingar.join.join": "Gå med",
    "tavlingar.join.joined": "Du är med",
    "tavlingar.self.rank": "Du: plats {rank}",
    "tavlingar.self.notQualified": "Du: ej kvalificerad ännu",

    // Deltagarlistan
    "tavlingar.board.empty": "Inga deltagare ännu.",
    "tavlingar.unknownUser": "Okänd",
    "tavlingar.board.you": "Du",
    "tavlingar.board.notQualified": "Ej kvalificerad",
    "tavlingar.missing.bets": "{count} spel kvar",
    "tavlingar.missing.stake": "{stake} kvar i insats",
    "tavlingar.board.bets": "{count} spel",
  },
  hints: {
    "tavlingar.tabs.toplist": "Flikarna överst på mobil",
    "tavlingar.tabs.competitions": "Flikarna överst på mobil",
    "tavlingar.page.empty": "Tomläget när inga tävlingar är aktiva",
    "tavlingar.status.live": "Statusbadgen bredvid tävlingens namn",
    "tavlingar.status.upcoming": "Statusbadgen bredvid tävlingens namn",
    "tavlingar.status.done": "Statusbadgen bredvid tävlingens namn",
    "tavlingar.card.entrants": "Raden under namnet. {count} är antalet deltagare.",
    "tavlingar.countdown.done": "Sist på raden under namnet när tävlingen är slut",
    "tavlingar.countdown.startsIn": "{days} är dagar kvar till start",
    "tavlingar.countdown.endsIn": "{days} är dagar kvar till slut",
    "tavlingar.rules.summary":
      "Kvalkraven under tävlingens namn. {rules} är kraven nedan, åtskilda med ·.",
    "tavlingar.rules.minBets": "Ett av kvalkraven. {count} är minsta antal spel.",
    "tavlingar.rules.minStake": "Ett av kvalkraven. {stake} är minsta insats i kr.",
    "tavlingar.unit.kr": "Valutan efter insatsbelopp i kvalkraven",
    "tavlingar.card.prize": "{prize} är priset som admin angett",
    "tavlingar.join.join": "Knappen när du inte är anmäld",
    "tavlingar.join.joined": "Knappen när du är anmäld",
    "tavlingar.self.rank":
      "Mobil, under topp 3 när du ligger längre ner. {rank} är din placering.",
    "tavlingar.self.notQualified": "Mobil, under topp 3 när du inte kvalat in",
    "tavlingar.unknownUser": "Visas i stället för användarnamnet när det saknas",
    "tavlingar.board.you": "Efter ditt namn på din egen rad",
    "tavlingar.board.notQualified": "Under namnet på deltagare som inte kvalat in",
    "tavlingar.missing.bets":
      "Efter Ej kvalificerad. {count} är antalet spel som saknas.",
    "tavlingar.missing.stake": "Efter Ej kvalificerad. {stake} är insatsen som saknas.",
    "tavlingar.board.bets": "Antal spel på raden. {count} är antalet.",
  },
});
