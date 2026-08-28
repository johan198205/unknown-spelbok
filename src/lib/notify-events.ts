/**
 * Jobben som skapar notiser i appen.
 *
 * Server-only: allt skrivs med service role, aldrig från klienten.
 *
 * Varje insert bär en deterministisk dedupe_key och körs med
 * ON CONFLICT (user_id, dedupe_key) DO NOTHING. Ett jobb kan därför
 * köras om hur många gånger som helst utan att radantalet ändras —
 * det är hela idempotenskontraktet, och det testas i
 * scripts/notify-idempotens.ts.
 *
 * Användarens inställningar filtreras HÄR, i jobbet. Att skapa notiser
 * som sedan göms i panelen vore både slöseri och en läckande räknare.
 */

import { chunkArray } from "@/lib/push";
import { formatPick } from "@/lib/picks";
import { rankBoard } from "@/lib/competitions";
import {
  categoryOf,
  normalizeSettings,
  NOTIFICATION_SETTINGS_COLUMNS,
  type NotificationAmountKind,
  type NotificationCategory,
  type NotificationSettings,
  type NotificationTargetType,
  type NotificationType,
} from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPercent } from "@/lib/utils";
import type { Competition, LeaderboardRow } from "@/lib/types";

const INSERT_BATCH = 500;

/** Avsparksnotisen går ut när matchen är närmare än så här. */
const KICKOFF_WINDOW_MIN = 15;

export type NotificationDraft = {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  dedupe_key: string;
  amount?: number | null;
  amount_kind?: NotificationAmountKind | null;
  target_type?: NotificationTargetType | null;
  target_id?: string | null;
  /** Fri länk som vinner över target_type. Används av popup-notiser. */
  href?: string | null;
};

/**
 * Skriver notiserna. Returnerar antalet rader som faktiskt skapades —
 * dubbletter räknas inte, och det är den siffran idempotenstestet läser.
 */
export async function insertNotifications(drafts: NotificationDraft[]) {
  if (!drafts.length) return 0;

  // Två drafts med samma nyckel i SAMMA batch: ON CONFLICT hjälper inte
  // mot en krock inom en och samma insert-sats. Dedupa i minnet först.
  const unique = new Map<string, NotificationDraft>();
  for (const draft of drafts) {
    unique.set(`${draft.user_id}|${draft.dedupe_key}`, draft);
  }

  const admin = createAdminClient();
  let created = 0;

  for (const batch of chunkArray([...unique.values()], INSERT_BATCH)) {
    const { data, error } = await admin
      .from("notifications")
      .upsert(
        batch.map((d) => ({
          user_id: d.user_id,
          type: d.type,
          title: d.title,
          body: d.body,
          dedupe_key: d.dedupe_key,
          amount: d.amount ?? null,
          amount_kind: d.amount_kind ?? null,
          target_type: d.target_type ?? null,
          target_id: d.target_id ?? null,
          href: d.href ?? null,
        })),
        { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
      )
      .select("id");

    if (error) {
      console.error("notiser: kunde inte skriva", error.message);
      continue;
    }
    created += (data ?? []).length;
  }

  return created;
}

/**
 * Inställningar per användare. Saknad rad ger defaults — en användare
 * som registrerades innan triggern fanns ska få sina notiser, inte
 * tystas.
 */
async function settingsFor(userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, NotificationSettings>();
  if (!unique.length) return map;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notification_settings")
    .select(NOTIFICATION_SETTINGS_COLUMNS)
    .in("user_id", unique);

  if (error) {
    console.error("notiser: kunde inte läsa inställningar", error.message);
  }

  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const id = row.user_id;
    if (typeof id === "string") map.set(id, normalizeSettings(row));
  }
  for (const id of unique) {
    if (!map.has(id)) map.set(id, normalizeSettings(null));
  }
  return map;
}

/** Filtrerar bort drafts vars mottagare stängt av typen i appen. */
async function allowedInApp(drafts: NotificationDraft[]) {
  if (!drafts.length) return [];
  const settings = await settingsFor(drafts.map((d) => d.user_id));
  return drafts.filter((d) => {
    const s = settings.get(d.user_id);
    if (!s) return true;
    const key = `${categoryOf(d.type)}_in_app` as keyof NotificationSettings;
    return s[key] !== false;
  });
}

/** Vilka av användarna som vill ha mejl om typen. Används av mejljobbet. */
export async function emailRecipients(
  userIds: string[],
  category: NotificationCategory
) {
  const settings = await settingsFor(userIds);
  return userIds.filter(
    (id) =>
      settings.get(id)?.[`${category}_email` as keyof NotificationSettings] !==
      false
  );
}

type BetRow = {
  id: string;
  user_id: string;
  sheet_id: string;
  pick: string;
  odds: number;
  stake: number;
  payout: number | null;
  result: string;
  match: string;
  league: string | null;
  fixtures: {
    home_name: string | null;
    away_name: string | null;
    league_name: string | null;
    kickoff: string;
  } | null;
};

/** Ett spel kan ha fixture eller bara fritext — båda ska ge läsbara namn. */
function teamsOf(bet: Pick<BetRow, "match" | "fixtures">) {
  const home = bet.fixtures?.home_name?.trim();
  const away = bet.fixtures?.away_name?.trim();
  if (home && away) return { home, away, label: `${home} – ${away}` };
  return { home: null, away: null, label: bet.match };
}

function leagueOf(bet: Pick<BetRow, "league" | "fixtures">) {
  return bet.fixtures?.league_name?.trim() || bet.league?.trim() || null;
}

const BET_FIELDS =
  "id, user_id, sheet_id, pick, odds, stake, payout, result, match, league";
const FIXTURE_FIELDS = "home_name, away_name, league_name, kickoff";

const BET_COLUMNS = `${BET_FIELDS}, fixtures:fixture_id(${FIXTURE_FIELDS})`;
/** !inner krävs för att kunna filtrera på fixtures.kickoff i avsparksjobbet. */
const BET_COLUMNS_WITH_FIXTURE = `${BET_FIELDS}, fixtures:fixture_id!inner(${FIXTURE_FIELDS})`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

// -------------------------------------------------------------
// MÅL
//
// Anropas av poll-live via /api/internal/notify när ställningen på en
// pågående match har ändrats. Ställningen ingår i nyckeln, så varje nytt
// mål ger en ny rad men samma mål aldrig två.
// -------------------------------------------------------------
export async function recordGoalNotifications(args: {
  fixtureId: number;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  elapsed?: number | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bets")
    .select(BET_COLUMNS)
    .eq("fixture_id", args.fixtureId)
    .eq("result", "open");

  if (error) {
    console.error("notiser vid mål: kunde inte läsa spel", error.message);
    return 0;
  }

  const bets = ((data ?? []) as unknown as BetRow[]).map((b) => ({
    ...b,
    fixtures: one(b.fixtures),
  }));
  if (!bets.length) return 0;

  const score = `${args.homeScore}–${args.awayScore}`;
  const minute = args.elapsed != null ? `${args.elapsed}'` : "matchen";

  const drafts: NotificationDraft[] = bets.map((bet) => ({
    user_id: bet.user_id,
    type: "goal",
    title: `Mål i ${args.homeName} – ${args.awayName}`,
    body:
      args.elapsed != null
        ? `Ställning ${score} i ${minute}. Ditt spel: ${formatPick(bet.pick)}.`
        : `Ställning ${score}. Ditt spel: ${formatPick(bet.pick)}.`,
    // Ställningen i nyckeln — nästa mål ger en ny rad, samma mål inte.
    dedupe_key: `goal:${bet.id}:${args.homeScore}-${args.awayScore}`,
    target_type: "sheet",
    target_id: bet.sheet_id,
  }));

  return insertNotifications(await allowedInApp(drafts));
}

// -------------------------------------------------------------
// AVSPARK
//
// Cron var 5:e minut (db/notifications.sql). Fönstret är 15 minuter, så
// tre körningar täcker det även om ett anrop faller bort — dedupe_key
// utan tid ser till att bara den första ger en rad.
// -------------------------------------------------------------
export async function recordKickoffNotifications(now = Date.now()) {
  const admin = createAdminClient();
  const cutoff = new Date(now + KICKOFF_WINDOW_MIN * 60_000).toISOString();

  const { data, error } = await admin
    .from("bets")
    .select(BET_COLUMNS_WITH_FIXTURE)
    .eq("result", "open")
    .gte("fixtures.kickoff", new Date(now).toISOString())
    .lte("fixtures.kickoff", cutoff);

  if (error) {
    console.error("notiser vid avspark: kunde inte läsa spel", error.message);
    return 0;
  }

  const bets = ((data ?? []) as unknown as BetRow[]).map((b) => ({
    ...b,
    fixtures: one(b.fixtures),
  }));
  if (!bets.length) return 0;

  const drafts: NotificationDraft[] = bets.flatMap((bet) => {
    if (!bet.fixtures?.kickoff) return [];
    const minutes = Math.max(
      1,
      Math.round((new Date(bet.fixtures.kickoff).getTime() - now) / 60_000)
    );
    const teams = teamsOf(bet);
    const league = leagueOf(bet);
    const odds = Number(bet.odds).toFixed(2).replace(".", ",");
    return [
      {
        user_id: bet.user_id,
        type: "kickoff" as const,
        title: `Avspark om ${minutes} min`,
        body: `${teams.label}${league ? ` · ${league}` : ""}. Ditt spel: ${formatPick(bet.pick)} @ ${odds}.`,
        dedupe_key: `kickoff:${bet.id}`,
        target_type: "bet" as const,
        target_id: bet.id,
      },
    ];
  });

  return insertNotifications(await allowedInApp(drafts));
}

// -------------------------------------------------------------
// RÄTTNING
//
// Inget eget cron: körs av sättlingen, i samma svep som spelen skrivs.
// Kallas både från src/lib/settle-open.ts (rättning i webbappen) och
// från /api/internal/notify när Edge Functionen rättat.
//
// PUSH och VOID ger ingen notis — det finns inget utfall att berätta om.
// -------------------------------------------------------------
export async function recordSettledNotifications(betIds: string[]) {
  const ids = [...new Set(betIds.filter(Boolean))];
  if (!ids.length) return 0;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bets")
    .select(BET_COLUMNS)
    .in("id", ids)
    .in("result", ["win", "loss"]);

  if (error) {
    console.error("notiser vid rättning: kunde inte läsa spel", error.message);
    return 0;
  }

  const bets = ((data ?? []) as unknown as BetRow[]).map((b) => ({
    ...b,
    fixtures: one(b.fixtures),
  }));
  if (!bets.length) return 0;

  const drafts: NotificationDraft[] = bets.map((bet) => {
    const won = bet.result === "win";
    const teams = teamsOf(bet);
    const league = leagueOf(bet);
    const netto = Number(bet.payout ?? 0) - Number(bet.stake);
    return {
      user_id: bet.user_id,
      type: won ? ("settled_win" as const) : ("settled_loss" as const),
      title: `${won ? "Vunnet spel" : "Förlorat spel"} · ${formatPick(bet.pick)}`,
      body: `${teams.label} är rättad.${league ? ` ${league}.` : ""}`,
      dedupe_key: `settle:${bet.id}`,
      amount: Math.round(netto * 100) / 100,
      amount_kind: "netto" as const,
      target_type: "sheet" as const,
      target_id: bet.sheet_id,
    };
  });

  return insertNotifications(await allowedInApp(drafts));
}

// -------------------------------------------------------------
// KUPONG
//
// Anropas när redaktionen publicerar, från saveCoupon() i
// src/lib/admin/coupons.ts. Idempotent via dedupe_key coupon:{id}, så
// ett omsparande av samma kupong ger ingen andra notis.
//
// Skriver i batch: en insert per användare hade blivit tusen anrop.
// -------------------------------------------------------------
export async function recordCouponNotifications(coupon: {
  id: string;
  title: string;
  legs: number;
  totalOdds: number;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notification_settings")
    .select("user_id")
    .eq("coupon_in_app", true);

  if (error) {
    console.error("notiser vid kupong: kunde inte läsa mottagare", error.message);
    return 0;
  }

  const userIds = ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
  if (!userIds.length) return 0;

  const odds = coupon.totalOdds.toFixed(2).replace(".", ",");
  const drafts: NotificationDraft[] = userIds.map((userId) => ({
    user_id: userId,
    type: "coupon",
    title: `Ny kupong: ${coupon.title}`,
    body:
      coupon.legs === 1
        ? `Singel · totalodds ${odds}`
        : `${coupon.legs} spel · totalodds ${odds}`,
    dedupe_key: `coupon:${coupon.id}`,
    target_type: "coupon",
    target_id: coupon.id,
  }));

  // Mottagarna är redan filtrade i frågan ovan — inget andra varv behövs.
  return insertNotifications(drafts);
}

// -------------------------------------------------------------
// POPUP
//
// Anropas från /api/popup-events när en inloggad besökare FAKTISKT fått
// rutan på skärmen — inte när redaktionen publicerar. Det är skillnaden
// mot kupongnotisen: en popup med trigger "efter 20 sekunder på
// /kuponger" har ingen mottagarlista i förväg, den har en publik som
// råkar uppfylla villkoret.
//
// dedupe_key popup:{id} är unik per användare, så en ruta som visas i
// flera flikar eller efter en omladdning ger fortfarande en enda rad.
// Notisen är kvittot: rutan går att stänga, historiken ligger kvar.
// -------------------------------------------------------------
export async function recordPopupNotification(args: {
  userId: string;
  popupId: string;
  title: string;
  body: string;
  href: string | null;
}) {
  const title = args.title.trim();
  const body = args.body.trim();
  if (!title && !body) return 0;

  const drafts: NotificationDraft[] = [
    {
      user_id: args.userId,
      type: "popup",
      // En bildpopup saknar rubrik. Notisen måste ändå ha en — annars
      // står det en tom rad i panelen.
      title: title || "Nytt erbjudande",
      body,
      dedupe_key: `popup:${args.popupId}`,
      href: args.href,
    },
  ];

  return insertNotifications(await allowedInApp(drafts));
}

// -------------------------------------------------------------
// TÄVLINGSPLACERING
//
// Nattligt cron. Jämförelsen mot gårdagen ligger i dedupe_key:
// comp:{id}:{placering} är unik per användare, så en oförändrad
// placering skrivs aldrig om. Ingen extra historiktabell behövs.
// -------------------------------------------------------------
export async function recordCompetitionNotifications(now = Date.now()) {
  const admin = createAdminClient();
  const nowIso = new Date(now).toISOString();

  const { data: compRows, error: compError } = await admin
    .from("competitions")
    .select("*")
    .eq("active", true)
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso);

  if (compError) {
    console.error("notiser vid tävling: kunde inte läsa tävlingar", compError.message);
    return 0;
  }

  const comps = (compRows ?? []) as Competition[];
  if (!comps.length) return 0;

  const { data: boardRows, error: boardError } = await admin
    .from("leaderboard")
    .select("*")
    .in(
      "competition_id",
      comps.map((c) => c.id)
    );

  if (boardError) {
    console.error("notiser vid tävling: kunde inte läsa topplistan", boardError.message);
    return 0;
  }

  const byComp = new Map<string, LeaderboardRow[]>();
  for (const row of (boardRows ?? []) as LeaderboardRow[]) {
    if (!row.competition_id) continue;
    byComp.set(row.competition_id, [
      ...(byComp.get(row.competition_id) ?? []),
      row,
    ]);
  }

  const drafts: NotificationDraft[] = [];
  for (const comp of comps) {
    const entries = rankBoard(byComp.get(comp.id) ?? [], comp);
    const ranked = entries.filter((e) => e.rank !== null);
    for (const entry of ranked) {
      drafts.push({
        user_id: entry.user_id,
        type: "competition",
        title: `Plats ${entry.rank} i ${comp.name}`,
        // Topplistan rankar konton, inte enskilda spelböcker — därför
        // "Du", inte ett spelboksnamn som inte är det som mäts.
        body: `Du ligger på ROI ${formatPercent(entry.roi)} bland ${ranked.length} deltagare.`,
        dedupe_key: `comp:${comp.id}:${entry.rank}`,
        amount: Math.round(entry.roi * 10) / 10,
        amount_kind: "roi",
        target_type: "comp",
        target_id: comp.id,
      });
    }
  }

  return insertNotifications(await allowedInApp(drafts));
}
