/**
 * Engångskörning: ger matcher som redan ligger i fixtures svensk stavning
 * (Brynas → Brynäs). Nya matcher får den när de hämtas, se
 * src/lib/swedish-names.ts.
 *
 *   npx tsx scripts/swedish-team-names.ts          visar vad som ändras
 *   npx tsx scripts/swedish-team-names.ts --write  skriver ändringarna
 */
import { isSwedishFixture, swedishTeamName } from "../src/lib/swedish-names";
import { createAdminClient } from "../src/lib/supabase/admin";

const PAGE = 1000;

async function main() {
  const write = process.argv.includes("--write");
  const admin = createAdminClient();

  const changes: Array<{ fixture_id: number; home_name: string; away_name: string }> = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("fixtures")
      .select("fixture_id, home_name, away_name, raw")
      .or("raw->league->>country.eq.Sweden,raw->country->>name.eq.Sweden")
      .order("fixture_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (!isSwedishFixture(row.raw)) continue;
      const home = swedishTeamName(row.home_name ?? "");
      const away = swedishTeamName(row.away_name ?? "");
      if (home !== row.home_name || away !== row.away_name) {
        changes.push({ fixture_id: row.fixture_id, home_name: home, away_name: away });
      }
    }
    if (!data || data.length < PAGE) break;
  }

  const names = new Set(changes.flatMap((c) => [c.home_name, c.away_name]));
  console.log(`${changes.length} matcher får nya namn`);
  console.log([...names].sort().join(", "));

  if (!write) {
    console.log("Inget skrivet. Kör med --write för att uppdatera.");
    return;
  }

  let done = 0;
  for (const c of changes) {
    const { error } = await admin
      .from("fixtures")
      .update({ home_name: c.home_name, away_name: c.away_name })
      .eq("fixture_id", c.fixture_id);
    if (error) throw new Error(`${c.fixture_id}: ${error.message}`);
    done++;
  }
  console.log(`${done} matcher uppdaterade`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
