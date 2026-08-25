/**
 * Testar auth-handskakningen mellan Supabase Edge Functions och
 * /api/internal/notify i produktion.
 *
 * Skickar en tom betIds-lista: rutten svarar {ok, skipped} utan att någon
 * notis går ut. Det enda som testas är om nyckeln släpps igenom.
 *
 * Kör: npx tsx scripts/notify-auth-check.ts
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const site = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  ""
).replace(/\/$/, "");

async function probe(label: string, key: string | undefined) {
  if (!key) {
    console.log(`  ${label.padEnd(28)} nyckeln saknas lokalt — kan inte testa`);
    return;
  }
  try {
    const res = await fetch(`${site}/api/internal/notify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ betIds: [] }),
    });
    const text = (await res.text()).slice(0, 120);
    console.log(`  ${label.padEnd(28)} ${res.status} ${text}`);
  } catch (err) {
    console.log(`  ${label.padEnd(28)} nätverksfel: ${String(err).slice(0, 100)}`);
  }
}

async function main() {
  console.log(`\nSajt: ${site || "SAKNAS — sätt NEXT_PUBLIC_SITE_URL i .env.local"}`);
  if (!site) return;

  await probe("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  await probe("INTERNAL_NOTIFY_SECRET", process.env.INTERNAL_NOTIFY_SECRET);
  await probe("fel nyckel (kontroll)", "detta-ska-ge-403");
  console.log("");
}

main();
