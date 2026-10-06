import type { Bet } from "./types";
import {
  computeStats,
  currentWinStreak,
  formatRoi,
  MIN_ROI_BETS,
} from "./utils";

export const TOP_LIST_SIZE = 10;
/** Minsta antal avgjorda spel för att kvala in på ROI-listorna. */
export const MIN_BETS_TOTAL = 3;
export const MIN_BETS_WEEK = 2;
/** Minsta antal raka vinster för att komma med på formlistan. */
export const MIN_WIN_STREAK = 3;
/** Fönster för "senaste veckan". */
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type TopListEntry = {
  id: string;
  label: string;
  sublabel?: string | null;
  /** Sublabel är spelarens namn → länk till profilen. */
  sublabelHref?: string | null;
  href?: string | null;
  display: string;
  /** "netto" färgar värdet grönt/rött, "plain" lämnar det neutralt. */
  tone: "netto" | "plain";
  value: number;
};

export type ToplistSheet = {
  id: string;
  name: string;
  slug: string | null;
  owner: string;
  userId: string;
  bets: Bet[];
};

function take<T>(rows: T[]) {
  return rows.slice(0, TOP_LIST_SIZE);
}

export function formatCount(value: number) {
  return value.toLocaleString("sv-SE");
}

export function profileHref(username: string) {
  return `/profil/${encodeURIComponent(username)}`;
}

/**
 * ROI-ordning för huvudtopplistan och startsidan. Spelböcker med minst
 * MIN_ROI_BETS rättade spel rankas på ROI; övriga hamnar under dem, sorterade
 * på antal rättade spel, så att ett enda vunnet spel inte ger förstaplatsen.
 */
export function compareByQualifiedRoi(
  a: { bets: number; roi: number; stake: number },
  b: { bets: number; roi: number; stake: number }
) {
  const qa = a.bets >= MIN_ROI_BETS && a.stake > 0;
  const qb = b.bets >= MIN_ROI_BETS && b.stake > 0;
  if (qa !== qb) return qa ? -1 : 1;
  return qa ? b.roi - a.roi : b.bets - a.bets;
}

/** Spelböcker sorterade på ROI, valfritt begränsat till spel efter `since`. */
export function sheetRoiList(
  sheets: ToplistSheet[],
  opts: { since?: number; minBets?: number } = {}
): TopListEntry[] {
  const { since, minBets = MIN_BETS_TOTAL } = opts;

  return take(
    sheets
      .map((sheet) => {
        const bets =
          since == null
            ? sheet.bets
            : sheet.bets.filter((b) => +new Date(b.placed_at) >= since);
        return { sheet, stats: computeStats(bets) };
      })
      .filter(({ stats }) => stats.bets >= minBets && stats.stake > 0)
      .sort((a, b) => b.stats.roi - a.stats.roi)
      .map(({ sheet, stats }) => ({
        id: sheet.id,
        label: sheet.name,
        sublabel: sheet.owner,
        sublabelHref: profileHref(sheet.owner),
        href: sheet.slug ? `/s/${sheet.slug}` : null,
        display: formatRoi(stats.roi),
        tone: "netto" as const,
        value: stats.roi,
      }))
  );
}

/** Tipsare sorterade på antal loggade spel i publika spelböcker. */
export function betCountList(sheets: ToplistSheet[]): TopListEntry[] {
  const byUser = new Map<string, { owner: string; count: number }>();
  for (const sheet of sheets) {
    const entry = byUser.get(sheet.userId) ?? { owner: sheet.owner, count: 0 };
    entry.count += sheet.bets.length;
    byUser.set(sheet.userId, entry);
  }

  return take(
    [...byUser.entries()]
      .filter(([, v]) => v.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([id, v]) => ({
        id,
        label: v.owner,
        href: profileHref(v.owner),
        display: formatCount(v.count),
        tone: "plain" as const,
        value: v.count,
      }))
  );
}

/** Spelarens spel ur alla hens publika spelböcker. */
function betsByUser(sheets: ToplistSheet[]) {
  const byUser = new Map<string, { owner: string; bets: Bet[] }>();
  for (const sheet of sheets) {
    const entry = byUser.get(sheet.userId) ?? { owner: sheet.owner, bets: [] };
    entry.bets.push(...sheet.bets);
    byUser.set(sheet.userId, entry);
  }
  return byUser;
}

/**
 * Bäst aktuell form: antal raka vinster bakåt från det senaste avgjorda
 * spelet, över spelarens alla publika spelböcker. Minst tre raka för att
 * komma med — tio raka går före sju raka.
 */
export function formList(sheets: ToplistSheet[]): TopListEntry[] {
  return take(
    [...betsByUser(sheets).entries()]
      .map(([id, v]) => ({ id, owner: v.owner, streak: currentWinStreak(v.bets) }))
      .filter((r) => r.streak >= MIN_WIN_STREAK)
      .sort((a, b) => b.streak - a.streak)
      .map((r) => ({
        id: r.id,
        label: r.owner,
        href: profileHref(r.owner),
        display: `${r.streak} raka`,
        tone: "plain" as const,
        value: r.streak,
      }))
  );
}

/**
 * Högsta vunna odds: spelarens högsta odds på ett vunnet spel, singel eller
 * kombination — oddset på spelet är redan det sammanlagda.
 */
export function highestWonOddsList(sheets: ToplistSheet[]): TopListEntry[] {
  return take(
    [...betsByUser(sheets).entries()]
      .map(([id, v]) => ({
        id,
        owner: v.owner,
        odds: Math.max(
          0,
          ...v.bets.filter((b) => b.result === "win").map((b) => Number(b.odds) || 0)
        ),
      }))
      .filter((r) => r.odds > 1)
      .sort((a, b) => b.odds - a.odds)
      .map((r) => ({
        id: r.id,
        label: r.owner,
        href: profileHref(r.owner),
        display: r.odds.toLocaleString("sv-SE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        tone: "plain" as const,
        value: r.odds,
      }))
  );
}

/** Plats 1–3 i guld, silver och brons — samma på alla topplistor. */
export function rankColor(index: number) {
  if (index === 0) return "text-[#FFD166]";
  if (index === 1) return "text-[#C3CBDB]";
  if (index === 2) return "text-[#E0A070]";
  return "text-muted";
}

/** Spelböcker sorterade på netto (störst vinst i kronor). */
export function sheetNettoList(
  sheets: ToplistSheet[],
  opts: { minBets?: number } = {}
): TopListEntry[] {
  const { minBets = MIN_BETS_TOTAL } = opts;

  return take(
    sheets
      .map((sheet) => ({ sheet, stats: computeStats(sheet.bets) }))
      .filter(({ stats }) => stats.bets >= minBets)
      .sort((a, b) => b.stats.netto - a.stats.netto)
      .map(({ sheet, stats }) => ({
        id: sheet.id,
        label: sheet.name,
        sublabel: sheet.owner,
        sublabelHref: profileHref(sheet.owner),
        href: sheet.slug ? `/s/${sheet.slug}` : null,
        display: `${stats.netto > 0 ? "+" : ""}${Math.round(
          stats.netto
        ).toLocaleString("sv-SE")} kr`,
        tone: "netto" as const,
        value: stats.netto,
      }))
  );
}
