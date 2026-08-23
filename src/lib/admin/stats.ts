import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StatsPeriod = "7d" | "30d" | "90d" | "365d";

export const STATS_PERIODS: {
  key: StatsPeriod;
  label: string;
  days: number;
}[] = [
  { key: "7d", label: "7 dagar", days: 7 },
  { key: "30d", label: "30 dagar", days: 30 },
  { key: "90d", label: "3 månader", days: 90 },
  { key: "365d", label: "1 år", days: 365 },
];

export function parsePeriod(value?: string | null): StatsPeriod {
  const hit = STATS_PERIODS.find((p) => p.key === value);
  return hit ? hit.key : "30d";
}

export type StatsKpi = {
  label: string;
  value: string;
  delta: string;
  arrow: "▲" | "▼" | "–";
  positive: boolean | null;
};

export type StatsPoint = {
  day: string;
  current: number;
  previous: number | null;
};

export type StatsBar = {
  name: string;
  count: number;
  share: number;
};

export type StatsFunnelStep = {
  label: string;
  value: number;
  step: number | null;
};

export type StatsBannerRow = {
  id: string;
  title: string;
  imageUrl: string | null;
  placement: string;
  views: number;
  clicks: number;
  /** Klick delat med visningar, i procent. 0 när bannern inte visats. */
  ctr: number;
};

export type StatsData = {
  period: StatsPeriod;
  periodLabel: string;
  days: number;
  rangeLabel: string;
  compare: boolean;
  kpis: StatsKpi[];
  chart: StatsPoint[];
  affiliate: StatsBar[];
  leagues: StatsBar[];
  banners: StatsBannerRow[];
  funnel: StatsFunnelStep[];
};

const DAY_MS = 86_400_000;
const PAGE_SIZE = 1000;
const IN_CHUNK = 150;

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dayKey(value: string | Date) {
  return dayFormatter.format(typeof value === "string" ? new Date(value) : value);
}

/** Midnight in Europe/Stockholm for the calendar day `date` falls on. */
function stockholmMidnight(date: Date) {
  const day = dayFormatter.format(date);

  for (const offset of ["+02:00", "+01:00"] as const) {
    const candidate = new Date(`${day}T00:00:00${offset}`);
    if (dayKey(candidate) === day && hourInStockholm(candidate) === 0) {
      return candidate;
    }
  }

  return new Date(`${day}T00:00:00+02:00`);
}

function hourInStockholm(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Stockholm",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date)
  );
}

/**
 * Supabase caps a single select at 1000 rows. Every aggregation below runs over
 * a bounded period, but a year of bets can still exceed that — so page through.
 */
async function selectAll<T>(
  build: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

function formatInt(n: number) {
  return n.toLocaleString("sv-SE");
}

function deltaOf(current: number, previous: number, compare: boolean): {
  delta: string;
  arrow: StatsKpi["arrow"];
  positive: boolean | null;
} {
  if (!compare) {
    return { delta: "denna period", arrow: "–", positive: null };
  }
  if (previous === 0) {
    if (current === 0) return { delta: "oförändrat", arrow: "–", positive: null };
    return { delta: "ny aktivitet", arrow: "▲", positive: true };
  }

  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) return { delta: "oförändrat", arrow: "–", positive: null };

  return {
    delta: `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("sv-SE", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`,
    arrow: rounded > 0 ? "▲" : "▼",
    positive: rounded > 0,
  };
}

function shares(rows: { name: string; count: number }[]) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return rows.map((r) => ({
    ...r,
    share: total > 0 ? (r.count / total) * 100 : 0,
  }));
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function getStatsData(
  period: StatsPeriod,
  compare = true
): Promise<StatsData> {
  await requireAdmin();
  const supabase = await createClient();
  // bets har ingen admin-policy i RLS (bara ägaren ser sina rader), så
  // aggregeringen över alla användares spel går via service role-klienten.
  const service = createAdminClient();

  const config = STATS_PERIODS.find((p) => p.key === period)!;
  const days = config.days;

  const now = new Date();
  const todayStart = stockholmMidnight(now);
  // Räkna dygn från lokal middag: sommartidsskiftet flyttar dygnet en timme,
  // så rak 24-timmarsmatematik från midnatt kan hamna på fel kalenderdag.
  const daysBack = (from: Date, count: number) =>
    stockholmMidnight(new Date(from.getTime() + DAY_MS / 2 - count * DAY_MS));

  const start = daysBack(todayStart, days - 1);
  const end = now;
  const prevStart = daysBack(start, days);
  const prevEnd = start;
  const last7 = daysBack(todayStart, 6);

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const prevStartIso = prevStart.toISOString();
  const prevEndIso = prevEnd.toISOString();

  const [
    betsNow,
    betsPrev,
    regsNow,
    regsPrev,
    clicksNow,
    clicksPrev,
    bookmakers,
    cohort,
    bannerEvents,
    banners,
  ] = await Promise.all([
    // Bets in the period carry active users, bet volume and league mix.
    selectAll<{ user_id: string; placed_at: string; league: string | null }>(
      (from, to) =>
        service
          .from("bets")
          .select("user_id, placed_at, league")
          .gte("placed_at", startIso)
          .lt("placed_at", endIso)
          .order("placed_at", { ascending: true })
          .range(from, to)
    ),
    compare
      ? selectAll<{ user_id: string; placed_at: string }>((from, to) =>
          service
            .from("bets")
            .select("user_id, placed_at")
            .gte("placed_at", prevStartIso)
            .lt("placed_at", prevEndIso)
            .order("placed_at", { ascending: true })
            .range(from, to)
        )
      : Promise.resolve([]),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    compare
      ? supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", prevStartIso)
          .lt("created_at", prevEndIso)
      : Promise.resolve({ count: 0 }),
    selectAll<{ bookmaker_id: string }>((from, to) =>
      supabase
        .from("affiliate_clicks")
        .select("bookmaker_id")
        .gte("clicked_at", startIso)
        .lt("clicked_at", endIso)
        .range(from, to)
    ),
    compare
      ? supabase
          .from("affiliate_clicks")
          .select("*", { count: "exact", head: true })
          .gte("clicked_at", prevStartIso)
          .lt("clicked_at", prevEndIso)
      : Promise.resolve({ count: 0 }),
    supabase.from("bookmakers").select("id, name"),
    selectAll<{ id: string }>((from, to) =>
      supabase
        .from("profiles")
        .select("id")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .range(from, to)
    ),
    // Bannervisningar och -klick i perioden. Aggregeras i appen så kortet
    // följer samma periodfilter som resten av sidan (vyn banner_stats är
    // total sedan start och duger bara till /admin/banners).
    selectAll<{ banner_id: string; event: string }>((from, to) =>
      supabase
        .from("banner_events")
        .select("banner_id, event")
        .gte("occurred_at", startIso)
        .lt("occurred_at", endIso)
        .range(from, to)
    ),
    supabase.from("banners").select("id, title, image_url, placement"),
  ]);

  // ---- Daily active users, current vs previous period -----------------------
  const currentBuckets = new Map<string, Set<string>>();
  const previousBuckets = new Map<string, Set<string>>();
  const currentKeys: string[] = [];
  const previousKeys: string[] = [];

  // Middag som ankare gör bucketen DST-säker: sommartidsskiftet flyttar
  // dygnet en timme, men aldrig tolv.
  const NOON = DAY_MS / 2;
  for (let i = 0; i < days; i++) {
    const cur = dayKey(new Date(start.getTime() + i * DAY_MS + NOON));
    const prev = dayKey(new Date(prevStart.getTime() + i * DAY_MS + NOON));
    currentKeys.push(cur);
    previousKeys.push(prev);
    currentBuckets.set(cur, new Set());
    previousBuckets.set(prev, new Set());
  }

  const activeNow = new Set<string>();
  const leagueCounts = new Map<string, number>();

  for (const bet of betsNow) {
    activeNow.add(bet.user_id);
    currentBuckets.get(dayKey(bet.placed_at))?.add(bet.user_id);

    const league = (bet.league || "").trim() || "Okänd liga";
    leagueCounts.set(league, (leagueCounts.get(league) ?? 0) + 1);
  }

  const activePrev = new Set<string>();
  for (const bet of betsPrev) {
    activePrev.add(bet.user_id);
    previousBuckets.get(dayKey(bet.placed_at))?.add(bet.user_id);
  }

  const chart: StatsPoint[] = currentKeys.map((key, i) => ({
    day: key,
    current: currentBuckets.get(key)?.size ?? 0,
    previous: compare ? (previousBuckets.get(previousKeys[i])?.size ?? 0) : null,
  }));

  // ---- Affiliate clicks per bookmaker --------------------------------------
  const bookmakerNames = new Map<string, string>(
    ((bookmakers.data ?? []) as { id: string; name: string }[]).map((b) => [
      b.id,
      b.name,
    ])
  );
  const clickCounts = new Map<string, number>();
  for (const click of clicksNow) {
    clickCounts.set(
      click.bookmaker_id,
      (clickCounts.get(click.bookmaker_id) ?? 0) + 1
    );
  }
  const affiliate = shares(
    [...clickCounts.entries()]
      .map(([id, count]) => ({
        name: bookmakerNames.get(id) ?? "Okänt bolag",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  );

  const leagues = shares(
    [...leagueCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  );

  // ---- Banner impressions and clicks ---------------------------------------
  const bannerMeta = new Map(
    (
      (banners.data ?? []) as {
        id: string;
        title: string;
        image_url: string | null;
        placement: string | null;
      }[]
    ).map((b) => [b.id, b])
  );

  const bannerCounts = new Map<string, { views: number; clicks: number }>();
  for (const row of bannerEvents) {
    const entry = bannerCounts.get(row.banner_id) ?? { views: 0, clicks: 0 };
    if (row.event === "click") entry.clicks += 1;
    else entry.views += 1;
    bannerCounts.set(row.banner_id, entry);
  }

  // Bara banners med händelser i perioden — raderade banners kan sakna
  // metadata men har kvar sina rader tills cascaden städat dem.
  const bannerRows: StatsBannerRow[] = [...bannerCounts.entries()]
    .map(([id, counts]) => {
      const meta = bannerMeta.get(id);
      return {
        id,
        title: meta?.title ?? "Raderad banner",
        imageUrl: meta?.image_url ?? null,
        placement: meta?.placement ?? "—",
        views: counts.views,
        clicks: counts.clicks,
        ctr: counts.views > 0 ? (counts.clicks / counts.views) * 100 : 0,
      };
    })
    .sort((a, b) => b.clicks - a.clicks || b.views - a.views);

  // ---- Conversion funnel over the users registered in the period -----------
  const cohortIds = cohort.map((c) => c.id);
  const cohortWithBet = new Set<string>();
  const cohortActive7 = new Set<string>();

  if (cohortIds.length) {
    for (const ids of chunk(cohortIds, IN_CHUNK)) {
      const rows = await selectAll<{ user_id: string; placed_at: string }>(
        (from, to) =>
          service
            .from("bets")
            .select("user_id, placed_at")
            .in("user_id", ids)
            .range(from, to)
      );
      for (const row of rows) {
        cohortWithBet.add(row.user_id);
        if (new Date(row.placed_at) >= last7) cohortActive7.add(row.user_id);
      }
    }
  }

  const registered = regsNow.count ?? 0;
  const withBet = cohortWithBet.size;
  const active7 = cohortActive7.size;

  const funnel: StatsFunnelStep[] = [
    { label: "Registrerade", value: registered, step: null },
    {
      label: "Loggat första spelet",
      value: withBet,
      step: registered > 0 ? (withBet / registered) * 100 : 0,
    },
    {
      label: "Aktiva senaste 7 dagarna",
      value: active7,
      step: withBet > 0 ? (active7 / withBet) * 100 : 0,
    },
  ];

  // ---- KPI cards -----------------------------------------------------------
  const kpiInput: { label: string; current: number; previous: number }[] = [
    {
      label: "Aktiva användare",
      current: activeNow.size,
      previous: activePrev.size,
    },
    {
      label: "Nya registreringar",
      current: registered,
      previous: regsPrev.count ?? 0,
    },
    { label: "Loggade spel", current: betsNow.length, previous: betsPrev.length },
    {
      label: "Affiliateklick",
      current: clicksNow.length,
      previous: clicksPrev.count ?? 0,
    },
  ];

  const kpis: StatsKpi[] = kpiInput.map((k) => ({
    label: k.label,
    value: formatInt(k.current),
    ...deltaOf(k.current, k.previous, compare),
  }));

  const rangeFormatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    day: "numeric",
    month: "short",
  });

  return {
    period,
    periodLabel: config.label,
    days,
    rangeLabel: `${rangeFormatter.format(start)} – ${rangeFormatter.format(now)}`,
    compare,
    kpis,
    chart,
    affiliate,
    leagues,
    banners: bannerRows,
    funnel,
  };
}
