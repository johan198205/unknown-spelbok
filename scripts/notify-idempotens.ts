/**
 * Idempotenstest för notisjobben.
 *
 * Kör varje jobb TVÅ gånger på samma data och kontrollerar att andra
 * körningen skapar noll rader och att radantalet i notifications är
 * oförändrat. Faller något av det är dedupe_key trasig — då dubbleras
 * notiser varje gång ett cron-jobb körs om.
 *
 * Jobben skriver på riktigt. Kör det mot staging, inte mot skarp databas
 * — den första körningen skapar de notiser den hittar underlag för.
 *
 * Kör:
 *   npx tsx scripts/notify-idempotens.ts
 *   npx tsx scripts/notify-idempotens.ts --only kickoff
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const only = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 ? process.argv[i + 1] : null;
})();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Saknar NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function totalRows() {
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

type Job = { name: string; run: () => Promise<number> };

async function main() {
  // Importeras först här: modulen läser env vid anrop, inte vid import.
  const events = await import("../src/lib/notify-events");

  /*
    Målnotisen tar sina argument utifrån (poll-live skickar dem). Testet
    använder en påhittad men stabil ställning på en fixture som faktiskt
    har öppna spel — finns ingen sådan skapas noll rader båda gångerna,
    vilket också är ett godkänt resultat.
  */
  const { data: openBet } = await admin
    .from("bets")
    .select("fixture_id, fixtures:fixture_id(home_name, away_name)")
    .eq("result", "open")
    .not("fixture_id", "is", null)
    .limit(1)
    .maybeSingle();

  const fixture = openBet
    ? (Array.isArray(openBet.fixtures) ? openBet.fixtures[0] : openBet.fixtures)
    : null;

  const jobs: Job[] = [
    {
      name: "kickoff",
      run: () => events.recordKickoffNotifications(),
    },
    {
      name: "competition",
      run: () => events.recordCompetitionNotifications(),
    },
    {
      name: "goal",
      run: () =>
        openBet?.fixture_id
          ? events.recordGoalNotifications({
              fixtureId: openBet.fixture_id,
              homeName: fixture?.home_name ?? "Hemma",
              awayName: fixture?.away_name ?? "Borta",
              homeScore: 1,
              awayScore: 0,
              elapsed: 23,
            })
          : Promise.resolve(0),
    },
  ];

  let failures = 0;

  for (const job of jobs) {
    if (only && job.name !== only) continue;

    const before = await totalRows();
    const first = await job.run();
    const between = await totalRows();
    const second = await job.run();
    const after = await totalRows();

    const ok = second === 0 && after === between;
    if (!ok) failures += 1;

    console.log(
      `${ok ? "OK  " : "FEL "} ${job.name.padEnd(12)} ` +
        `körning 1: ${first} nya (${before} → ${between}) · ` +
        `körning 2: ${second} nya (${between} → ${after})`
    );
    if (!ok) {
      console.log(
        `     Andra körningen skapade rader. Kontrollera dedupe_key för ${job.name} ` +
          "och det unika indexet notifications_dedupe_uidx."
      );
    }
  }

  console.log(
    failures
      ? `\n${failures} jobb är inte idempotenta.`
      : "\nAlla testade jobb är idempotenta."
  );
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
