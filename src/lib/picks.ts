import { SPORT_LABELS } from "@/lib/sports";

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

export type PickGroup = { label: string; options: string[] };

export const PICK_GROUPS: Record<string, PickGroup[]> = {
  Fotboll: [
    {
      label: "Matchresultat",
      options: [
        "1",
        "X",
        "2",
        "1X",
        "X2",
        "12",
        "Hemma DNB",
        "Borta DNB",
      ],
    },
    {
      label: "Handikapp",
      options: [
        "Hemma -1",
        "Hemma -1.5",
        "Hemma -2",
        "Borta +1",
        "Borta +1.5",
        "Borta +2",
        "Asiatiskt 0",
        "Asiatiskt -0.25",
        "Asiatiskt -0.75",
      ],
    },
    {
      label: "Mål – totalen",
      options: [
        "Ö1.5",
        "U1.5",
        "Ö2.5",
        "U2.5",
        "Ö3.5",
        "U3.5",
        "Ö4.5",
        "U4.5",
        "Båda lagen mål",
        "Båda lagen mål – nej",
      ],
    },
    {
      label: "Halvlek",
      options: [
        "Ö0.5 mål 1:a halvlek",
        "Ö1.5 mål 1:a halvlek",
        "U1.5 mål 1:a halvlek",
        "Ö1.5 mål 2:a halvlek",
        "U1.5 mål 2:a halvlek",
        "Hemma vinner 1:a halvlek",
        "Borta vinner 2:a halvlek",
      ],
    },
    {
      label: "Laget – mål",
      options: [
        "Hemma Ö1.5",
        "Hemma U1.5",
        "Borta Ö1.5",
        "Borta U1.5",
        "Hemma håller nollan",
        "Borta håller nollan",
      ],
    },
    {
      label: "Hörnor",
      options: [
        "Ö8.5 hörnor",
        "Ö9.5 hörnor",
        "Ö10.5 hörnor",
        "U9.5 hörnor",
        "U10.5 hörnor",
        "Hemma flest hörnor",
        "Borta flest hörnor",
      ],
    },
    {
      label: "Kort",
      options: ["Ö3.5 kort", "Ö4.5 kort", "U4.5 kort", "Rött kort i matchen"],
    },
    {
      label: "Målskytt",
      options: [
        "Målskytt när som helst",
        "Första målskytt",
        "Målskytt 2+ mål",
      ],
    },
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
  away: string
): string {
  const p = formatPick(pick).trim();
  const map: Record<string, string> = {
    "1": `${home} vinner`,
    "2": `${away} vinner`,
    X: "Oavgjort",
    "1X": `${home} eller oavgjort`,
    X2: `${away} eller oavgjort`,
    "12": "Ingen oavgjord",
    "Hemma DNB": `${home} utan oavgjort`,
    "Borta DNB": `${away} utan oavgjort`,
  };
  if (map[p]) return map[p];

  const tot = p.match(/^([ÖöUu])\s?([\d.,]+)(.*)$/);
  if (tot) {
    const rest = tot[3].trim();
    // "Ö9.5 hörnor" m.m. är redan begripliga — ingen extra rad.
    if (rest && !/^mål\b/i.test(rest)) return "";
    const over = tot[1].toLowerCase() === "ö";
    const num = tot[2].replace(/\./g, ",");
    return `${over ? "Över" : "Under"} ${num} ${rest || "mål"}`;
  }

  return "";
}

export const STAKE_PRESETS = [50, 100, 250, 500];

export function leaguesForSport(sport: string): string[] {
  return Object.entries(LEAGUES)
    .filter(([, s]) => s === sport)
    .map(([league]) => league);
}
