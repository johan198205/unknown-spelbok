// =============================================================
// SPELBOK — Edge Function: settle-bets
//
// Körs var 15:e minut (se db/cron.sql). Flödet:
//   1. Hämta fixtures vars avspark passerat men som inte är slutrapporterade.
//   2. Fråga API-Football om resultat, uppdatera fixtures-cachen.
//   3. Rätta öppna spel vars tips går att maskinläsa (1/X/2, Över/Under).
//   4. Allt som inte går att avgöra hamnar i settle_queue för admin.
//
// Deploy:
//   supabase functions deploy settle-bets
//   supabase secrets set APIFOOTBALL_KEY=...
// =============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

type FixtureRow = {
  fixture_id: number;
  kickoff: string;
  status: string;
  home_name: string | null;
  away_name: string | null;
  home_score: number | null;
  away_score: number | null;
};

type BetRow = {
  id: string;
  fixture_id: number | null;
  pick: string;
  match: string;
};

type ApiFixture = {
  fixture: { id: number; status: { short: string } };
  goals: { home: number | null; away: number | null };
  score?: { fulltime?: { home: number | null; away: number | null } };
};

/** API-Football-statusar där matchen är färdigspelad och resultatet gäller. */
const FINAL = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
/** Statusar där matchen inte kommer att spelas som planerat. */
const ABANDONED = new Set(["PST", "CANC", "ABD", "SUSP", "INT", "TBD"]);

const API_IDS_PER_CALL = 20;
const FIXTURE_BATCH = 200;
const GRACE_MINUTES = 110; // ~90 min match + paus innan vi ens frågar

type Settlement = "win" | "loss" | "void";

/**
 * Läser ett tips och returnerar resultat, eller null när tipset inte går att
 * avgöra maskinellt (då hamnar spelet i settle_queue).
 *
 * Klarar de former appen faktiskt sparar (se src/lib/picks.ts):
 *   "1 (hemma)", "X (oavgjort)", "2 (borta)", "Ö2.5", "U2.5", "Över 2,5 mål"
 * Allt annat — dubbelchans, DNB, handikapp, hörnor, kort, halvlek, målskytt —
 * lämnas till admin. Det är avsiktligt: hellre en rad i kön än en felrättning.
 */
export function resolvePick(
  pick: string,
  homeScore: number,
  awayScore: number
): Settlement | null {
  const raw = pick
    .toLowerCase()
    .replace(",", ".")
    .replace(/\([^)]*\)/g, " ") // "1 (hemma)" → "1"
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return null;

  // 1X2
  if (["1", "hemma", "home"].includes(raw)) {
    return homeScore > awayScore ? "win" : "loss";
  }
  if (["x", "kryss", "draw", "oavgjort"].includes(raw)) {
    return homeScore === awayScore ? "win" : "loss";
  }
  if (["2", "borta", "away"].includes(raw)) {
    return awayScore > homeScore ? "win" : "loss";
  }

  // Över/Under totalt antal mål. Suffixet "mål" är tillåtet, allt annat
  // (hörnor, kort, halvlek, lagets mål) gör att matchningen faller igenom.
  const total = homeScore + awayScore;
  const line = /^(över|over|ö|o|under|u)\s*(\d+(?:\.\d+)?)(?:\s*mål)?$/.exec(raw);
  if (line) {
    const value = Number(line[2]);
    if (total === value) return "void"; // heltalslinje = push
    const isOver = line[1] !== "under" && line[1] !== "u";
    const above = total > value;
    return isOver === above ? "win" : "loss";
  }

  return null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function fetchResults(ids: number[], key: string) {
  const results = new Map<number, ApiFixture>();

  for (const group of chunk(ids, API_IDS_PER_CALL)) {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?ids=${group.join("-")}`,
      { headers: { "x-apisports-key": key } }
    );

    if (!res.ok) {
      console.error(`API-Football ${res.status} för ${group.length} fixtures`);
      continue;
    }

    const json = (await res.json()) as { response?: ApiFixture[] };
    for (const item of json.response ?? []) {
      results.set(item.fixture.id, item);
    }
  }

  return results;
}

Deno.serve(async (req) => {
  const startedAt = Date.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("APIFOOTBALL_KEY");

  if (!supabaseUrl || !serviceKey) {
    return Response.json(
      { error: "SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY saknas" },
      { status: 500 }
    );
  }
  if (!apiKey) {
    return Response.json({ error: "APIFOOTBALL_KEY saknas" }, { status: 500 });
  }

  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000).toISOString();

  // 1. Fixtures som borde vara färdigspelade men inte har slutstatus.
  const { data: pending, error: pendingError } = await supabase
    .from("fixtures")
    .select(
      "fixture_id, kickoff, status, home_name, away_name, home_score, away_score"
    )
    .lt("kickoff", cutoff)
    .not("status", "in", `(${[...FINAL].join(",")})`)
    .order("kickoff", { ascending: false })
    .limit(FIXTURE_BATCH);

  if (pendingError) {
    return Response.json({ error: pendingError.message }, { status: 500 });
  }

  const fixtures = (pending ?? []) as FixtureRow[];
  const summary = {
    checked: fixtures.length,
    updated: 0,
    settled: 0,
    queued: 0,
    dryRun,
  };

  if (!fixtures.length) {
    return Response.json({ ...summary, ms: Date.now() - startedAt });
  }

  // 2. Hämta resultat och skriv tillbaka i cachen.
  const results = await fetchResults(
    fixtures.map((f) => f.fixture_id),
    apiKey
  );

  const finalById = new Map<number, { home: number; away: number }>();
  const abandonedIds: number[] = [];
  const missingIds: number[] = [];
  const updates: Record<string, unknown>[] = [];

  for (const fixture of fixtures) {
    const api = results.get(fixture.fixture_id);
    if (!api) {
      missingIds.push(fixture.fixture_id);
      continue;
    }

    const status = api.fixture.status.short;
    const home = api.goals.home ?? api.score?.fulltime?.home ?? null;
    const away = api.goals.away ?? api.score?.fulltime?.away ?? null;

    updates.push({
      fixture_id: fixture.fixture_id,
      kickoff: fixture.kickoff,
      status,
      home_score: home,
      away_score: away,
      updated_at: new Date().toISOString(),
    });

    if (FINAL.has(status) && home != null && away != null) {
      finalById.set(fixture.fixture_id, { home, away });
    } else if (ABANDONED.has(status)) {
      abandonedIds.push(fixture.fixture_id);
    }
  }

  if (updates.length && !dryRun) {
    const { error } = await supabase
      .from("fixtures")
      .upsert(updates, { onConflict: "fixture_id" });
    if (error) console.error("fixtures upsert misslyckades", error.message);
    else summary.updated = updates.length;
  } else {
    summary.updated = updates.length;
  }

  // 3. Öppna spel på de matcher vi nu vet något om.
  const touchedIds = [
    ...finalById.keys(),
    ...abandonedIds,
    ...missingIds,
  ];
  if (!touchedIds.length) {
    return Response.json({ ...summary, ms: Date.now() - startedAt });
  }

  const { data: openBets, error: betsError } = await supabase
    .from("bets")
    .select("id, fixture_id, pick, match")
    .eq("result", "open")
    .in("fixture_id", touchedIds);

  if (betsError) {
    return Response.json({ error: betsError.message }, { status: 500 });
  }

  const bets = (openBets ?? []) as BetRow[];
  if (!bets.length) {
    return Response.json({ ...summary, ms: Date.now() - startedAt });
  }

  // Spel som redan ligger olösta i kön ska inte köas igen.
  const { data: queued } = await supabase
    .from("settle_queue")
    .select("bet_id")
    .eq("resolved", false)
    .in(
      "bet_id",
      bets.map((b) => b.id)
    );
  const alreadyQueued = new Set(
    ((queued ?? []) as { bet_id: string }[]).map((q) => q.bet_id)
  );

  const settledAt = new Date().toISOString();
  const byResult: Record<Settlement, string[]> = { win: [], loss: [], void: [] };
  const queueRows: { bet_id: string; reason: string }[] = [];

  for (const bet of bets) {
    const id = bet.fixture_id!;

    if (missingIds.includes(id)) {
      if (!alreadyQueued.has(bet.id)) {
        queueRows.push({ bet_id: bet.id, reason: "fixture_missing" });
      }
      continue;
    }

    if (abandonedIds.includes(id)) {
      if (!alreadyQueued.has(bet.id)) {
        queueRows.push({ bet_id: bet.id, reason: "postponed" });
      }
      continue;
    }

    const score = finalById.get(id);
    if (!score) continue;

    const outcome = resolvePick(bet.pick, score.home, score.away);
    if (!outcome) {
      if (!alreadyQueued.has(bet.id)) {
        queueRows.push({ bet_id: bet.id, reason: "unclear" });
      }
      continue;
    }

    byResult[outcome].push(bet.id);
  }

  // 4. Skriv resultaten — en update per utfall räcker.
  for (const [result, ids] of Object.entries(byResult) as [
    Settlement,
    string[],
  ][]) {
    if (!ids.length) continue;
    summary.settled += ids.length;
    if (dryRun) continue;

    const { error } = await supabase
      .from("bets")
      .update({ result, settled_at: settledAt, settled_by: "auto" })
      .in("id", ids)
      .eq("result", "open");
    if (error) console.error(`kunde inte rätta ${result}`, error.message);
  }

  if (queueRows.length) {
    summary.queued = queueRows.length;
    if (!dryRun) {
      const { error } = await supabase.from("settle_queue").insert(queueRows);
      if (error) console.error("settle_queue insert misslyckades", error.message);
    }
  }

  return Response.json({ ...summary, ms: Date.now() - startedAt });
});
