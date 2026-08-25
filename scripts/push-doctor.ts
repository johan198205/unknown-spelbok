/**
 * Diagnos för web push. Går igenom kedjan i den ordning den brister:
 *
 *   1. VAPID  — finns nycklarna, och hör publik och privat ihop?
 *   2. Enheter — finns det prenumerationer alls, och hur gamla är de?
 *   3. Utlösare — har Edge Functions reserverat händelser (sent_notifications)?
 *   4. Cron    — kör poll-live/settle-results över huvud taget (sync_log)?
 *
 * Läser .env.local. Hemligheter skrivs aldrig ut — bara längd och om de
 * är satta. Publika VAPID-nyckeln visas i sin helhet: den ligger ändå i
 * klientbundlen, och det är den du jämför med Vercel och med enhetens
 * faktiska prenumeration.
 *
 * Kör:
 *   npx tsx scripts/push-doctor.ts                 # bara läsa, skickar inget
 *   npx tsx scripts/push-doctor.ts --send din@mail # testpush till DINA enheter
 */

import { createECDH } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { sendNotification, setVapidDetails, WebPushError } from "web-push";

config({ path: ".env.local" });

const sendTo = (() => {
  const i = process.argv.indexOf("--send");
  return i >= 0 ? process.argv[i + 1] : null;
})();

function line(label: string, value: string) {
  console.log(`  ${label.padEnd(32)} ${value}`);
}

function secretStatus(name: string) {
  const value = process.env[name];
  if (!value) return "SAKNAS";
  return `satt (${value.length} tecken)`;
}

/**
 * Publika VAPID-nyckeln är EC-punkten som hör till den privata. Går de
 * isär accepterar push-tjänsten inte signaturen och varje utskick blir
 * 403 — utan att något syns i appen.
 */
function vapidPairMatches(publicKey: string, privateKey: string) {
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privateKey, "base64url"));
    const derived = ecdh.getPublicKey();
    return derived.equals(Buffer.from(publicKey, "base64url"));
  } catch {
    return false;
  }
}

function ago(iso: string | null | undefined) {
  if (!iso) return "aldrig";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min sedan`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} tim sedan`;
  return `${Math.round(h / 24)} dygn sedan`;
}

function hostOf(endpoint: string) {
  try {
    return new URL(endpoint).host;
  } catch {
    return "okänd";
  }
}

async function main() {
  // ---------------------------------------------------------------
  // 1. VAPID
  // ---------------------------------------------------------------
  console.log("\n1. VAPID-nycklar (lokal .env.local)");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";

  line("NEXT_PUBLIC_VAPID_PUBLIC_KEY", publicKey || "SAKNAS");
  line("VAPID_PRIVATE_KEY", secretStatus("VAPID_PRIVATE_KEY"));
  line("VAPID_SUBJECT", process.env.VAPID_SUBJECT || "(default mailto:admin@spelbok.se)");
  line("INTERNAL_NOTIFY_SECRET", secretStatus("INTERNAL_NOTIFY_SECRET"));
  line("SUPABASE_SERVICE_ROLE_KEY", secretStatus("SUPABASE_SERVICE_ROLE_KEY"));

  if (publicKey && privateKey) {
    const ok = vapidPairMatches(publicKey, privateKey);
    line("Nyckelparet hör ihop", ok ? "JA" : "NEJ — allt blir 403");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("\nSaknar Supabase-nycklar i .env.local — kan inte läsa databasen.");
    return;
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // ---------------------------------------------------------------
  // 2. Prenumerationer
  // ---------------------------------------------------------------
  console.log("\n2. Prenumererade enheter (push_subscriptions)");
  const { data: subs, error: subErr } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, created_at, user_agent")
    .order("created_at", { ascending: false });

  if (subErr) {
    console.log(`  Kunde inte läsa tabellen: ${subErr.message}`);
    return;
  }

  const rows = subs ?? [];
  line("Antal rader", String(rows.length));
  if (rows.length) {
    line("Nyaste", ago(rows[0].created_at));
    line("Äldsta", ago(rows[rows.length - 1].created_at));
    const byHost = new Map<string, number>();
    for (const row of rows) {
      const h = hostOf(row.endpoint);
      byHost.set(h, (byHost.get(h) ?? 0) + 1);
    }
    for (const [host, count] of byHost) line(`  ${host}`, `${count} enheter`);
  } else {
    console.log("  Ingen enhet är prenumererad — inga notiser kan skickas.");
  }

  // Koppla ihop rader med e-post, så du ser om DIN enhet finns kvar.
  const { data: userPage } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(
    (userPage?.users ?? []).map((u) => [u.id, u.email ?? u.id])
  );
  const byUser = new Map<string, number>();
  for (const row of rows) {
    const email = emailById.get(row.user_id) ?? row.user_id;
    byUser.set(email, (byUser.get(email) ?? 0) + 1);
  }
  for (const [email, count] of byUser) line(`  ${email}`, `${count} enheter`);

  // ---------------------------------------------------------------
  // 3. Utlösta händelser
  // ---------------------------------------------------------------
  console.log("\n3. Utlösta händelser (sent_notifications)");
  const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();

  const { count: last24h } = await admin
    .from("sent_notifications")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since24h);
  const { count: last7d } = await admin
    .from("sent_notifications")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since7d);
  const { data: latest } = await admin
    .from("sent_notifications")
    .select("event_key, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  line("Senaste dygnet", String(last24h ?? 0));
  line("Senaste veckan", String(last7d ?? 0));
  line("Senaste händelsen", latest?.length ? ago(latest[0].created_at) : "aldrig");
  for (const row of latest ?? []) {
    line(`  ${row.event_key.slice(0, 40)}`, ago(row.created_at));
  }

  // ---------------------------------------------------------------
  // 3b. Fanns det något att notifiera om?
  //
  // Tomt sent_notifications betyder två helt olika saker: antingen har
  // ingenting hänt (inga rättade spel, inga bevakade matcher), eller så
  // når Edge Functions aldrig fram till /api/internal/notify. Rättade
  // spel utan motsvarande "settled:"-nyckel skiljer fallen åt.
  // ---------------------------------------------------------------
  console.log("\n3b. Underlag för notiser (bets)");
  const { data: settledBets } = await admin
    .from("bets")
    .select("id, match, result, settled_at, settled_by")
    .gte("settled_at", since7d)
    .order("settled_at", { ascending: false })
    .limit(10);

  line("Rättade senaste veckan", String(settledBets?.length ?? 0));
  for (const bet of settledBets ?? []) {
    const { data: hit } = await admin
      .from("sent_notifications")
      .select("event_key")
      .eq("event_key", `settled:${bet.id}`)
      .maybeSingle();
    line(
      `  ${bet.match.slice(0, 28)}`,
      `${bet.result} · by=${bet.settled_by} · ${ago(bet.settled_at)} · notis=${hit ? "ja" : "NEJ"}`
    );
  }

  const { count: openCount } = await admin
    .from("bets")
    .select("*", { count: "exact", head: true })
    .eq("result", "open");
  const { count: openNotify } = await admin
    .from("bets")
    .select("*", { count: "exact", head: true })
    .eq("result", "open")
    .eq("notify_goals", true);
  line("Öppna spel just nu", String(openCount ?? 0));
  line("  varav med målbevakning", String(openNotify ?? 0));

  // ---------------------------------------------------------------
  // 4. Cron
  // ---------------------------------------------------------------
  console.log("\n4. Cron-jobb (sync_log)");
  for (const job of ["poll-live", "settle-results", "sync-fixtures"]) {
    const { data } = await admin
      .from("sync_log")
      .select("started_at, ok, error, requests, settled")
      .eq("job", job)
      .order("started_at", { ascending: false })
      .limit(1);
    const row = data?.[0];
    line(
      job,
      row
        ? `${ago(row.started_at)} · ok=${row.ok} · req=${row.requests} · settled=${row.settled}${row.error ? ` · fel: ${row.error.slice(0, 80)}` : ""}`
        : "ingen körning loggad"
    );
  }

  // ---------------------------------------------------------------
  // 5. Skarpt testutskick
  // ---------------------------------------------------------------
  if (!sendTo) {
    console.log(
      "\nInget skickat. Kör med --send din@mail för att testa skarpt mot dina enheter.\n"
    );
    return;
  }

  console.log(`\n5. Testutskick till ${sendTo}`);
  if (!publicKey || !privateKey) {
    console.log("  VAPID-nycklar saknas — kan inte skicka.");
    return;
  }

  const userId = [...emailById.entries()].find(
    ([, email]) => email.toLowerCase() === sendTo.toLowerCase()
  )?.[0];
  if (!userId) {
    console.log("  Hittade ingen användare med den e-posten.");
    return;
  }

  const targets = rows.filter((row) => row.user_id === userId);
  if (!targets.length) {
    console.log("  Användaren har inga prenumererade enheter.");
    return;
  }

  setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@spelbok.se",
    publicKey,
    privateKey
  );

  const { data: keyRows } = await admin
    .from("push_subscriptions")
    .select("endpoint, keys_p256dh, keys_auth")
    .eq("user_id", userId);

  const payload = JSON.stringify({
    title: "Testnotis",
    body: "Push-diagnos från push-doctor",
    url: "/spelbok",
  });

  for (const row of keyRows ?? []) {
    try {
      const res = await sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.keys_p256dh, auth: row.keys_auth },
        },
        payload
      );
      line(hostOf(row.endpoint), `OK (${res.statusCode})`);
    } catch (err) {
      const status = err instanceof WebPushError ? err.statusCode : "?";
      const detail =
        err instanceof WebPushError
          ? String(err.body).slice(0, 120)
          : err instanceof Error
            ? err.message
            : String(err);
      const hint =
        status === 403
          ? " — VAPID-nyckeln matchar inte prenumerationen"
          : status === 410 || status === 404
            ? " — enheten har avregistrerat sig"
            : "";
      line(hostOf(row.endpoint), `FEL ${status}${hint} · ${detail}`);
    }
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
