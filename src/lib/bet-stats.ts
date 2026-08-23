import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bookmakerKey,
  groupBets,
  pickKey,
  sportKey,
  type BreakdownRow,
} from "@/lib/breakdowns";

export const STATS_PERIODS = [
  { value: "all", label: "Från start" },
  { value: "year", label: "Detta år" },
  { value: "month", label: "Denna månad" },
  { value: "week", label: "Denna vecka" },
  { value: "today", label: "Idag" },
] as const;

export type StatsPeriod = (typeof STATS_PERIODS)[number]["value"];

export type BetStatsPayload = {
  antal_spel: number;
  vinster: number;
  forluster: number;
  void: number;
  oppna_spel: number;
  oppen_risk: number;
  oppen_potentiell_vinst: number;
  insats: number;
  vunnet: number;
  forlorat: number;
  netto: number;
  roi: number;
  unit_size: number;
  unitnetto: number;
  vinstprocent: number;
  medelodds: number;
  medelinsats: number;
  medelvinst: number;
};

export type LeagueStatRow = {
  league: string;
  bets: number;
  netto: number;
};

/** Uppdelningar som räknas fram från raderna, inte via RPC. */
export type SheetBreakdowns = {
  bookmakers: BreakdownRow[];
  picks: BreakdownRow[];
  sports: BreakdownRow[];
};

export type SheetStatsBundle = {
  stats: BetStatsPayload;
  leagues: LeagueStatRow[];
  breakdowns: SheetBreakdowns;
};

export const EMPTY_BREAKDOWNS: SheetBreakdowns = {
  bookmakers: [],
  picks: [],
  sports: [],
};

export function emptyStatsBundle(unitSize = 100): SheetStatsBundle {
  return {
    stats: EMPTY_STATS(unitSize),
    leagues: [],
    breakdowns: EMPTY_BREAKDOWNS,
  };
}

export type PublicSheetLeaderboardRow = {
  sheet_id: string;
  sheet_name: string;
  sheet_slug: string | null;
  username: string;
  settled_bets: number;
  roi: number;
};

export type AffiliateTopRow = {
  id: string;
  name: string;
  slug: string;
  rank: number;
  rating: number | null;
  bonus_value: number | null;
  bonus: string | null;
  usp: string | null;
  terms: string | null;
};

const EMPTY_STATS = (unitSize = 100): BetStatsPayload => ({
  antal_spel: 0,
  vinster: 0,
  forluster: 0,
  void: 0,
  oppna_spel: 0,
  oppen_risk: 0,
  oppen_potentiell_vinst: 0,
  insats: 0,
  vunnet: 0,
  forlorat: 0,
  netto: 0,
  roi: 0,
  unit_size: unitSize,
  unitnetto: 0,
  vinstprocent: 0,
  medelodds: 0,
  medelinsats: 0,
  medelvinst: 0,
});

export function isStatsPeriod(value: string | null | undefined): value is StatsPeriod {
  return STATS_PERIODS.some((p) => p.value === value);
}

/** Stockholm calendar day as YYYY-MM-DD. */
function stockholmYmd(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function stockholmOffsetMinutes(at: Date): number {
  const raw =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Stockholm",
      timeZoneName: "shortOffset",
    })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value || "GMT+1";
  const m = raw.match(/GMT([+-])(\d+)(?::(\d+))?/i);
  if (!m) return 60;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] || 0));
}

/** Instant when a Stockholm calendar day starts (as UTC ISO). */
function stockholmDayStartIso(ymd: string): string {
  const probe = new Date(`${ymd}T12:00:00Z`);
  const offset = stockholmOffsetMinutes(probe);
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return new Date(`${ymd}T00:00:00${sign}${hh}:${mm}`).toISOString();
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

/** ISO weekday Mon=1 … Sun=7 for a Stockholm YMD. */
function stockholmIsoWeekday(ymd: string): number {
  const iso = stockholmDayStartIso(ymd);
  // Get weekday in Stockholm for that instant
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Stockholm",
    weekday: "short",
  }).format(new Date(iso));
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[wd] ?? 1;
}

export function periodDateRange(
  period: StatsPeriod,
  now = new Date()
): { from: string | null; to: string | null } {
  if (period === "all") return { from: null, to: null };

  const today = stockholmYmd(now);

  if (period === "today") {
    return {
      from: stockholmDayStartIso(today),
      to: stockholmDayStartIso(addDaysYmd(today, 1)),
    };
  }

  if (period === "week") {
    const wd = stockholmIsoWeekday(today);
    const monday = addDaysYmd(today, -(wd - 1));
    return {
      from: stockholmDayStartIso(monday),
      to: stockholmDayStartIso(addDaysYmd(today, 1)),
    };
  }

  if (period === "month") {
    const [y, m] = today.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const nextMonth =
      m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    return {
      from: stockholmDayStartIso(start),
      to: stockholmDayStartIso(nextMonth),
    };
  }

  // year
  const y = Number(today.slice(0, 4));
  return {
    from: stockholmDayStartIso(`${y}-01-01`),
    to: stockholmDayStartIso(`${y + 1}-01-01`),
  };
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeBetStats(
  raw: unknown,
  unitSize = 100
): BetStatsPayload {
  if (!raw || typeof raw !== "object") return EMPTY_STATS(unitSize);
  const r = raw as Record<string, unknown>;
  return {
    antal_spel: num(r.antal_spel),
    vinster: num(r.vinster),
    forluster: num(r.forluster),
    void: num(r.void),
    oppna_spel: num(r.oppna_spel),
    oppen_risk: num(r.oppen_risk),
    oppen_potentiell_vinst: num(r.oppen_potentiell_vinst),
    insats: num(r.insats),
    vunnet: num(r.vunnet),
    forlorat: num(r.forlorat),
    netto: num(r.netto),
    roi: num(r.roi),
    unit_size: num(r.unit_size, unitSize),
    unitnetto: num(r.unitnetto),
    vinstprocent: num(r.vinstprocent),
    medelodds: num(r.medelodds),
    medelinsats: num(r.medelinsats),
    medelvinst: num(r.medelvinst),
  };
}

export function normalizeLeagueStats(raw: unknown): LeagueStatRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      league: String(r.league || "Övrigt"),
      bets: num(r.bets),
      netto: num(r.netto),
    };
  });
}

export function normalizePublicSheets(raw: unknown): PublicSheetLeaderboardRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      sheet_id: String(r.sheet_id || ""),
      sheet_name: String(r.sheet_name || ""),
      sheet_slug: r.sheet_slug ? String(r.sheet_slug) : null,
      username: String(r.username || ""),
      settled_bets: num(r.settled_bets),
      roi: num(r.roi),
    };
  });
}

type BetRow = {
  result: string;
  stake: number | string;
  odds: number | string;
  payout: number | string;
  league: string | null;
  pick: string | null;
  sport: string | null;
  bookmakers?: { name: string } | { name: string }[] | null;
  placed_at: string;
};

const BET_ROW_SELECT =
  "result, stake, odds, payout, league, pick, sport, placed_at, bookmakers(name)";

/** PostgREST kan ge en inbäddad relation som array — normalisera till objekt. */
function withOneBookmaker(rows: BetRow[]) {
  return rows.map((row) => ({
    ...row,
    bookmakers: Array.isArray(row.bookmakers)
      ? (row.bookmakers[0] ?? null)
      : (row.bookmakers ?? null),
  }));
}

export function computeBreakdownsFromRows(rows: BetRow[]): SheetBreakdowns {
  const bets = withOneBookmaker(rows);
  return {
    bookmakers: groupBets(bets, bookmakerKey),
    picks: groupBets(bets, pickKey),
    sports: groupBets(bets, sportKey),
  };
}

/** Server-side fallback when RPC saknas / misslyckas. */
export function computeBetStatsFromRows(
  bets: BetRow[],
  unitSize = 100
): BetStatsPayload {
  let vinster = 0;
  let forluster = 0;
  let voidCount = 0;
  let oppna = 0;
  let oppenRisk = 0;
  let oppenPot = 0;
  let insats = 0;
  let vunnet = 0;
  let forlorat = 0;
  let oddsSum = 0;
  let settledCount = 0;

  for (const b of bets) {
    const stake = Number(b.stake);
    const odds = Number(b.odds);
    const netto = Number(b.payout) - stake;

    if (b.result === "open") {
      oppna += 1;
      oppenRisk += stake;
      oppenPot += stake * (odds - 1);
      continue;
    }

    settledCount += 1;
    insats += stake;
    oddsSum += odds;
    if (netto > 0) vunnet += netto;
    if (netto < 0) forlorat += netto;

    if (b.result === "win" || b.result === "halfwin") vinster += 1;
    else if (b.result === "loss" || b.result === "halfloss") forluster += 1;
    else if (b.result === "void") voidCount += 1;
  }

  const netto = vunnet + forlorat;
  const decided = vinster + forluster;
  const unit = unitSize > 0 ? unitSize : 100;

  return {
    antal_spel: bets.length,
    vinster,
    forluster,
    void: voidCount,
    oppna_spel: oppna,
    oppen_risk: Math.round(oppenRisk * 100) / 100,
    oppen_potentiell_vinst: Math.round(oppenPot * 100) / 100,
    insats: Math.round(insats * 100) / 100,
    vunnet: Math.round(vunnet * 100) / 100,
    forlorat: Math.round(forlorat * 100) / 100,
    netto: Math.round(netto * 100) / 100,
    roi: insats > 0 ? Math.round((netto / insats) * 10000) / 100 : 0,
    unit_size: unit,
    unitnetto: Math.round((netto / unit) * 100) / 100,
    vinstprocent:
      decided > 0 ? Math.round((vinster / decided) * 10000) / 100 : 0,
    medelodds:
      settledCount > 0 ? Math.round((oddsSum / settledCount) * 100) / 100 : 0,
    medelinsats:
      settledCount > 0 ? Math.round((insats / settledCount) * 100) / 100 : 0,
    medelvinst:
      vinster > 0 ? Math.round((netto / vinster) * 100) / 100 : 0,
  };
}

export function computeLeagueStatsFromRows(
  bets: BetRow[],
  limit = 5
): LeagueStatRow[] {
  const map = new Map<string, { bets: number; netto: number }>();
  for (const b of bets) {
    if (b.result === "open") continue;
    const league = (b.league || "").trim() || "Övrigt";
    const cur = map.get(league) ?? { bets: 0, netto: 0 };
    cur.bets += 1;
    cur.netto += Number(b.payout) - Number(b.stake);
    map.set(league, cur);
  }
  return [...map.entries()]
    .map(([league, v]) => ({
      league,
      bets: v.bets,
      netto: Math.round(v.netto * 100) / 100,
    }))
    .sort((a, b) => b.netto - a.netto)
    .slice(0, limit);
}

export async function fetchSheetStatsBundle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  sheetId: string,
  period: StatsPeriod,
  unitSize = 100
): Promise<SheetStatsBundle> {
  const { from, to } = periodDateRange(period);

  // Raderna behövs alltid — uppdelningarna per spelbolag/spelform/sport har
  // ingen RPC, och samma svar duger som fallback om en RPC fallerar.
  let rowQuery = supabase
    .from("bets")
    .select(BET_ROW_SELECT)
    .eq("sheet_id", sheetId);
  if (from) rowQuery = rowQuery.gte("placed_at", from);
  if (to) rowQuery = rowQuery.lt("placed_at", to);

  const [statsRes, leagueRes, rowRes] = await Promise.all([
    supabase.rpc("get_bet_stats", {
      p_sheet_id: sheetId,
      p_from_date: from,
      p_to_date: to,
      p_unit_size: unitSize,
    }),
    supabase.rpc("get_league_stats", {
      p_sheet_id: sheetId,
      p_from_date: from,
      p_to_date: to,
      p_limit: 5,
    }),
    rowQuery,
  ]);

  const rows = (rowRes.data || []) as unknown as BetRow[];

  return {
    stats:
      !statsRes.error && statsRes.data != null
        ? normalizeBetStats(statsRes.data, unitSize)
        : computeBetStatsFromRows(rows, unitSize),
    leagues:
      !leagueRes.error && leagueRes.data != null
        ? normalizeLeagueStats(leagueRes.data)
        : computeLeagueStatsFromRows(rows, 5),
    breakdowns: computeBreakdownsFromRows(rows),
  };
}

export async function fetchPublicSheetsLeaderboard(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  limit = 5,
  excludeUserId?: string | null
): Promise<PublicSheetLeaderboardRow[]> {
  const { data, error } = await supabase.rpc("get_public_sheets_leaderboard", {
    p_limit: limit,
    p_exclude_user_id: excludeUserId ?? null,
  });

  if (!error && data != null) {
    return normalizePublicSheets(data);
  }

  // Fallback via RLS-säker select av publika sheets
  const { data: sheets } = await supabase
    .from("sheets")
    .select(
      "id, name, slug, user_id, profiles(username), bets(stake, payout, result)"
    )
    .eq("is_public", true);

  const rows = (sheets || [])
    .map((sheet) => {
      const owner = sheet.profiles as unknown as { username: string } | null;
      const bets = (sheet.bets || []) as Array<{
        stake: number;
        payout: number;
        result: string;
      }>;
      const settled = bets.filter((b) => b.result !== "open");
      if (settled.length < 10) return null;
      if (excludeUserId && sheet.user_id === excludeUserId) return null;
      const stake = settled.reduce((s, b) => s + Number(b.stake), 0);
      const netto = settled.reduce(
        (s, b) => s + Number(b.payout) - Number(b.stake),
        0
      );
      return {
        sheet_id: sheet.id as string,
        sheet_name: sheet.name as string,
        sheet_slug: (sheet as { slug?: string | null }).slug ?? null,
        username: owner?.username || "Okänd",
        settled_bets: settled.length,
        roi: stake > 0 ? Math.round((netto / stake) * 1000) / 10 : 0,
      };
    })
    .filter((r): r is PublicSheetLeaderboardRow => r != null)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, limit);

  return rows;
}

export function wageringLabel(bm: {
  usp?: string | null;
  terms?: string | null;
  bonus?: string | null;
  name?: string | null;
}): string {
  const blob = [bm.usp, bm.terms, bm.bonus].filter(Boolean).join(" ");
  const m = blob.match(/(\d+)\s*x/i);
  if (m) return `${m[1]}x omsättningskrav`;

  const known: Record<string, string> = {
    Unibet: "10x omsättningskrav",
    bet365: "Villkor gäller",
    Bet365: "Villkor gäller",
    Betsson: "Villkor gäller",
    LeoVegas: "8x omsättningskrav",
    NordicBet: "6x omsättningskrav",
  };
  if (bm.name && known[bm.name]) return known[bm.name];
  return "Villkor gäller";
}

export function formatRoiPlain(value: number, digits = 1): string {
  const body = value.toLocaleString("sv-SE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${body}%`;
}

export function formatRoiStats(value: number): string {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}
