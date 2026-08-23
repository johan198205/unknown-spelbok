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
    .in("user_id", userIds);
  if (error) throw error;
  return (data ?? []) as PushSubscriptionRow[];
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
};

function settleBody(bet: SettledBet) {
  const result = bet.result as BetResult;
  const label = resultLabel(result);
  const netto = Number(bet.payout ?? 0) - Number(bet.stake);
  if (result === "void") {
    return `${bet.pick} · insatsen återbetalas`;
  }
  return `${bet.pick} · ${formatMoney(netto)}`;
}

export async function notifySettledBets(betIds: string[]) {
  if (!betIds.length) return;
  const admin = createAdminClient();
  const { data: bets, error } = await admin
    .from("bets")
    .select("id, user_id, match, pick, result, stake, payout")
    .in("id", betIds);
  if (error) {
    console.error("push vid rättning: kunde inte läsa spel", error.message);
    return;
  }
  if (!bets?.length) {
    console.warn(`push vid rättning: hittade inga spel för ${betIds.length} id`);
    return;
  }

  const userIds = [...new Set((bets as SettledBet[]).map((b) => b.user_id))];
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, notify_settle")
    .in("id", userIds);

  const allowed = new Set<string>(
    profileError
      ? userIds
      : ((profiles ?? []) as { id: string; notify_settle?: boolean | null }[])
          .filter((p) => p.notify_settle !== false)
          .map((p) => p.id)
  );

  const byUser = new Map<string, SettledBet[]>();
  for (const bet of bets as SettledBet[]) {
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
          title: `${resultLabel(bet.result as BetResult)} · ${bet.match}`,
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

export async function notifyGoals(args: {
  fixtureId: number;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
}) {
  const admin = createAdminClient();
  const { data: bets, error } = await admin
    .from("bets")
    .select("user_id")
    .eq("fixture_id", args.fixtureId)
    .eq("notify_goals", true)
    .eq("result", "open");
  if (error || !bets?.length) return;

  const userIds = [
    ...new Set(
      (bets as { user_id: string }[]).map((b) => b.user_id).filter(Boolean)
    ),
  ];
  if (!userIds.length) return;

  const result = await sendPushToUsers(userIds, {
    title: "Mål",
    body: `${args.homeName} ${args.homeScore}–${args.awayScore} ${args.awayName}`,
    url: "/spelbok",
  });
  console.log(
    `push vid mål ${args.fixtureId}: ${result.sent} skickade till ${userIds.length} användare`
  );
  return result;
}
