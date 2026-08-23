import { sendNotification, setVapidDetails, WebPushError } from "web-push";
import { chunkArray } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney, resultLabel } from "@/lib/utils";
import type { BetResult } from "@/lib/types";
import type { PushSubscriptionRow } from "@/lib/types";

const BATCH_SIZE = 100;

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function vapidReady() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@spelbok.se";
  if (!publicKey || !privateKey) return null;
  setVapidDetails(subject, publicKey, privateKey);
  return true;
}

async function loadSubscriptionsForUsers(userIds: string[]) {
  if (!userIds.length) return [] as PushSubscriptionRow[];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });
  if (error) throw error;

  // En endpoint = en enhet. Ligger samma endpoint på flera rader (äldre
  // data, innan unique-constrainten) får enheten annars en notis per rad.
  const byEndpoint = new Map<string, PushSubscriptionRow>();
  for (const row of (data ?? []) as PushSubscriptionRow[]) {
    if (!byEndpoint.has(row.endpoint)) byEndpoint.set(row.endpoint, row);
  }
  return [...byEndpoint.values()];
}

export type NotificationEvent = {
  eventKey: string;
  fixtureId?: number | null;
};

/**
 * Reserverar händelsenycklar i sent_notifications INNAN pushen skickas.
 *
 * Returnerar bara de nycklar som faktiskt skrevs. En nyckel som redan
 * fanns hoppas över — det är hela poängen: poll-live kan köras parallellt
 * eller returnera samma mål i flera polls utan att notisen dubbleras.
 *
 * ON CONFLICT DO NOTHING ... RETURNING gör anspråket atomiskt: den andra
 * körningen blockeras tills den första committat och får sedan noll rader.
 */
export async function claimNotifications(
  events: NotificationEvent[]
): Promise<Set<string>> {
  const unique = new Map<string, NotificationEvent>();
  for (const event of events) {
    if (event.eventKey) unique.set(event.eventKey, event);
  }
  if (!unique.size) return new Set();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sent_notifications")
    .upsert(
      [...unique.values()].map((event) => ({
        event_key: event.eventKey,
        fixture_id: event.fixtureId ?? null,
      })),
      { onConflict: "event_key", ignoreDuplicates: true }
    )
    .select("event_key");

  if (error) {
    // Krock ger inget fel (ON CONFLICT DO NOTHING) — kommer vi hit är det
    // infrastruktur: tabellen saknas eller databasen svarar inte. Släpp
    // igenom notisen. En dubblett är bättre än total tystnad.
    console.error(
      "push: kunde inte reservera händelsenycklar, skickar ändå",
      error.message
    );
    return new Set(unique.keys());
  }

  const claimed = new Set(
    ((data ?? []) as { event_key: string }[]).map((row) => row.event_key)
  );
  const skipped = [...unique.keys()].filter((key) => !claimed.has(key));
  if (skipped.length) {
    console.log(
      `push: hoppar över ${skipped.length} dubblett — ${skipped.join(", ")}`
    );
  }
  return claimed;
}

async function claimNotification(eventKey: string, fixtureId?: number | null) {
  const claimed = await claimNotifications([{ eventKey, fixtureId }]);
  return claimed.has(eventKey);
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length || !vapidReady()) return { sent: 0, failed: 0 };

  const subscriptions = await loadSubscriptionsForUsers(unique);
  if (!subscriptions.length) return { sent: 0, failed: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/spelbok",
  });

  let sent = 0;
  let failed = 0;
  const stale: string[] = [];

  for (const batch of chunkArray(subscriptions, BATCH_SIZE)) {
    const results = await Promise.allSettled(
      batch.map((row) =>
        sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.keys_p256dh, auth: row.keys_auth },
          },
          body
        )
      )
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        sent += 1;
        return;
      }
      const err = result.reason;
      const statusCode =
        err instanceof WebPushError
          ? err.statusCode
          : typeof err === "object" &&
              err &&
              "statusCode" in err &&
              typeof (err as { statusCode: unknown }).statusCode === "number"
            ? (err as { statusCode: number }).statusCode
            : undefined;
      const host = (() => {
        try {
          return new URL(batch[index].endpoint).host;
        } catch {
          return "okänd";
        }
      })();
      if (statusCode === 404 || statusCode === 410) {
        console.warn(`push: rensar död prenumeration ${host} (${statusCode})`);
        stale.push(batch[index].endpoint);
        return;
      }
      // 403 = VAPID-nycklarna matchar inte dem prenumerationen skapades med.
      console.error(
        `push misslyckades ${host} status=${statusCode ?? "?"}`,
        err instanceof WebPushError ? String(err.body).slice(0, 200) : err
      );
      failed += 1;
    });
  }

  if (stale.length) {
    const admin = createAdminClient();
    await admin.from("push_subscriptions").delete().in("endpoint", stale);
  }

  if (failed || stale.length) {
    console.warn(
      `push: ${sent} skickade, ${failed} misslyckade, ${stale.length} rensade`
    );
  }

  return { sent, failed };
}

type SettledBet = {
  id: string;
  user_id: string;
  match: string;
  pick: string;
  result: string;
  stake: number;
  payout: number | null;
  fixture_id: number | null;
};

/** notify_settle styr både rättningsnotiser och påminnelser om orättade spel. */
async function settleNotifyAllowed(userIds: string[]) {
  if (!userIds.length) return new Set<string>();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, notify_settle")
    .in("id", userIds);

  // Kan vi inte läsa profilerna skickar vi hellre notisen än tystar den.
  if (error) return new Set(userIds);
  return new Set(
    ((data ?? []) as { id: string; notify_settle?: boolean | null }[])
      .filter((p) => p.notify_settle !== false)
      .map((p) => p.id)
  );
}

function settleTitle(result: BetResult) {
  if (result === "win" || result === "halfwin") return "Spel rättat ✅";
  if (result === "void") return "Spel rättat ↩️";
  return "Spel rättat ❌";
}

function settleBody(bet: SettledBet) {
  const result = bet.result as BetResult;
  const netto = Number(bet.payout ?? 0) - Number(bet.stake);
  if (result === "void") {
    return `${bet.match} · ${bet.pick} · insatsen återbetalas`;
  }
  return `${bet.match} · ${bet.pick} · ${formatMoney(netto)}`;
}

export async function notifySettledBets(betIds: string[]) {
  if (!betIds.length) return;
  const admin = createAdminClient();
  const { data: bets, error } = await admin
    .from("bets")
    .select("id, user_id, match, pick, result, stake, payout, fixture_id")
    .in("id", betIds);
  if (error) {
    console.error("push vid rättning: kunde inte läsa spel", error.message);
    return;
  }
  if (!bets?.length) {
    console.warn(`push vid rättning: hittade inga spel för ${betIds.length} id`);
    return;
  }

  const claimed = await claimNotifications(
    (bets as SettledBet[]).map((bet) => ({
      eventKey: `settled:${bet.id}`,
      fixtureId: bet.fixture_id,
    }))
  );
  const fresh = (bets as SettledBet[]).filter((bet) =>
    claimed.has(`settled:${bet.id}`)
  );
  if (!fresh.length) return;

  const allowed = await settleNotifyAllowed([
    ...new Set(fresh.map((b) => b.user_id)),
  ]);

  const byUser = new Map<string, SettledBet[]>();
  for (const bet of fresh) {
    if (!allowed.has(bet.user_id)) continue;
    const list = byUser.get(bet.user_id) ?? [];
    list.push(bet);
    byUser.set(bet.user_id, list);
  }

  await Promise.all(
    [...byUser.entries()].map(([userId, list]) => {
      if (list.length === 1) {
        const bet = list[0];
        return sendPushToUsers([userId], {
          title: settleTitle(bet.result as BetResult),
          body: settleBody(bet),
          url: "/spelbok",
        });
      }
      return sendPushToUsers([userId], {
        title: `${list.length} spel rättade`,
        body: list
          .map((b) => `${resultLabel(b.result as BetResult)}: ${b.match}`)
          .join(" · "),
        url: "/spelbok",
      });
    })
  );
}

/**
 * Push vid dagens förslag. Anropas av Edge Functionen
 * generate-daily-suggestions via /api/internal/notify.
 *
 * Ingen ny inställning: användare utan push-prenumeration filtreras bort
 * i sendPushToUsers, och det är hela villkoret enligt promptboarden.
 * Texten är avsiktligt neutral — "matchar din spelstil", aldrig ett tips.
 */
export async function notifyDailySuggestions(
  entries: { userId: string; count: number }[]
) {
  const valid = entries.filter((e) => e.userId && e.count > 0);
  if (!valid.length) return { sent: 0, failed: 0 };

  // Gruppera på antal så att N användare blir högst en handfull batchar
  // i stället för ett sendPushToUsers-anrop per person.
  const byCount = new Map<number, string[]>();
  for (const entry of valid) {
    const list = byCount.get(entry.count) ?? [];
    list.push(entry.userId);
    byCount.set(entry.count, list);
  }

  let sent = 0;
  let failed = 0;
  for (const [count, userIds] of byCount) {
    const result = await sendPushToUsers(userIds, {
      title: "Dagens matcher för dig",
      body:
        count === 1
          ? "1 match matchar din spelstil idag"
          : `${count} matcher matchar din spelstil idag`,
      url: "/hem",
    });
    sent += result.sent;
    failed += result.failed;
  }

  console.log(
    `push vid dagens förslag: ${sent} skickade till ${valid.length} användare`
  );
  return { sent, failed };
}

async function watchersFor(fixtureIds: number[]) {
  if (!fixtureIds.length) return new Map<number, string[]>();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bets")
    .select("user_id, fixture_id")
    .in("fixture_id", fixtureIds)
    .eq("notify_goals", true)
    .eq("result", "open");

  const byFixture = new Map<number, string[]>();
  if (error || !data?.length) return byFixture;

  for (const row of data as { user_id: string; fixture_id: number }[]) {
    if (!row.user_id) continue;
    const list = byFixture.get(row.fixture_id) ?? [];
    if (!list.includes(row.user_id)) list.push(row.user_id);
    byFixture.set(row.fixture_id, list);
  }
  return byFixture;
}

export async function notifyGoals(args: {
  fixtureId: number;
  teamId?: number | null;
  elapsed?: number | null;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
}) {
  const eventKey = `goal:${args.fixtureId}:${args.teamId ?? "?"}:${
    args.elapsed ?? "?"
  }:${args.homeScore}-${args.awayScore}`;
  if (!(await claimNotification(eventKey, args.fixtureId))) return;

  const userIds = (await watchersFor([args.fixtureId])).get(args.fixtureId) ?? [];
  if (!userIds.length) return;

  const result = await sendPushToUsers(userIds, {
    title: "Mål ⚽",
    body: `${args.homeName} ${args.homeScore}–${args.awayScore} ${args.awayName}`,
    url: "/spelbok",
  });
  console.log(
    `push vid mål ${args.fixtureId}: ${result.sent} skickade till ${userIds.length} användare`
  );
  return result;
}

export type FinishedMatch = {
  fixtureId: number;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
};

/**
 * Slutsignal. Måste skickas INNAN spelen rättas — målgruppen är samma som
 * för målnotiser (bets med notify_goals och result='open'), och rättningen
 * tar bort dem ur den.
 */
export async function notifyFulltime(matches: FinishedMatch[]) {
  if (!matches.length) return { sent: 0 };

  const claimed = await claimNotifications(
    matches.map((m) => ({
      eventKey: `fulltime:${m.fixtureId}`,
      fixtureId: m.fixtureId,
    }))
  );
  const fresh = matches.filter((m) => claimed.has(`fulltime:${m.fixtureId}`));
  if (!fresh.length) return { sent: 0 };

  const watchers = await watchersFor(fresh.map((m) => m.fixtureId));
  let sent = 0;

  for (const match of fresh) {
    const userIds = watchers.get(match.fixtureId) ?? [];
    if (!userIds.length) continue;
    const result = await sendPushToUsers(userIds, {
      title: "Slutsignal 🏁",
      body: `${match.homeName} ${match.homeScore}–${match.awayScore} ${match.awayName} · Slut`,
      url: "/spelbok",
    });
    sent += result.sent;
    console.log(
      `push vid slutsignal ${match.fixtureId}: ${result.sent} skickade till ${userIds.length} användare`
    );
  }

  return { sent };
}

/**
 * Påminnelse för spel som inte gick att auto-rätta (t.ex. "Målskytt när som
 * helst"). Anropas EFTER rättningen — allt som fortfarande står som öppet på
 * en avslutad match kräver handpåläggning.
 */
export async function notifySettleReminders(
  matches: { fixtureId: number; homeName: string; awayName: string }[]
) {
  if (!matches.length) return { sent: 0 };

  const admin = createAdminClient();
  const fixtureIds = matches.map((m) => m.fixtureId);
  const { data, error } = await admin
    .from("bets")
    .select("id, user_id, fixture_id")
    .in("fixture_id", fixtureIds)
    .eq("result", "open");

  if (error) {
    console.error("push vid påminnelse: kunde inte läsa spel", error.message);
    return { sent: 0 };
  }
  const openBets = (data ?? []) as {
    id: string;
    user_id: string;
    fixture_id: number;
  }[];
  if (!openBets.length) return { sent: 0 };

  const allowed = await settleNotifyAllowed([
    ...new Set(openBets.map((b) => b.user_id)),
  ]);
  const targets = openBets.filter((bet) => allowed.has(bet.user_id));
  if (!targets.length) return { sent: 0 };

  const claimed = await claimNotifications(
    targets.map((bet) => ({
      eventKey: `settle-reminder:${bet.id}`,
      fixtureId: bet.fixture_id,
    }))
  );

  // En notis per användare och match, inte per spel: två orättade spel på
  // samma match är fortfarande bara en sak att göra.
  const byUserAndFixture = new Map<string, number>();
  for (const bet of targets) {
    if (!claimed.has(`settle-reminder:${bet.id}`)) continue;
    const key = `${bet.user_id}|${bet.fixture_id}`;
    byUserAndFixture.set(key, (byUserAndFixture.get(key) ?? 0) + 1);
  }
  if (!byUserAndFixture.size) return { sent: 0 };

  const nameById = new Map(matches.map((m) => [m.fixtureId, m]));
  let sent = 0;

  for (const [key, count] of byUserAndFixture) {
    const [userId, fixtureRaw] = key.split("|");
    const match = nameById.get(Number(fixtureRaw));
    if (!match) continue;
    const result = await sendPushToUsers([userId], {
      title: "Dags att rätta 📝",
      body: `${match.homeName}–${match.awayName} är slut · ${count} ${
        count === 1 ? "orättat spel" : "orättade spel"
      }`,
      url: "/spelbok",
    });
    sent += result.sent;
  }

  console.log(
    `push vid påminnelse: ${sent} skickade för ${byUserAndFixture.size} match/användare-par`
  );
  return { sent };
}
