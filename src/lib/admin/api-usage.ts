/**
 * Adminstatistik för API-Sports-förbrukning.
 *
 * All aggregering sker i SQL (public.get_api_usage, se
 * db/api-usage-migration.sql). Här görs bara periodmatematik,
 * etiketter och formatering.
 *
 * Loggen är service role-only, så läsningen går via admin-klienten
 * — anropande kod ansvarar för adminkontrollen.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { addStockholmDays, stockholmDayBounds, stockholmYmd } from "@/lib/stockholm";

export type ApiUsageProvider = "api-football" | "api-hockey";
export type ApiUsageProviderFilter = "all" | ApiUsageProvider;
export type ApiUsagePeriod = "today" | "7d" | "30d" | "custom";
export type ApiUsageGroupBy = "day" | "hour";

export const API_USAGE_PROVIDERS: {
  key: ApiUsageProviderFilter;
  label: string;
}[] = [
  { key: "all", label: "Alla" },
  { key: "api-football", label: "Fotboll" },
  { key: "api-hockey", label: "Ishockey" },
];

export const API_USAGE_PERIODS: {
  key: ApiUsagePeriod;
  label: string;
  days: number | null;
}[] = [
  { key: "today", label: "Idag", days: 1 },
  { key: "7d", label: "7 dagar", days: 7 },
  { key: "30d", label: "30 dagar", days: 30 },
  { key: "custom", label: "Anpassad", days: null },
];

export const PROVIDER_LABELS: Record<ApiUsageProvider, string> = {
  "api-football": "API-Football",
  "api-hockey": "API-Hockey",
};

/** Ett års logg räcker gott — längre spann ger bara långsamma sidor. */
const MAX_RANGE_DAYS = 366;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export type ApiUsageFilters = {
  period: ApiUsagePeriod;
  provider: ApiUsageProviderFilter;
  /** Inklusive start, ISO. */
  from: string;
  /** Exklusive slut, ISO. */
  to: string;
  /** Datumväljarens värden (svensk kalenderdag, slutdagen inklusive). */
  fromYmd: string;
  toYmd: string;
  groupBy: ApiUsageGroupBy;
};

export type ApiUsageTotals = {
  external: number;
  cache: number;
  total: number;
  failed: number;
  avgResponseMs: number | null;
  cacheHitRate: number;
};

export type ApiUsagePoint = {
  bucket: string;
  label: string;
  external: number;
  cache: number;
};

export type ApiUsageEndpoint = {
  endpoint: string;
  total: number;
  external: number;
  cache: number;
  share: number;
  avgResponseMs: number | null;
};

export type ApiUsageQuota = {
  provider: ApiUsageProvider;
  label: string;
  used: number | null;
  limit: number | null;
  remaining: number | null;
  usedPct: number | null;
  recordedAt: string | null;
  /** Räknat ur vår egen logg i stället för API:ets kvotheaders. */
  estimated: boolean;
  externalToday: number;
  cacheToday: number;
};

export type ApiUsageData = {
  filters: ApiUsageFilters;
  rangeLabel: string;
  totals: ApiUsageTotals;
  series: ApiUsagePoint[];
  endpoints: ApiUsageEndpoint[];
  quota: ApiUsageQuota[];
};

function isProvider(value: unknown): value is ApiUsageProvider {
  return value === "api-football" || value === "api-hockey";
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampYmd(value: string | undefined, fallback: string) {
  return value && YMD.test(value) ? value : fallback;
}

/**
 * Läser filtren ur URL:en. Alla värden är valfria — utan dem visas
 * de senaste 7 dygnen för båda providers.
 */
export function parseApiUsageFilters(input: {
  period?: string | null;
  provider?: string | null;
  from?: string | null;
  to?: string | null;
  groupBy?: string | null;
}): ApiUsageFilters {
  const today = stockholmYmd();

  const provider: ApiUsageProviderFilter = isProvider(input.provider)
    ? input.provider
    : "all";

  const periodKey = API_USAGE_PERIODS.find((p) => p.key === input.period);
  // ?from/?to utan ?period (t.ex. från API-routen) räknas som anpassad period.
  const hasRange = !!(input.from && input.to);
  const period: ApiUsagePeriod = periodKey
    ? periodKey.key
    : hasRange
      ? "custom"
      : "7d";

  let fromYmd: string;
  let toYmd: string;

  if (period === "custom") {
    const rawFrom = clampYmd(
      input.from?.slice(0, 10),
      addStockholmDays(today, -29)
    );
    const rawTo = clampYmd(input.to?.slice(0, 10), today);
    fromYmd = rawFrom <= rawTo ? rawFrom : rawTo;
    toYmd = rawFrom <= rawTo ? rawTo : rawFrom;
    // Kapa orimliga spann i stället för att låta SQL:en generera 10 000 buckets.
    const earliest = addStockholmDays(toYmd, -(MAX_RANGE_DAYS - 1));
    if (fromYmd < earliest) fromYmd = earliest;
  } else {
    const days = API_USAGE_PERIODS.find((p) => p.key === period)?.days ?? 7;
    fromYmd = addStockholmDays(today, -(days - 1));
    toYmd = today;
  }

  const from = stockholmDayBounds(fromYmd).from;
  const to = stockholmDayBounds(toYmd).to;

  const spansOneDay = fromYmd === toYmd;
  const groupBy: ApiUsageGroupBy =
    input.groupBy === "hour" || input.groupBy === "day"
      ? input.groupBy
      : spansOneDay
        ? "hour"
        : "day";

  return { period, provider, from, to, fromYmd, toYmd, groupBy };
}

function labelForBucket(bucket: string, groupBy: ApiUsageGroupBy) {
  if (groupBy === "hour") {
    const time = bucket.slice(11, 16);
    return time || bucket;
  }
  const [y, m, d] = bucket.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return bucket;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function rangeLabelOf(filters: ApiUsageFilters) {
  const fmt = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  if (filters.fromYmd === filters.toYmd) return fmt(filters.fromYmd);
  return `${fmt(filters.fromYmd)} – ${fmt(filters.toYmd)}`;
}

type UsagePayload = {
  totals?: {
    external_requests?: number;
    cache_hits?: number;
    total_requests?: number;
    failed_requests?: number;
    avg_response_ms?: number | null;
  };
  series?: {
    bucket?: string;
    external_requests?: number;
    cache_hits?: number;
  }[];
  endpoints?: {
    endpoint?: string;
    total_requests?: number;
    external_requests?: number;
    cache_hits?: number;
    avg_response_ms?: number | null;
    share?: number;
  }[];
  quota?: {
    provider?: string;
    requests_remaining?: number | null;
    requests_limit?: number | null;
    recorded_at?: string | null;
  }[];
  today?: {
    provider?: string;
    external_requests?: number;
    cache_hits?: number;
  }[];
};

function buildQuota(payload: UsagePayload): ApiUsageQuota[] {
  const byProvider = new Map(
    (payload.quota ?? [])
      .filter((q) => isProvider(q.provider))
      .map((q) => [q.provider as ApiUsageProvider, q])
  );
  const todayByProvider = new Map(
    (payload.today ?? [])
      .filter((t) => isProvider(t.provider))
      .map((t) => [t.provider as ApiUsageProvider, t])
  );

  return (["api-football", "api-hockey"] as ApiUsageProvider[]).map(
    (provider) => {
      const q = byProvider.get(provider);
      const today = todayByProvider.get(provider);
      const externalToday = num(today?.external_requests);
      const cacheToday = num(today?.cache_hits);

      const limit = numOrNull(q?.requests_limit);
      const remaining = numOrNull(q?.requests_remaining);
      const fromHeaders = limit != null && remaining != null;
      const used = fromHeaders
        ? Math.max(limit - remaining, 0)
        : externalToday || null;

      return {
        provider,
        label: PROVIDER_LABELS[provider],
        used,
        limit,
        remaining,
        usedPct:
          fromHeaders && limit > 0
            ? Math.min(((limit - remaining) / limit) * 100, 100)
            : null,
        recordedAt: q?.recorded_at ?? null,
        estimated: !fromHeaders,
        externalToday,
        cacheToday,
      };
    }
  );
}

/** Hämtar och formaterar hela förbrukningsbilden för perioden. */
export async function getApiUsage(
  filters: ApiUsageFilters
): Promise<ApiUsageData> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_api_usage", {
    p_from: filters.from,
    p_to: filters.to,
    p_provider: filters.provider === "all" ? null : filters.provider,
    p_group_by: filters.groupBy,
  });

  if (error) throw new Error(error.message);

  const payload = (data ?? {}) as UsagePayload;
  const external = num(payload.totals?.external_requests);
  const cache = num(payload.totals?.cache_hits);
  const total = num(payload.totals?.total_requests);

  return {
    filters,
    rangeLabel: rangeLabelOf(filters),
    totals: {
      external,
      cache,
      total,
      failed: num(payload.totals?.failed_requests),
      avgResponseMs: numOrNull(payload.totals?.avg_response_ms),
      cacheHitRate: total > 0 ? (cache / total) * 100 : 0,
    },
    series: (payload.series ?? []).map((point) => ({
      bucket: String(point.bucket ?? ""),
      label: labelForBucket(String(point.bucket ?? ""), filters.groupBy),
      external: num(point.external_requests),
      cache: num(point.cache_hits),
    })),
    endpoints: (payload.endpoints ?? []).map((row) => ({
      endpoint: String(row.endpoint ?? "–"),
      total: num(row.total_requests),
      external: num(row.external_requests),
      cache: num(row.cache_hits),
      share: num(row.share),
      avgResponseMs: numOrNull(row.avg_response_ms),
    })),
    quota: buildQuota(payload),
  };
}
