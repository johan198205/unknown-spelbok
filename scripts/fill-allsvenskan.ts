import { chunk, footballClientFromEnv, type ApiFixtureItem } from "../src/lib/apisports";
import { mapFixtureRow } from "../src/lib/map-fixture";
import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const api = footballClientFromEnv({
    get: (key) => process.env[key],
  });
  const items = await api.get<ApiFixtureItem>("/fixtures", {
    league: 113,
    season: 2026,
    timezone: "Europe/Stockholm",
  });
  const now = new Date().toISOString();
  const rows = items.map((item) => mapFixtureRow(item, "football", now));
  const admin = createAdminClient();
  let upserted = 0;
  for (const group of chunk(rows, 150)) {
    const slim = group.map(
      ({ raw: _raw, elapsed: _elapsed, ...rest }) => rest
    );
    const { error } = await admin.from("fixtures").upsert(slim, {
      onConflict: "fixture_id",
    });
    if (error) throw new Error(error.message);
    upserted += group.length;
  }
  const on22 = rows
    .filter((row) => row.kickoff.startsWith("2026-08-22"))
    .map((row) => `${row.home_name} - ${row.away_name}`);
  console.log(JSON.stringify({ fetched: items.length, upserted, on22 }));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
