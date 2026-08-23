import type { Bet } from "./types";
import { computeStats, formatRoi } from "./utils";

export const TOP_LIST_SIZE = 10;
/** Minsta antal avgjorda spel för att kvala in på ROI-listorna. */
export const MIN_BETS_TOTAL = 3;
export const MIN_BETS_WEEK = 2;
/** Fönster för "senaste veckan". */
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type TopListEntry = {
  id: string;
  label: string;
  sublabel?: string | null;
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

function profileHref(username: string) {
  return `/profil/${encodeURIComponent(username)}`;
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

/** Tipsare sorterade på hur många gånger deras spel ryggats av andra. */
export function ryggadList(
  counts: Map<string, number>,
  usernames: Map<string, string>
): TopListEntry[] {
  return take(
    [...counts.entries()]
      .filter(([id, count]) => count > 0 && usernames.has(id))
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => {
        const owner = usernames.get(id) as string;
        return {
          id,
          label: owner,
          href: profileHref(owner),
          display: formatCount(count),
          tone: "plain" as const,
          value: count,
        };
      })
  );
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
        href: sheet.slug ? `/s/${sheet.slug}` : null,
        display: `${stats.netto > 0 ? "+" : ""}${Math.round(
          stats.netto
        ).toLocaleString("sv-SE")} kr`,
        tone: "netto" as const,
        value: stats.netto,
      }))
  );
}
