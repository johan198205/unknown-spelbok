import { createClient } from "@/lib/supabase/server";

export type OverviewKpi = {
  label: string;
  value: string;
  color: string;
  delta: string;
  deltaColor: string;
};

export type OverviewEvent = {
  color: string;
  text: string;
  detail: string;
  time: string;
  at: number;
};

export type OverviewData = {
  kpis: OverviewKpi[];
  chart: { date: string; count: number }[];
  chartTotal: number;
  events: OverviewEvent[];
};

function startOfTodayStockholm() {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  for (const offset of ["+02:00", "+01:00"] as const) {
    const candidate = new Date(`${day}T00:00:00${offset}`);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(candidate);
    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    if (
      `${get("year")}-${get("month")}-${get("day")}` === day &&
      get("hour") === "00" &&
      get("minute") === "00"
    ) {
      return candidate.toISOString();
    }
  }

  return new Date(`${day}T00:00:00+02:00`).toISOString();
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just nu";
  if (mins < 60) return `för ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `för ${hours} tim`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "igår";
  return `${days} dagar`;
}

function formatInt(n: number) {
  return n.toLocaleString("sv-SE");
}

export async function getOverviewData(): Promise<OverviewData> {
  const supabase = await createClient();
  const today = startOfTodayStockholm();
  const since30 = daysAgoIso(29);

  const [
    usersTotal,
    usersToday,
    betsToday,
    clicksToday,
    recentProfiles,
    recentLogs,
    regs30,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today),
    supabase
      .from("bets")
      .select("*", { count: "exact", head: true })
      .gte("placed_at", today),
    supabase
      .from("affiliate_clicks")
      .select("*", { count: "exact", head: true })
      .gte("clicked_at", today),
    supabase
      .from("profiles")
      .select("id, username, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("admin_logs")
      .select("id, action, target, meta, created_at, profiles:admin_id(username)")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", since30),
  ]);

  const total = usersTotal.count ?? 0;
  const newToday = usersToday.count ?? 0;
  const bets = betsToday.count ?? 0;
  const clicks = clicksToday.count ?? 0;

  const dayKey = (iso: string) => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  };

  const counts = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    counts.set(dayKey(d.toISOString()), 0);
  }
  for (const row of regs30.data ?? []) {
    const k = dayKey(row.created_at);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const chart = [...counts.entries()].map(([date, count]) => ({ date, count }));
  const chartTotal = chart.reduce((s, p) => s + p.count, 0);

  const events: OverviewEvent[] = [];

  for (const p of recentProfiles.data ?? []) {
    events.push({
      color: "var(--win)",
      text: `Ny användare: ${p.username}`,
      detail: "Registrering",
      time: relativeTime(p.created_at),
      at: new Date(p.created_at).getTime(),
    });
  }

  for (const log of recentLogs.data ?? []) {
    const adminName =
      (log.profiles as { username?: string } | null)?.username ?? "admin";
    events.push({
      color: eventColor(log.action),
      text: formatLogAction(log.action, log.target),
      detail: `av ${adminName}`,
      time: relativeTime(log.created_at),
      at: new Date(log.created_at).getTime(),
    });
  }

  events.sort((a, b) => b.at - a.at);

  return {
    kpis: [
      {
        label: "Användare totalt",
        value: formatInt(total),
        color: "var(--text)",
        delta: `+${formatInt(chartTotal)} senaste 30 dagarna`,
        deltaColor: "var(--win)",
      },
      {
        label: "Nya idag",
        value: newToday > 0 ? `+${formatInt(newToday)}` : "0",
        color: "var(--win)",
        delta: "sedan midnatt",
        deltaColor: "var(--muted)",
      },
      {
        label: "Spel idag",
        value: formatInt(bets),
        color: "var(--text)",
        delta: "placerade idag",
        deltaColor: "var(--muted)",
      },
      {
        label: "Affiliateklick idag",
        value: formatInt(clicks),
        color: "var(--cyan)",
        delta: "via /go",
        deltaColor: "var(--muted)",
      },
    ],
    chart,
    chartTotal,
    events: events.slice(0, 15),
  };
}

function eventColor(action: string) {
  if (action.startsWith("user.")) return "var(--amber)";
  if (action.startsWith("bookmaker.")) return "var(--cyan)";
  if (action.startsWith("banner.")) return "var(--amber)";
  if (action.startsWith("page.")) return "var(--blue)";
  if (action.startsWith("competition.")) return "var(--blue)";
  if (action.startsWith("settle.")) return "var(--loss)";
  return "var(--muted)";
}

function formatLogAction(action: string, target: string | null) {
  const t = target ?? "";
  switch (action) {
    case "user.role_changed":
      return `Roll ändrad: ${t}`;
    case "user.banned":
      return `Konto avstängt: ${t}`;
    case "bookmaker.updated":
      return `Spelbolag uppdaterat: ${t}`;
    case "page.published":
      return `Sida publicerad: ${t}`;
    case "page.deleted":
      return `Sida raderad: ${t}`;
    default:
      return t ? `${action} · ${t}` : action;
  }
}
