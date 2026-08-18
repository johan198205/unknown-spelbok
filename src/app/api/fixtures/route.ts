import { NextRequest, NextResponse } from "next/server";
import {
  ensureFixturesForDate,
  getFixtureCoverage,
  isFixtureDayReady,
  resolveFixtureCoverage,
} from "@/lib/ensure-fixtures";
import { teamLogoUrl } from "@/lib/logos";
import { stockholmDayBounds } from "@/lib/stockholm";
import { createClient } from "@/lib/supabase/server";
import type { Fixture } from "@/lib/types";

export const maxDuration = 180;

const CACHE = { "Cache-Control": "private, max-age=30" };
const MAX_LIMIT = 800;
const DEFAULT_LIMIT = 500;
const WINDOW_DAYS = 14;
const UPCOMING = ["NS", "TBD", "1H", "HT", "2H", "ET", "BT", "P", "LIVE"];
const HIDDEN_STATUSES = ["PST", "CANC", "ABD"];
const FIXTURE_COLUMNS =
  "fixture_id, kickoff, status, sport, league_id, league_name, league_logo, home_team_id, home_name, home_logo, away_team_id, away_name, away_logo, home_score, away_score, season, raw, updated_at";

function sanitizeIlike(raw: string) {
  return raw.replace(/[%_,()\\]/g, " ").trim().slice(0, 80);
}

function venueFromRaw(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const name = (raw as { fixture?: { venue?: { name?: string | null } } })
    .fixture?.venue?.name;
  const trimmed = name?.trim();
  return trimmed || null;
}

function withLogos<
  T extends Pick<
    Fixture,
    "home_logo" | "away_logo" | "home_team_id" | "away_team_id" | "sport"
  > & { raw?: unknown }
>(row: T) {
  const { raw, ...rest } = row;
  return {
    ...rest,
    home_logo: teamLogoUrl(row.home_logo, row.home_team_id, row.sport),
    away_logo: teamLogoUrl(row.away_logo, row.away_team_id, row.sport),
    venue: venueFromRaw(raw),
  };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Ej inloggad" }, { status: 401 }),
    };
  }
  return { supabase };
}

/**
 * Läser fixtures-cachen. Om ett visst datum saknas i cachen hämtas
 * den dagen en gång från API-Sports och skrivs till Supabase.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const params = request.nextUrl.searchParams;
  const league = params.get("league");
  const date = params.get("date");
  let from = params.get("from");
  let to = params.get("to");
  const status = params.get("status");
  const idsRaw = params.get("ids") ?? "";
  const q = sanitizeIlike(params.get("q") ?? "");
  const limit = Math.min(
    Number(params.get("limit") || DEFAULT_LIMIT) || DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const ids = idsRaw
    .split(/[,-]/)
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id) && id > 0)
    .slice(0, MAX_LIMIT);

  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Ogiltigt datum" }, { status: 400 });
    }
    const bounds = stockholmDayBounds(date);
    from = bounds.from;
    to = bounds.to;
  }

  async function load() {
    let query = supabase
      .from("fixtures")
      .select(FIXTURE_COLUMNS)
      .order("kickoff", { ascending: true })
      .limit(limit);

    if (ids.length) {
      query = query.in("fixture_id", ids);
      return query;
    }

    if (league) {
      const id = Number(league);
      if (!Number.isFinite(id)) {
        throw new Error("Ogiltig league");
      }
      query = query.eq("league_id", id);
    }

    if (from || to) {
      if (from) query = query.gte("kickoff", from);
      if (to) query = query.lt("kickoff", to);
    } else {
      const start = new Date();
      const end = new Date(start.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
      query = query
        .gte("kickoff", start.toISOString())
        .lt("kickoff", end.toISOString());
    }

    if (status) query = query.eq("status", status);
    else if (date) {
      query = query.not(
        "status",
        "in",
        `(${HIDDEN_STATUSES.join(",")})`
      );
    } else query = query.in("status", UPCOMING);

    if (q) {
      query = query.or(
        `home_name.ilike.%${q}%,away_name.ilike.%${q}%,league_name.ilike.%${q}%`
      );
    }

    return query;
  }

  try {
    let source = "cache";
    let coverage = ids.length ? null : await resolveFixtureCoverage();
    const planLimited = !!(
      date &&
      coverage &&
      (date < coverage.from || date > coverage.to)
    );

    if (date && !planLimited && !ids.length) {
      const filled = await ensureFixturesForDate(date);
      if (filled > 0) source = "api";
    }

    const { data, error } = await load();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const latestCoverage = ids.length ? null : getFixtureCoverage() ?? coverage;
    const filling =
      !!(date && !planLimited && !ids.length) &&
      !(await isFixtureDayReady(date));
    const fixtures = (data ?? []).map(withLogos);
    return NextResponse.json(
      {
        fixtures,
        source,
        coverage: latestCoverage,
        filling: filling || undefined,
        reason: planLimited ? "plan" : undefined,
      },
      { headers: filling ? { "Cache-Control": "no-store" } : CACHE }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunde inte hämta matcher";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
