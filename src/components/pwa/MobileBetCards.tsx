"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import {
  LoggedBeforeKickoffBadge,
  SheetLockIcon,
} from "@/components/bets/LoggedBeforeKickoff";
import { BookmakerPlate } from "@/components/bets/SheetBetsTable";
import { SheetMatchCell } from "@/components/bets/SheetMatchCell";
import { useT } from "@/components/TextsProvider";
import { useLiveFixtures } from "@/hooks/useLiveFixtures";
import {
  applyLiveToBet,
  fixtureFromBet,
  isInPlayStatus,
  needsLiveRefresh,
} from "@/lib/live-fixture";
import { formatPick } from "@/lib/picks";
import { canRyggaBet } from "@/lib/rygga";
import type { TextKey, TFunction } from "@/lib/texts";
import type { Bet, BetResult } from "@/lib/types";
import { settleOutcome, track } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import {
  cacheBetsForSheet,
  listPendingBets,
  pendingToDisplayBet,
  removePendingBet,
  syncPendingBets,
  type PendingBet,
} from "@/lib/offline-queue";
import { useAmount } from "@/components/DisplayPrefsProvider";
import { betDisplayDate, betLeagueLogo } from "@/lib/logos";
import { stockholmYmd } from "@/lib/stockholm";
import {
  betNetto,
  betPossibleWin,
  cn,
  formatOdds,
  formatRoi,
  nettoColor,
  payoutForResult,
  resultTone,
  computeStats,
} from "@/lib/utils";

type DisplayBet = Bet & {
  _pending?: boolean;
  _pendingStatus?: PendingBet["status"];
  _pendingId?: string;
};

const FILTERS: Array<{ id: string; label: TextKey }> = [
  { id: "all", label: "spelbok.mobile.filter.all" },
  { id: "open", label: "spelbok.mobile.filter.open" },
  { id: "win", label: "spelbok.mobile.filter.win" },
  { id: "loss", label: "spelbok.mobile.filter.loss" },
  { id: "void", label: "spelbok.mobile.filter.void" },
  { id: "halfwin", label: "spelbok.mobile.filter.halfwin" },
  { id: "halfloss", label: "spelbok.mobile.filter.halfloss" },
];

/** Samma fyra rättningar som i desktoptabellen — inte bara vann/förlorade. */
const QUICK_RESULTS: Array<{ result: BetResult; label: TextKey }> = [
  { result: "win", label: "spelbok.mobile.settle.win" },
  { result: "loss", label: "spelbok.mobile.settle.loss" },
  { result: "void", label: "spelbok.mobile.settle.void" },
  { result: "open", label: "spelbok.mobile.settle.open" },
];

function quickResultTone(result: BetResult) {
  // resultTone("open") är samma grå som inaktivt läge → egen aktiv-ton.
  if (result === "open") {
    return { bg: "bg-blue/15", fg: "text-blue", border: "border-blue/45" };
  }
  return resultTone(result);
}

function vibrate(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

/** Avsparksdatum i svensk tid, t.ex. "10 okt." eller "31 okt. 2025". */
function cardDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = stockholmYmd(d).slice(0, 4) === stockholmYmd().slice(0, 4);
  return d.toLocaleDateString("sv-SE", {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "Europe/Stockholm",
  });
}

/**
 * Märket i kortets huvud. Bara synkstatus för offline-köade spel — matchens
 * status (minut, FT) står i matchsektionen och rättningen i knapparna.
 */
function statusBadge(
  bet: DisplayBet,
  t: TFunction
): {
  label: string;
  className: string;
} | null {
  if (bet._pendingStatus === "error") {
    return {
      label: t("spelbok.mobile.badge.syncFailed"),
      className: "bg-loss/15 text-loss border-loss/40",
    };
  }
  if (bet._pending) {
    return {
      label: t("spelbok.mobile.badge.pending"),
      className: "bg-yellow/15 text-yellow border-yellow/40",
    };
  }
  return null;
}

export function MobileBetCards({
  bets,
  sheetId,
  canEdit,
  canRygga = false,
  onRygga,
  hideChrome = false,
  liveManaged = false,
  highlightBetId,
}: {
  bets: Bet[];
  sheetId: string;
  canEdit: boolean;
  canRygga?: boolean;
  onRygga?: (bet: Bet) => void;
  /** Dölj KPI-rad + statuschips (när parent hanterar filter/metrics). */
  hideChrome?: boolean;
  /** Parent kör redan useLiveFixtures och skickar in patchade spel. */
  liveManaged?: boolean;
  /** Kortet en notis pekade ut. Pulsar i två sekunder, sedan null. */
  highlightBetId?: string | null;
}) {
  const t = useT();
  const amount = useAmount();
  const router = useRouter();
  const online = useOnlineStatus();
  const [filter, setFilter] = useState("all");
  const [pending, setPending] = useState<PendingBet[]>([]);
  const [sheetBet, setSheetBet] = useState<DisplayBet | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    cacheBetsForSheet(sheetId, bets).catch(() => undefined);
  }, [sheetId, bets]);

  useEffect(() => {
    listPendingBets()
      .then((all) => setPending(all.filter((p) => p.payload.sheet_id === sheetId)))
      .catch(() => setPending([]));
  }, [sheetId, bets]);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setSyncing(false);
        return;
      }
      await syncPendingBets(async (payload) => {
        const { error } = await supabase.from("bets").insert(payload);
        return { error: error?.message || null };
      }, user.id);
      if (!cancelled) {
        const all = await listPendingBets();
        setPending(all.filter((p) => p.payload.sheet_id === sheetId));
        router.refresh();
      }
      setSyncing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [online, sheetId, router]);

  /*
    Rättningen tar en tur till servern och tillbaka. Fram tills dess står
    kortet kvar på sitt gamla resultat och tryckningen ser bortglömd ut, så
    man trycker igen. Valet visas därför direkt och släpps först när servern
    hunnit ikapp. Låset hindrar dubbeltryck på samma spel.
  */
  const [settling, setSettling] = useState<Record<string, BetResult>>({});
  const savingRef = useRef<Set<string>>(new Set());

  // Nya rader från servern = släpp de val som hunnit landa.
  const [seenBets, setSeenBets] = useState(bets);
  if (seenBets !== bets) {
    setSeenBets(bets);
    const landed = Object.keys(settling).filter((id) =>
      bets.some((b) => b.id === id && b.result === settling[id])
    );
    if (landed.length) {
      const next = { ...settling };
      for (const id of landed) delete next[id];
      setSettling(next);
    }
  }

  const displayBets: DisplayBet[] = useMemo(() => {
    const pendingDisplay = pending.map(pendingToDisplayBet);
    // Utbetalningen räknas fram i databasen, så den lokala siffran använder
    // samma formel — annars visar kortet fel netto i en sekund.
    const settled = bets.map((bet) => {
      const result = settling[bet.id];
      if (!result) return bet;
      return {
        ...bet,
        result,
        payout: payoutForResult(result, Number(bet.stake), Number(bet.odds)),
      };
    });
    return [...pendingDisplay, ...settled];
  }, [pending, bets, settling]);

  const filtered = useMemo(() => {
    if (hideChrome || filter === "all") return displayBets;
    return displayBets.filter((b) => b.result === filter);
  }, [displayBets, filter, hideChrome]);

  // Tom id-lista = ingen egen Realtime-kanal eller pollning.
  const live = useLiveFixtures(
    liveManaged
      ? []
      : filtered
          .map((b) => b.fixture_id)
          .filter((id): id is number => id != null),
    {
      hasLive: !liveManaged && filtered.some((b) =>
        needsLiveRefresh(b.fixtures?.status, b.fixtures?.kickoff)
      ),
      onSettled: () => router.refresh(),
    }
  );

  const stats = hideChrome ? null : computeStats(bets);

  async function setResult(bet: DisplayBet, result: BetResult) {
    if (bet._pending || !online) return;
    if (savingRef.current.has(bet.id)) return;
    savingRef.current.add(bet.id);
    setSettling((current) => ({ ...current, [bet.id]: result }));
    vibrate(18);
    const supabase = createClient();
    const { error } = await supabase
      .from("bets")
      .update({
        result,
        settled_at: result === "open" ? null : new Date().toISOString(),
        settled_by: result === "open" ? null : "user",
      })
      .eq("id", bet.id);
    savingRef.current.delete(bet.id);
    if (error) {
      setSettling((current) => {
        const next = { ...current };
        delete next[bet.id];
        return next;
      });
      alert(error.message || t("spelbok.settle.failed"));
      return;
    }
    const outcome = settleOutcome(result);
    if (outcome) track({ event: "settle_bet", outcome });
    setSheetBet(null);
    router.refresh();
  }

  async function remove(bet: DisplayBet) {
    if (bet._pendingId) {
      await removePendingBet(bet._pendingId);
      setPending((p) => p.filter((x) => x.id !== bet._pendingId));
      setSheetBet(null);
      return;
    }
    if (!online) return;
    if (!confirm(t("spelbok.remove.confirm"))) return;
    const supabase = createClient();
    await supabase.from("bets").delete().eq("id", bet.id);
    setSheetBet(null);
    router.refresh();
  }

  async function retryPending(bet: DisplayBet) {
    if (!bet._pendingId || !online) return;
    const item = pending.find((p) => p.id === bet._pendingId);
    if (!item) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert(t("spelbok.mobile.sync.loginRequired"));
      return;
    }
    const { error } = await supabase
      .from("bets")
      .insert({ ...item.payload, user_id: user.id });
    if (error) {
      // Köade spel från före oddsvalideringen kan sakna odds och kommer
      // aldrig gå igenom — säg det i stället för att misslyckas tyst.
      const odds = Number(item.payload.odds);
      alert(
        Number.isFinite(odds) && odds >= 1.01
          ? t("spelbok.mobile.sync.failed")
          : t("spelbok.mobile.sync.invalidOdds")
      );
      return;
    }
    await removePendingBet(item.id);
    setPending((p) => p.filter((x) => x.id !== item.id));
    router.refresh();
  }

  return (
    <div className="lg:hidden">
      {!hideChrome && stats ? (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto sb-scroll snap-x snap-mandatory pb-1">
            {[
              { label: t("spelbok.kpi.netto"), value: amount(stats.netto), color: nettoColor(stats.netto) },
              { label: t("spelbok.kpi.roi"), value: formatRoi(stats.roi), color: nettoColor(stats.roi) },
              { label: t("spelbok.kpi.hitrate"), value: `${stats.hitrate.toFixed(0)}%`, color: "text-text" },
              { label: t("spelbok.kpi.bets"), value: String(stats.bets), color: "text-text" },
            ].map((k) => (
              <div
                key={k.label}
                className="min-w-[104px] snap-start rounded-[13px] border border-line bg-panel px-3.5 py-3"
              >
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">
                  {k.label}
                </div>
                <div className={`mt-1 font-mono-num text-[17px] font-semibold ${k.color}`}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-3 flex gap-2 overflow-x-auto sb-scroll pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                  filter === f.id
                    ? "border-win bg-win/10 text-win"
                    : "border-line bg-panel text-muted"
                )}
              >
                {t(f.label)}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {syncing ? (
        <div className="mb-2 text-center text-[12px] text-muted">
          {t("spelbok.mobile.syncing")}
        </div>
      ) : null}

      <div className="space-y-3">
        {filtered.map((bet) => (
          <SwipeBetCard
            key={bet.id}
            bet={applyLiveToBet(bet, live)}
            highlight={bet.id === highlightBetId}
            canEdit={canEdit && !bet._pending}
            canRygga={canRygga && !bet._pending}
            online={online}
            onSetResult={(result) => setResult(bet, result)}
            onOpenSheet={() => setSheetBet(bet)}
            onRetry={() => retryPending(bet)}
            onRygga={onRygga ? () => onRygga(bet) : undefined}
          />
        ))}
        {!filtered.length ? (
          <div className="rounded-[12px] border border-line bg-panel px-4 py-10 text-center text-muted">
            {t("spelbok.mobile.empty")}
          </div>
        ) : null}
      </div>

      {sheetBet ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/55">
          <button
            type="button"
            className="absolute inset-0"
            aria-label={t("spelbok.mobile.menu.close")}
            onClick={() => setSheetBet(null)}
          />
          <div className="relative w-full rounded-t-[15px] border-t border-line bg-panel px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
            <div className="mb-3 font-semibold">{sheetBet.match}</div>
            {sheetBet.logged_before_kickoff != null ? (
              <div className="mb-3">
                <LoggedBeforeKickoffBadge value={sheetBet.logged_before_kickoff} />
              </div>
            ) : null}
            <div className="grid gap-2">
              {canRygga &&
              onRygga &&
              !sheetBet._pending &&
              canRyggaBet(sheetBet) ? (
                <button
                  type="button"
                  onClick={() => {
                    onRygga(sheetBet);
                    setSheetBet(null);
                  }}
                  className="rounded-[10px] border border-line bg-panel-2 px-4 py-3 text-left font-semibold"
                >
                  {t("spelbok.mobile.menu.copy")}
                </button>
              ) : null}
              {canEdit || sheetBet._pending ? (
                <button
                  type="button"
                  disabled={!online && !sheetBet._pending}
                  title={
                    !online && !sheetBet._pending
                      ? t("spelbok.mobile.menu.needsOnline")
                      : undefined
                  }
                  onClick={() => remove(sheetBet)}
                  className="rounded-[10px] border border-loss/40 bg-loss/10 px-4 py-3 text-left font-semibold text-loss disabled:opacity-40"
                >
                  {t("spelbok.mobile.menu.remove")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SwipeBetCard({
  bet,
  canEdit,
  canRygga,
  online,
  onSetResult,
  onOpenSheet,
  onRetry,
  onRygga,
  highlight = false,
}: {
  bet: DisplayBet;
  highlight?: boolean;
  canEdit: boolean;
  canRygga: boolean;
  online: boolean;
  onSetResult: (result: BetResult) => void;
  onOpenSheet: () => void;
  onRetry: () => void;
  onRygga?: () => void;
}) {
  const t = useT();
  const amount = useAmount();
  const x = useMotionValue(0);
  const winOpacity = useTransform(x, [0, 120], [0, 1]);
  const lossOpacity = useTransform(x, [0, -120], [0, 1]);
  const holdTimer = useRef<number | null>(null);
  const badge = statusBadge(bet, t);
  const netto = betNetto(bet);
  const settled = bet.result !== "open";
  const fixture = fixtureFromBet(bet);
  const isLive = isInPlayStatus(fixture?.status);
  const date = cardDate(betDisplayDate(bet));
  const hasMenu =
    canEdit || !!bet._pending || (canRygga && !!onRygga && canRyggaBet(bet));

  function clearHold() {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[12px]">
      <motion.div
        style={{ opacity: winOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-start bg-win/90 px-5 font-display text-2xl font-bold text-win-ink"
      >
        {t("spelbok.mobile.swipe.win")}
      </motion.div>
      <motion.div
        style={{ opacity: lossOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end bg-loss/90 px-5 font-display text-2xl font-bold text-white"
      >
        {t("spelbok.mobile.swipe.loss")}
      </motion.div>

      <motion.div
        style={{ x }}
        drag={canEdit && bet.result === "open" && online ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.85}
        onPointerDown={() => {
          if (!canEdit) return;
          clearHold();
          holdTimer.current = window.setTimeout(() => {
            vibrate(20);
            onOpenSheet();
          }, 520);
        }}
        onPointerUp={clearHold}
        onPointerCancel={clearHold}
        onDragEnd={(_, info) => {
          clearHold();
          if (info.offset.x > 110) {
            vibrate(25);
            onSetResult("win");
          } else if (info.offset.x < -110) {
            vibrate(25);
            onSetResult("loss");
          }
          animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
        }}
        className={cn(
          "relative rounded-[12px] border bg-panel p-3.5",
          isLive
            ? "border-live/45 bg-live/[0.06]"
            : bet.result === "open"
              ? "border-blue/30"
              : "border-line",
          highlight && "animate-sbrowpulse"
        )}
      >
        {/* 1. Liga och datum ihop; långa liganamn bryts i stället för att
            kapas. Låset (och menyn) uppe till höger. */}
        <div className="flex items-start gap-2">
          {bet.league ? (
            <span className="mt-px inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[rgba(230,234,242,0.07)] p-[2px]">
              <LeagueLogo
                src={betLeagueLogo(bet)}
                leagueId={bet.league_id ?? bet.fixtures?.league_id}
                sport={bet.sport ?? bet.fixtures?.sport}
                name={bet.league}
                size={18}
              />
            </span>
          ) : null}
          <span className="line-clamp-2 min-w-0 flex-1 break-words pt-0.5 text-[12.5px] leading-snug text-[#8A94AB]">
            {bet.league
              ? t("spelbok.mobile.card.leagueDate", { league: bet.league, date })
              : t("spelbok.mobile.card.matchDate", { date })}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {badge ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-[6px] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                  badge.className
                )}
              >
                {badge.label}
              </span>
            ) : null}
            <SheetLockIcon value={bet.logged_before_kickoff} className="mr-0" />
            {hasMenu ? (
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onOpenSheet}
                className="-mr-1 px-1 text-[18px] leading-none text-muted"
                aria-label={t("spelbok.mobile.card.more")}
              >
                ⋯
              </button>
            ) : null}
          </div>
        </div>

        {/* 2. Matchen i en egen sektion: loggor, lag och resultat. */}
        <div className="mt-2.5">
          <SheetMatchCell bet={bet} density="result" variant="card" />
        </div>

        {/* 3. Spel i full bredd, insats och odds i egna fält under. */}
        <div className="mt-2.5 rounded-[11px] border border-line-soft bg-bg-soft px-[13px] py-2.5">
          <div className="mb-1 text-[10px] uppercase tracking-[0.13em] text-[#5D6883]">
            {t("spelbok.cards.pick")}
          </div>
          <div className="break-words text-[16px] font-bold leading-snug">
            {formatPick(bet.pick)}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-[11px] border border-line-soft bg-bg-soft px-[13px] py-2">
            <div className="mb-0.5 text-[10px] uppercase tracking-[0.13em] text-[#5D6883]">
              {t("spelbok.cards.stake")}
            </div>
            <div className="whitespace-nowrap font-mono-num text-[14px] font-semibold tabular-nums">
              {amount(Number(bet.stake), { sign: false })}
            </div>
          </div>
          <div className="rounded-[11px] border border-line-soft bg-bg-soft px-[13px] py-2">
            <div className="mb-0.5 text-[10px] uppercase tracking-[0.13em] text-[#5D6883]">
              {t("spelbok.cards.odds")}
            </div>
            <div className="font-mono-num text-[14px] font-semibold tabular-nums">
              {formatOdds(Number(bet.odds))}
            </div>
          </div>
        </div>

        {/* 4. Resultat och spelbolag, sedan statusknapparna. */}
        <div className="mt-3 flex items-end gap-3 border-t border-line-soft pt-3">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[10px] uppercase tracking-[0.13em] text-[#5D6883]">
              {settled
                ? t("spelbok.cards.result")
                : t("spelbok.cards.possibleWin")}
            </div>
            <span
              className={cn(
                "whitespace-nowrap font-mono-num text-[19px] font-semibold tabular-nums",
                settled ? nettoColor(netto) : "text-[#C3CBDB]"
              )}
            >
              {amount(settled ? netto : betPossibleWin(bet))}
            </span>
          </div>
          <BookmakerPlate bet={bet} width={80} height={34} branded />
        </div>

        {canEdit && online && !bet._pending ? (
          <div
            role="group"
            aria-label={t("spelbok.settle.groupAria")}
            className="mt-3 grid grid-cols-4 gap-1.5"
          >
            {QUICK_RESULTS.map(({ result, label }) => {
              const active = bet.result === result;
              const tone = quickResultTone(result);
              return (
                <button
                  key={result}
                  type="button"
                  aria-pressed={active}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onSetResult(result)}
                  className={cn(
                    "truncate rounded-[8px] border py-2 text-[12px] font-semibold transition",
                    active
                      ? `${tone.bg} ${tone.fg} ${tone.border}`
                      : "border-line text-muted"
                  )}
                >
                  {t(label)}
                </button>
              );
            })}
          </div>
        ) : null}

        {bet._pendingStatus === "error" ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={!online}
            className="mt-2 text-sm font-semibold text-loss underline disabled:opacity-40"
          >
            {t("spelbok.mobile.sync.retry")}
          </button>
        ) : null}
      </motion.div>
    </div>
  );
}
