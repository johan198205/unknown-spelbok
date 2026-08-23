/**
 * Fältbiblioteket — den hårda gränsen för vad en adminregel får referera.
 *
 * Admin skriver aldrig fältnamn för hand: dropdownen i /admin/regler fylls
 * härifrån, valideringen i API-routen kontrollerar mot samma lista, och
 * evaluatorn slår upp värden med samma nycklar. Ett fält som inte står här
 * kan alltså varken sparas eller köras.
 *
 * HÅLL I SYNK med supabase/functions/_shared/signal-fields.ts. Cron-jobbet
 * kör i Deno och kan inte importera härifrån (tsconfig exkluderar
 * supabase/functions). scripts/check-signal-parity.ts jämför de två.
 */

export type SignalFieldGroup = "home" | "away" | "combined" | "h2h";

/** Styr avrundningen när ett värde renderas in i en label. */
export type SignalFieldFormat = "percent" | "average" | "count";

export type SignalField = {
  /** Nyckeln i metrics, t.ex. "home.over_2_5_pct". */
  key: string;
  group: SignalFieldGroup;
  /** Svensk etikett i admin-dropdownen. */
  label: string;
  format: SignalFieldFormat;
  /** Rimligt spann för värdefältet i UI:t — inte en hård validering. */
  min: number;
  max: number;
};

export const SIGNAL_FIELD_GROUPS: Record<SignalFieldGroup, string> = {
  home: "Hemmalag",
  away: "Bortalag",
  combined: "Kombinerat",
  h2h: "Inbördes möten",
};

/** Fälten som finns för båda lagen, med gruppen som prefix. */
function teamFields(group: "home" | "away"): SignalField[] {
  const side = group === "home" ? "Hemmalaget" : "Bortalaget";
  const venue = group === "home" ? "hemmamatcher" : "bortamatcher";
  const venueKey = group === "home" ? "home" : "away";
  return [
    {
      key: `${group}.avg_goals_for`,
      group,
      label: `${side}: snittmål gjorda`,
      format: "average",
      min: 0,
      max: 6,
    },
    {
      key: `${group}.avg_goals_against`,
      group,
      label: `${side}: snittmål insläppta`,
      format: "average",
      min: 0,
      max: 6,
    },
    {
      key: `${group}.avg_goals_for_${venueKey}`,
      group,
      label: `${side}: snittmål gjorda i ${venue}`,
      format: "average",
      min: 0,
      max: 6,
    },
    {
      key: `${group}.over_1_5_pct`,
      group,
      label: `${side}: andel matcher över 1.5 mål`,
      format: "percent",
      min: 0,
      max: 100,
    },
    {
      key: `${group}.over_2_5_pct`,
      group,
      label: `${side}: andel matcher över 2.5 mål`,
      format: "percent",
      min: 0,
      max: 100,
    },
    {
      key: `${group}.over_3_5_pct`,
      group,
      label: `${side}: andel matcher över 3.5 mål`,
      format: "percent",
      min: 0,
      max: 100,
    },
    {
      key: `${group}.btts_pct`,
      group,
      label: `${side}: andel matcher där båda lagen gjort mål`,
      format: "percent",
      min: 0,
      max: 100,
    },
    {
      key: `${group}.clean_sheet_pct`,
      group,
      label: `${side}: andel hållna nollor`,
      format: "percent",
      min: 0,
      max: 100,
    },
    {
      key: `${group}.failed_to_score_pct`,
      group,
      label: `${side}: andel matcher utan gjort mål`,
      format: "percent",
      min: 0,
      max: 100,
    },
    {
      key: `${group}.form_points_last_5`,
      group,
      label: `${side}: poäng senaste fem (0–15)`,
      format: "count",
      min: 0,
      max: 15,
    },
  ];
}

export const SIGNAL_FIELDS: readonly SignalField[] = [
  ...teamFields("home"),
  ...teamFields("away"),
  {
    key: "combined.avg_goals",
    group: "combined",
    label: "Lagens snittmål gjorda, summerat",
    format: "average",
    min: 0,
    max: 10,
  },
  {
    key: "combined.avg_total_goals",
    group: "combined",
    label: "Förväntad målsumma (gjorda + insläppta, snitt)",
    format: "average",
    min: 0,
    max: 10,
  },
  {
    key: "h2h.avg_goals_last_5",
    group: "h2h",
    label: "Snittmål i senaste fem inbördes",
    format: "average",
    min: 0,
    max: 10,
  },
  {
    key: "h2h.btts_pct_last_5",
    group: "h2h",
    label: "Andel inbördes möten där båda gjort mål",
    format: "percent",
    min: 0,
    max: 100,
  },
  {
    key: "h2h.home_wins_last_5",
    group: "h2h",
    label: "Hemmalagets vinster i senaste fem inbördes",
    format: "count",
    min: 0,
    max: 5,
  },
  {
    key: "h2h.matches_count",
    group: "h2h",
    label: "Antal inbördes möten i underlaget",
    format: "count",
    min: 0,
    max: 5,
  },
] as const;

export const SIGNAL_FIELD_KEYS: readonly string[] = SIGNAL_FIELDS.map(
  (f) => f.key
);

const BY_KEY = new Map(SIGNAL_FIELDS.map((f) => [f.key, f]));

export function signalField(key: string): SignalField | undefined {
  return BY_KEY.get(key);
}

export function isSignalField(key: string): boolean {
  return BY_KEY.has(key);
}

/** Operatorerna en regel får använda. Vitlista, aldrig fri kod. */
export const SIGNAL_OPERATORS = [">=", "<=", ">", "<", "=="] as const;
export type SignalOperator = (typeof SIGNAL_OPERATORS)[number];

export function isSignalOperator(op: string): op is SignalOperator {
  return (SIGNAL_OPERATORS as readonly string[]).includes(op);
}

export const MAX_CONDITIONS_PER_RULE = 10;

/**
 * Spelformerna en regel kan knytas till. Motsvarar familjerna i
 * bet_type_family() i db/daily-suggestions.sql — en regel för over_2_5 är
 * bara relevant för användare som faktiskt spelar över/under.
 */
export const SIGNAL_BET_TYPES = [
  { value: "over_2_5", label: "Över 2.5 mål", family: "Över/under" },
  { value: "under_2_5", label: "Under 2.5 mål", family: "Över/under" },
  { value: "btts", label: "Båda lagen gör mål", family: "Båda lagen mål" },
  { value: "1x2_home", label: "1 – hemmavinst", family: "1X2" },
  { value: "1x2_draw", label: "X – oavgjort", family: "1X2" },
  { value: "1x2_away", label: "2 – bortavinst", family: "1X2" },
  { value: "handicap", label: "Handikapp", family: "Handikapp" },
] as const;

export type SignalBetType = (typeof SIGNAL_BET_TYPES)[number]["value"];

export function isSignalBetType(value: string): value is SignalBetType {
  return SIGNAL_BET_TYPES.some((b) => b.value === value);
}

/**
 * Spelform → spelform-familj i användarprofilen. Avgör om en regel alls
 * är relevant för en viss användare.
 */
export function betTypeFamily(betType: string): string | null {
  return SIGNAL_BET_TYPES.find((b) => b.value === betType)?.family ?? null;
}

export const SIGNAL_SPORTS = [
  { value: "football", label: "Fotboll" },
  { value: "hockey", label: "Ishockey" },
] as const;

export function isSignalSport(value: string): boolean {
  return SIGNAL_SPORTS.some((s) => s.value === value);
}
