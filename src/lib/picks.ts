import { SPORT_LABELS } from "@/lib/sports";
import { createT, type TextKey, type TFunction } from "@/lib/texts";

/**
 * Sporterna i spelformuläret: alla API-sporter (sports.ts) plus Tennis,
 * som saknas hos API-Sports och bara kan läggas in manuellt.
 */
export const SPORTS: readonly string[] = [...SPORT_LABELS, "Tennis"];

export type Sport = string;

/** Liga → sport. Statisk lista tills API levererar ligor. */
export const LEAGUES: Record<string, Sport> = {
  "Premier League": "Fotboll",
  Allsvenskan: "Fotboll",
  "Champions League": "Fotboll",
  SHL: "Ishockey",
  ATP: "Tennis",
};

/**
 * `label` är gruppens standardnamn och nyckel i PICK_GROUP_LABEL_KEYS —
 * visa den med pickGroupLabel(). Alternativen sparas ordagrant som spelval
 * i databasen och är därför inte redigerbara texter.
 */
export type PickGroup = { label: string; options: string[] };

export const PICK_GROUPS: Record<string, PickGroup[]> = {
  // Fotbollens snabbval är medvetet få och generella — varje val ska gå att
  // förstå direkt. Allt annat skrivs in som eget spel.
  Fotboll: [
    { label: "Matchresultat", options: ["1", "X", "2"] },
    {
      label: "Mål – totalen",
      options: [
        "Över 2.5 mål",
        "Under 2.5 mål",
        "Över 3.5 mål",
        "Under 3.5 mål",
        "Över 4.5 mål",
        "Under 4.5 mål",
        "Över 5.5 mål",
        "Under 5.5 mål",
      ],
    },
    {
      label: "Båda lagen",
      options: [
        "Båda lagen gör mål: Ja",
        "Båda lagen gör mål: Nej",
        "Båda lagen gör minst 2 mål: Ja",
        "Båda lagen gör minst 2 mål: Nej",
      ],
    },
    {
      label: "Halvlekar",
      options: ["Mål i båda halvlekarna: Ja", "Mål i båda halvlekarna: Nej"],
    },
    { label: "Hörnor", options: ["Över 9.5 hörnor", "Under 9.5 hörnor"] },
    { label: "Kort", options: ["Över 4.5 kort", "Under 4.5 kort"] },
  ],
  Ishockey: [
    {
      label: "Matchresultat",
      options: [
        "1",
        "X",
        "2",
        "Hemma DNB",
        "Borta DNB",
        "Hemma inkl. övertid",
        "Borta inkl. övertid",
      ],
    },
    {
      label: "Handikapp",
      options: [
        "Hemma -1.5",
        "Hemma -2.5",
        "Borta +1.5",
        "Borta +2.5",
        "Asiatiskt -0.5",
      ],
    },
    {
      label: "Mål – totalen",
      options: [
        "Ö4.5",
        "U4.5",
        "Ö5.5",
        "U5.5",
        "Ö6.5",
        "U6.5",
        "Båda lagen 2+ mål",
      ],
    },
    {
      label: "Perioder",
      options: [
        "Ö1.5 mål 1:a period",
        "U1.5 mål 1:a period",
        "Ö2.5 mål 2:a period",
        "Hemma vinner 1:a period",
        "Borta vinner 3:e period",
      ],
    },
    {
      label: "Spelare",
      options: [
        "Poäng när som helst",
        "Målskytt när som helst",
        "Ö2.5 skott på mål",
      ],
    },
  ],
  Basket: [
    { label: "Matchvinnare inkl. övertid", options: ["1", "2"] },
    {
      label: "Handikapp",
      options: ["Hemma -4.5", "Hemma -7.5", "Borta +4.5", "Borta +7.5"],
    },
    { label: "Poäng – totalen", options: ["Ö160.5", "U160.5", "Ö220.5", "U220.5"] },
  ],
  "Amerikansk fotboll": [
    { label: "Matchvinnare inkl. övertid", options: ["1", "2"] },
    {
      label: "Handikapp",
      options: ["Hemma -3.5", "Hemma -7.5", "Borta +3.5", "Borta +7.5"],
    },
    { label: "Poäng – totalen", options: ["Ö40.5", "U40.5", "Ö47.5", "U47.5"] },
  ],
  Baseboll: [
    { label: "Matchvinnare inkl. extra innings", options: ["1", "2"] },
    { label: "Run line", options: ["Hemma -1.5", "Borta +1.5"] },
    { label: "Runs – totalen", options: ["Ö7.5", "U7.5", "Ö8.5", "U8.5"] },
  ],
  Handboll: [
    { label: "Matchresultat", options: ["1", "X", "2", "1X", "X2", "12"] },
    {
      label: "Handikapp",
      options: ["Hemma -2.5", "Hemma -4.5", "Borta +2.5", "Borta +4.5"],
    },
    { label: "Mål – totalen", options: ["Ö52.5", "U52.5", "Ö55.5", "U55.5"] },
  ],
  Rugby: [
    { label: "Matchresultat", options: ["1", "X", "2"] },
    { label: "Handikapp", options: ["Hemma -6.5", "Borta +6.5"] },
    { label: "Poäng – totalen", options: ["Ö40.5", "U40.5", "Ö45.5", "U45.5"] },
  ],
  Volleyboll: [
    { label: "Matchvinnare", options: ["1", "2"] },
    { label: "Setresultat", options: ["3-0", "3-1", "3-2", "0-3", "1-3", "2-3"] },
    { label: "Set – totalen", options: ["Ö3.5 set", "U3.5 set"] },
  ],
  AFL: [
    { label: "Matchresultat", options: ["1", "X", "2"] },
    { label: "Handikapp", options: ["Hemma -12.5", "Borta +12.5"] },
    { label: "Poäng – totalen", options: ["Ö160.5", "U160.5"] },
  ],
  MMA: [
    { label: "Matchvinnare", options: ["1", "2"] },
    { label: "Vinstmetod", options: ["KO/TKO", "Submission", "Domslut"] },
    { label: "Ronder", options: ["Ö1.5 ronder", "U1.5 ronder", "Går tiden ut"] },
  ],
  Tennis: [
    {
      label: "Matchvinnare",
      options: [
        "Spelare 1 vinner",
        "Spelare 2 vinner",
        "Spelare 1 vinner set",
        "Spelare 2 vinner set",
      ],
    },
    {
      label: "Set",
      options: ["2-0", "2-1", "0-2", "1-2", "Ö2.5 set", "U2.5 set"],
    },
    {
      label: "Games",
      options: [
        "Ö20.5 games",
        "U20.5 games",
        "Ö22.5 games",
        "U22.5 games",
        "Spelare 1 -3.5 games",
        "Spelare 2 +3.5 games",
      ],
    },
    {
      label: "Övrigt",
      options: ["Tiebreak i matchen", "Break i 1:a setet"],
    },
  ],
};

const PICK_GROUP_LABEL_KEYS: Record<string, TextKey> = {
  Matchresultat: "terms.pickGroup.matchResult",
  "Mål – totalen": "terms.pickGroup.goalsTotal",
  "Båda lagen": "terms.pickGroup.bothTeams",
  Halvlekar: "terms.pickGroup.halves",
  Hörnor: "terms.pickGroup.corners",
  Kort: "terms.pickGroup.cards",
  Handikapp: "terms.pickGroup.handicap",
  Perioder: "terms.pickGroup.periods",
  Spelare: "terms.pickGroup.player",
  "Matchvinnare inkl. övertid": "terms.pickGroup.winnerInclOt",
  "Poäng – totalen": "terms.pickGroup.pointsTotal",
  "Matchvinnare inkl. extra innings": "terms.pickGroup.winnerInclInnings",
  "Run line": "terms.pickGroup.runLine",
  "Runs – totalen": "terms.pickGroup.runsTotal",
  Matchvinnare: "terms.pickGroup.winner",
  Setresultat: "terms.pickGroup.setResult",
  "Set – totalen": "terms.pickGroup.setsTotal",
  Vinstmetod: "terms.pickGroup.method",
  Ronder: "terms.pickGroup.rounds",
  Set: "terms.pickGroup.sets",
  Games: "terms.pickGroup.games",
  Övrigt: "terms.pickGroup.other",
};

/** Visningsnamnet för en snabbvalsgrupp (PickGroup.label). */
export function pickGroupLabel(label: string, t?: TFunction): string {
  const key = PICK_GROUP_LABEL_KEYS[label];
  return key ? (t ?? createT({}))(key) : label;
}

const SPORT_NAME_KEYS: Record<string, TextKey> = {
  Fotboll: "terms.sport.football",
  Ishockey: "terms.sport.hockey",
  Basket: "terms.sport.basketball",
  "Amerikansk fotboll": "terms.sport.americanFootball",
  Baseboll: "terms.sport.baseball",
  Handboll: "terms.sport.handball",
  Rugby: "terms.sport.rugby",
  Volleyboll: "terms.sport.volleyball",
  AFL: "terms.sport.afl",
  MMA: "terms.sport.mma",
  Tennis: "terms.sport.tennis",
};

/**
 * Visningsnamnet för en sport. bets.sport och fixtures.sport lagras med
 * den svenska etiketten (sports.ts) — värdet är data, namnet som visas är
 * en text. Okända värden visas som de är.
 */
export function sportName(sport: string, t?: TFunction): string {
  const key = SPORT_NAME_KEYS[sport];
  return key ? (t ?? createT({}))(key) : sport;
}

/** Platt lista för snabbval (mobil m.m.) */
export const PICKS: Record<string, string[]> = Object.fromEntries(
  Object.entries(PICK_GROUPS).map(([sport, groups]) => [
    sport,
    groups.flatMap((g) => g.options),
  ])
);

/**
 * Visningsform för ett spelval. Äldre spel ligger sparade som "1 (hemma)" i
 * databasen — 1X2 säger sig självt, så parentesen bort i alla vyer.
 */
export function formatPick(pick: string | null | undefined): string {
  return (pick ?? "").replace(/^([12X])\s*\((?:hemma|borta|oavgjort)\)$/i, "$1");
}

/**
 * Förklaring bredvid korta spelval ("2" → "AIK vinner"). Tom sträng = visa
 * ingen förklaringsrad (valet är redan självförklarande).
 *
 * Lagnamn kommer från matchens hemma-/bortalag, inte från pick-strängen.
 */
export function pickHint(
  pick: string | null | undefined,
  home: string,
  away: string,
  t?: TFunction
): string {
  const tr = t ?? createT({});
  const p = formatPick(pick).trim();
  const map: Record<string, string> = {
    "1": tr("terms.pickHint.homeWins", { home }),
    "2": tr("terms.pickHint.awayWins", { away }),
    X: tr("terms.pickHint.draw"),
    "1X": tr("terms.pickHint.homeOrDraw", { home }),
    X2: tr("terms.pickHint.awayOrDraw", { away }),
    "12": tr("terms.pickHint.noDraw"),
    "Hemma DNB": tr("terms.pickHint.homeDnb", { home }),
    "Borta DNB": tr("terms.pickHint.awayDnb", { away }),
  };
  if (map[p]) return map[p];

  const tot = p.match(/^([ÖöUu])\s?([\d.,]+)(.*)$/);
  if (tot) {
    const rest = tot[3].trim();
    // "Ö9.5 hörnor" m.m. är redan begripliga — ingen extra rad.
    if (rest && !/^mål\b/i.test(rest)) return "";
    const over = tot[1].toLowerCase() === "ö";
    const num = tot[2].replace(/\./g, ",");
    const unit = rest || tr("terms.pickHint.goalsUnit");
    return over
      ? tr("terms.pickHint.over", { line: num, unit })
      : tr("terms.pickHint.under", { line: num, unit });
  }

  return "";
}

export const STAKE_PRESETS = [50, 100, 250, 500];

export function leaguesForSport(sport: string): string[] {
  return Object.entries(LEAGUES)
    .filter(([, s]) => s === sport)
    .map(([league]) => league);
}
