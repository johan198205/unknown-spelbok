/**
 * SPELBOK — Edge Function: generate-daily-suggestions
 *
 * Körs 05:00 UTC (= 07:00 svensk sommartid, se db/daily-suggestions.sql).
 * Matchar dagens fixtures mot varje användares spelhistorik och skriver
 * upp till 5 förslag per användare till daily_suggestions.
 *
 * Noll anrop mot api-sports: dagens matcher läses ur fixtures-cachen som
 * sync-fixtures fyllt 03:00 UTC. Är cachen tom (t.ex. free-plan-spärr)
 * avslutas körningen tyst — inga rader skrivs, ingen push skickas.
 *
 * Idempotent: upsert på (user_id, suggestion_date, fixture_id). Pushen
 * skickas bara första gången dagens körning lyckas — sync_log är facit.
 *
 * Deploy:
 *   supabase functions deploy generate-daily-suggestions
 */

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { notifySite } from "../_shared/site-notify.ts";
import { computeFixtureSignals } from "../_shared/signal-compute.ts";
import { evaluateRule, type SignalRuleRow } from "../_shared/signals.ts";
import {
  ambiguousLeagueNames,
  MAX_SUGGESTIONS_PER_SHEET,
  MAX_SUGGESTIONS_PER_USER,
  MIN_SEGMENT_BETS,
  MIN_SHEET_SETTLED_BETS,
  MIN_TOTAL_SETTLED_BETS,
  sportSlugOf,
  suggestionsForUser,
  toSuggestionRow,
  type CandidateFixture,
  type ProfileSegment,
  type Thresholds,
} from "../_shared/suggest.ts";
import {
  createServiceClient,
  finishSyncLog,
  startSyncLog,
} from "../_shared/supabase.ts";

const JOB = "generate-daily-suggestions";
const TIMEZONE = "Europe/Stockholm";
const MAX_FIXTURES = 2000;
const MAX_USERS = 500;
const MAX_SHEETS = 1500;
/** Uppskjutet/inställt ska inte föreslås. */
const HIDDEN_STATUSES = ["PST", "CANC", "ABD", "FT", "AET", "PEN", "AWD", "WO"];
const FIXTURE_COLUMNS =
  "fixture_id, kickoff, sport, season, league_id, league_name, league_logo, " +
  "home_team_id, home_name, home_logo, away_team_id, away_name, away_logo";

type CandidateUser = {
  user_id: string;
  settled_bets: number;
  dominant_sport: string;
};

type CandidateSheet = CandidateUser & { sheet_id: string };

/**
 * Spelform → spelform-familj i användarprofilen. Speglar SIGNAL_BET_TYPES
 * i src/lib/signals/fields.ts; familjenamnen kommer från bet_type_family()
 * i db/daily-suggestions.sql.
 */
const BET_TYPE_FAMILY: Record<string, string> = {
  over_2_5: "Över/under",
  under_2_5: "Över/under",
  btts: "Båda lagen mål",
  "1x2_home": "1X2",
  "1x2_draw": "1X2",
  "1x2_away": "1X2",
  handicap: "Handikapp",
};

type BetTeamRow = {
  user_id: string;
  fixtures: { home_team_id: number | null; away_team_id: number | null } | null;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function stockholmYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function tzOffsetMs(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return (
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second")
    ) - instant.getTime()
  );
}

/** [midnatt, midnatt+1d) för ett svenskt kalenderdygn, som ISO. */
function stockholmDayBounds(ymd: string) {
  const midnight = (day: string) => {
    const guess = new Date(`${day}T00:00:00Z`);
    return new Date(guess.getTime() - tzOffsetMs(guess));
  };
  const [y, m, d] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { from: midnight(ymd).toISOString(), to: midnight(next).toISOString() };
}

/** Har dagens push redan gått ut? sync_log är enda spåret vi har. */
async function alreadyPushed(supabase: SupabaseClient, ymd: string) {
  const { data } = await supabase
    .from("sync_log")
    .select("id")
    .eq("job", JOB)
    .eq("ok", true)
    .contains("meta", { ymd, pushed: true })
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Lag-id per användare ur matcher de tidigare spelat på. */
async function loadTeamHistory(supabase: SupabaseClient, userIds: string[]) {
  const byUser = new Map<string, Set<number>>();
  if (!userIds.length) return byUser;

  const { data, error } = await supabase
    .from("bets")
    .select("user_id, fixtures:fixture_id(home_team_id, away_team_id)")
    .in("user_id", userIds)
    .neq("result", "open")
    .not("fixture_id", "is", null);

  if (error) {
    console.warn(`${JOB}: laghistorik kunde inte läsas — ${error.message}`);
    return byUser;
  }

  for (const row of (data ?? []) as unknown as BetTeamRow[]) {
    // PostgREST returnerar embedded rows som objekt eller lista beroende på relation.
    const fixture = Array.isArray(row.fixtures) ? row.fixtures[0] : row.fixtures;
    if (!fixture) continue;
    const set = byUser.get(row.user_id) ?? new Set<number>();
    if (fixture.home_team_id != null) set.add(Number(fixture.home_team_id));
    if (fixture.away_team_id != null) set.add(Number(fixture.away_team_id));
    byUser.set(row.user_id, set);
  }
  return byUser;
}

export async function handleGenerateDailySuggestions(req: Request) {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry") === "1";
  const ymd = url.searchParams.get("date") || stockholmYmd();

  // Sänkta trösklar är ett felsökningsverktyg och godtas bara tillsammans
  // med dry=1. Den schemalagda körningen kan alltså aldrig råka skriva
  // förslag som byggts på tunnare underlag än reglerna tillåter.
  const thresholds: Thresholds = {};
  if (dryRun) {
    const minSegment = Number(url.searchParams.get("minSegment"));
    const minScore = Number(url.searchParams.get("minScore"));
    if (Number.isFinite(minSegment) && minSegment > 0) {
      thresholds.minSegmentBets = Math.floor(minSegment);
    }
    if (Number.isFinite(minScore) && minScore > 0) {
      thresholds.minMatchScore = Math.floor(minScore);
    }
  }

  const supabase = createServiceClient();
  const summary = {
    date: ymd,
    fixtures: 0,
    users: 0,
    sheets: 0,
    ambiguousLeagues: 0,
    syncedLeagues: 0,
    minSegmentBets: 0,
    activeRules: 0,
    signals: null as unknown,
    suggestions: 0,
    pushed: 0,
    dryRun,
    // Kopia, inte referens: ambiguousLeagueNames läggs på thresholds senare
    // och är ett Set, som JSON-serialiseras till {} — det såg ut som att
    // inga tvetydiga namn hittats trots att räknaren sa 18.
    ...(Object.keys(thresholds).length ? { thresholds: { ...thresholds } } : {}),
  };

  let logId: string | null = null;

  try {
    const { from, to } = stockholmDayBounds(ymd);
    const nowIso = new Date().toISOString();
    const startIso = from > nowIso ? from : nowIso;

    const { data: fixtureRows, error: fixtureError } = await supabase
      .from("fixtures")
      .select(FIXTURE_COLUMNS)
      .gte("kickoff", startIso)
      .lt("kickoff", to)
      .not("status", "in", `("${HIDDEN_STATUSES.join('","')}")`)
      .order("kickoff", { ascending: true })
      .limit(MAX_FIXTURES);

    if (fixtureError) throw new Error(`fixtures: ${fixtureError.message}`);

    const fixtures = (fixtureRows ?? []) as CandidateFixture[];
    summary.fixtures = fixtures.length;

    /**
     * Segmenttröskeln som inställning i stället för konstant.
     *
     * Den styr hela motorns känslighet — hur många rättade spel i samma
     * liga och spelform som krävs innan segmentet räknas. Att ändra den
     * har hittills krävt en deploy, vilket gjort den praktiskt omöjlig att
     * tuna. Nu läses den ur app_settings:
     *
     *   insert into app_settings (key, value)
     *   values ('suggestions', '{"min_segment_bets": 3}')
     *   on conflict (key) do update set value = excluded.value;
     *
     * Saknas nyckeln gäller MIN_SEGMENT_BETS. En dry-run-override vinner
     * över båda — den är felsökningsverktyget.
     */
    if (thresholds.minSegmentBets === undefined) {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "suggestions")
        .maybeSingle();
      const configured = Number(
        (setting?.value as { min_segment_bets?: unknown } | null)
          ?.min_segment_bets
      );
      if (Number.isFinite(configured) && configured > 0) {
        thresholds.minSegmentBets = Math.floor(configured);
      }
    }
    summary.minSegmentBets = thresholds.minSegmentBets ?? MIN_SEGMENT_BETS;

    // Tom cache = api-sports nekade eller sync-fixtures har inte hunnit.
    // Skriv ingenting, pusha ingenting, krascha ingenting.
    if (!fixtures.length) {
      console.warn(`${JOB}: inga matcher i cachen för ${ymd} — hoppar över`);
      return json({ ...summary, skipped: "no_fixtures", ms: Date.now() - startedAt });
    }

    const { data: userRows, error: userError } = await supabase.rpc(
      "suggestion_candidate_users",
      { p_min_bets: MIN_TOTAL_SETTLED_BETS }
    );
    if (userError) throw new Error(`candidate users: ${userError.message}`);

    const users = ((userRows ?? []) as CandidateUser[]).slice(0, MAX_USERS);
    summary.users = users.length;
    if ((userRows ?? []).length > MAX_USERS) {
      console.warn(
        `${JOB}: ${(userRows ?? []).length} kandidater, kör bara de ${MAX_USERS} första`
      );
    }
    if (!users.length) {
      return json({ ...summary, skipped: "no_users", ms: Date.now() - startedAt });
    }

    if (!dryRun) logId = await startSyncLog(supabase, JOB, "mixed");

    // Byggs en gång och delas av alla scope: vilka liganamn som är
    // tvetydiga beror på dagens matcher, inte på användaren.
    thresholds.ambiguousLeagueNames = ambiguousLeagueNames(fixtures);
    summary.ambiguousLeagues = thresholds.ambiguousLeagueNames.size;

    const teamHistory = await loadTeamHistory(
      supabase,
      users.map((u) => u.user_id)
    );

    const rows: ReturnType<typeof toSuggestionRow>[] = [];
    const perUser = new Map<string, number>();

    /** Ett scope = ett konto eller en spelbok, med sin färdiglästa profil. */
    type Scope = {
      userId: string;
      dominantSport: string;
      sheetId: string | null;
      limit: number;
      segments: ProfileSegment[];
    };
    const scopes: Scope[] = [];

    async function loadScope(
      userId: string,
      dominantSport: string,
      sheetId: string | null,
      limit: number
    ) {
      const { data, error } = await supabase.rpc("get_user_betting_profile", {
        p_user_id: userId,
        p_sheet_id: sheetId,
      });
      if (error) {
        console.warn(
          `${JOB}: profil för ${userId}/${sheetId ?? "konto"} misslyckades — ${error.message}`
        );
        return;
      }
      scopes.push({
        userId,
        dominantSport,
        sheetId,
        limit,
        segments: (data ?? []) as ProfileSegment[],
      });
    }

    // Kontots förslag — de som visas på Hem.
    for (const user of users) {
      await loadScope(
        user.user_id,
        user.dominant_sport,
        null,
        MAX_SUGGESTIONS_PER_USER
      );
    }

    // Per spelbok. Profilen räknas bara på den spelbokens egna spel, annars
    // hade alla spelböcker visat samma matcher.
    const { data: sheetRows, error: sheetError } = await supabase.rpc(
      "suggestion_candidate_sheets",
      { p_min_bets: MIN_SHEET_SETTLED_BETS }
    );
    if (sheetError) {
      // Migrationen för per-spelbok kanske inte är körd — kontots förslag
      // ska fungera ändå.
      console.warn(`${JOB}: kandidatspelböcker hoppas över — ${sheetError.message}`);
    }

    const sheets = ((sheetRows ?? []) as CandidateSheet[]).slice(0, MAX_SHEETS);
    summary.sheets = sheets.length;

    for (const sheet of sheets) {
      await loadScope(
        sheet.user_id,
        sheet.dominant_sport,
        sheet.sheet_id,
        MAX_SUGGESTIONS_PER_SHEET
      );
    }

    // Signaler beräknas BARA för ligor där någon har ett etablerat segment.
    // Att räkna på alla dagens matcher hade kostat tusentals API-anrop för
    // data ingen tittar på.
    const relevantLeagueIds = new Set<number>();
    const relevantLeagueNames = new Set<string>();
    // Följer samma tröskel som poängsättningen. Utan det hade en dry-run med
    // minSegment=1 sänkt poängspärren men inte det här filtret, och
    // signalsteget hade tyst räknat på noll matcher.
    const effectiveMinSegment = thresholds.minSegmentBets ?? null;
    for (const scope of scopes) {
      for (const segment of scope.segments) {
        const counts =
          segment.established ||
          (effectiveMinSegment !== null && segment.bets >= effectiveMinSegment);
        if (!counts) continue;
        if (segment.league_id != null) {
          relevantLeagueIds.add(Number(segment.league_id));
        } else {
          relevantLeagueNames.add(segment.league_name.trim().toLowerCase());
        }
      }
    }

    // Ligorna admin valt att synka räknas också, även utan användarhistorik.
    //
    // Avsteg från promptboarden ("beräkna aldrig signaler för övriga ligor"),
    // beslutat medvetet: utan det är /admin/regler tomt tills någon råkar
    // bygga fem rättade spel i en liga, och en förhandsgranskning som aldrig
    // visar något går inte att lita på. Mängden är operatörsstyrd och liten,
    // så kostnadsdisciplinen som regeln skyddade står kvar.
    const { data: syncedLeagues } = await supabase
      .from("active_leagues")
      .select("league_id")
      .eq("active", true);
    const syncedLeagueIds = new Set(
      ((syncedLeagues ?? []) as { league_id: number }[]).map((l) =>
        Number(l.league_id)
      )
    );
    summary.syncedLeagues = syncedLeagueIds.size;

    const signalFixtures = fixtures.filter((f) => {
      if (f.league_id != null) {
        if (relevantLeagueIds.has(Number(f.league_id))) return true;
        if (syncedLeagueIds.has(Number(f.league_id))) return true;
      }
      const name = (f.league_name || "").trim().toLowerCase();
      // Tvetydiga liganamn matchar ingen profil ändå — beräkna inte på dem.
      if (!name || thresholds.ambiguousLeagueNames?.has(name)) return false;
      return relevantLeagueNames.has(name);
    });

    const { signals, summary: signalSummary } = await computeFixtureSignals(
      supabase,
      signalFixtures,
      ymd,
      dryRun
    );
    summary.signals = signalSummary;

    const { data: ruleRows, error: rulesError } = await supabase
      .from("signal_rules")
      .select("id, name, bet_type, sport, conditions, weight, label_template, min_matches_played")
      .eq("active", true)
      .is("user_id", null);
    if (rulesError) {
      // Signalmotorns migration kanske inte är körd. Profilmatchningen
      // fungerar ändå — signaler förstärker, de gate:ar inte.
      console.warn(`${JOB}: regler hoppas över — ${rulesError.message}`);
    }
    const rules = (ruleRows ?? []) as SignalRuleRow[];
    summary.activeRules = rules.length;

    for (const scope of scopes) {
      // En regel för over_2_5 är bara relevant för någon som faktiskt spelar
      // över/under. Familjerna kommer från bet_type_family() i profilen.
      // Samma tröskel som ligafiltret och poängsättningen. Med enbart
      // `established` hade en dry-run med minSegment=1 gett tom mängd, och
      // då kan ingen regel någonsin appliceras — signalerna beräknas men
      // används inte, helt tyst.
      const families = new Set(
        scope.segments
          .filter(
            (s) =>
              s.established ||
              (effectiveMinSegment !== null && s.bets >= effectiveMinSegment)
          )
          .map((s) => s.bet_type)
      );

      const hits = suggestionsForUser(
        fixtures,
        {
          userId: scope.userId,
          dominantSport: scope.dominantSport,
          segments: scope.segments,
          teamIds: teamHistory.get(scope.userId) ?? new Set<number>(),
        },
        scope.limit,
        thresholds,
        (hit) => {
          const signal = signals.get(hit.fixture.fixture_id);
          if (!signal) return;
          const fixtureSport = sportSlugOf(hit.fixture.sport);
          for (const rule of rules) {
            if (rule.sport !== fixtureSport) continue;
            const family = BET_TYPE_FAMILY[rule.bet_type];
            if (!family || !families.has(family)) continue;
            const result = evaluateRule(
              rule,
              signal.metrics,
              signal.homeMatchesPlayed,
              signal.awayMatchesPlayed
            );
            if (!result.hit || !result.label) continue;
            // Taket på 100 står kvar — signaler förstärker inom samma skala.
            hit.matchScore = Math.min(100, hit.matchScore + rule.weight);
            hit.reasons.push({
              type: "signal",
              label: result.label,
              weight: rule.weight,
              rule_id: rule.id,
            });
          }
          hit.reasons.sort((a, b) => b.weight - a.weight);
        }
      );

      if (!hits.length) continue;
      if (scope.sheetId === null) perUser.set(scope.userId, hits.length);
      for (const hit of hits) {
        rows.push(toSuggestionRow(scope.userId, ymd, hit, scope.sheetId));
      }
    }

    summary.suggestions = rows.length;

    if (rows.length && !dryRun) {
      const { error: upsertError } = await supabase
        .from("daily_suggestions")
        .upsert(rows, {
          onConflict: "user_id,sheet_id,suggestion_date,fixture_id",
        });
      if (upsertError) throw new Error(`upsert: ${upsertError.message}`);
    }

    // Pushen är det enda steget som inte är idempotent. Kör funktionen om
    // samma dag skrivs raderna på nytt utan att någon får en andra notis.
    let pushed = false;
    if (rows.length && !dryRun && !(await alreadyPushed(supabase, ymd))) {
      await notifySite({
        kind: "suggestions",
        users: [...perUser.entries()].map(([userId, count]) => ({
          userId,
          count,
        })),
      });
      pushed = true;
      summary.pushed = perUser.size;
    }

    if (logId) {
      await finishSyncLog(supabase, logId, {
        ok: true,
        requests: 0,
        upserted: rows.length,
        meta: { ymd, pushed, users: users.length, fixtures: fixtures.length },
      });
    }

    // Dry-run ska gå att läsa, inte bara räkna. Skälen är det som faktiskt
    // hamnar på korten, så de är det man vill granska.
    const preview = dryRun
      ? rows.slice(0, 10).map((row) => ({
          scope: row.sheet_id ? `spelbok ${row.sheet_id.slice(0, 8)}` : "konto",
          match: `${row.home_team} – ${row.away_team}`,
          liga: row.league_name,
          poang: row.match_score,
          spelform: row.suggested_bet_type,
          skal: (row.reasons as { label: string }[]).map((r) => r.label),
        }))
      : undefined;

    return json({
      ...summary,
      ...(preview ? { preview } : {}),
      ms: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JOB, message);
    if (logId) {
      await finishSyncLog(supabase, logId, {
        ok: false,
        upserted: summary.suggestions,
        error: message,
      });
    }
    return json({ ok: false, error: message, ...summary }, 500);
  }
}

Deno.serve(handleGenerateDailySuggestions);
