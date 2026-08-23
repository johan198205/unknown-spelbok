"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { FixtureMatch } from "@/components/bets/FixtureMatch";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { ManualMatchLabel } from "@/components/bets/TeamPair";
import { BetRowActions } from "@/components/bets/BetRowActions";
import {
  LoggedBeforeKickoffBadge,
  LoggedBeforeKickoffIcon,
} from "@/components/bets/LoggedBeforeKickoff";
import { useLiveFixtures } from "@/hooks/useLiveFixtures";
import {
  applyLiveToBet,
  fixtureFromBet,
  isInPlayStatus,
  needsLiveRefresh,
} from "@/lib/live-fixture";
import { canRyggaBet } from "@/lib/rygga";
import type { Bet, BetResult } from "@/lib/types";
import { BookmakerLogo } from "@/components/bets/BookmakerLogo";
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
import { betLeagueLogo } from "@/lib/logos";
import {
  betNetto,
  cn,
  formatMoney,
  formatOdds,
  formatRoi,
  nettoColor,
  resultLabel,
  resultTone,
  computeStats,
} from "@/lib/utils";

type DisplayBet = Bet & {
  _pending?: boolean;
  _pendingStatus?: PendingBet["status"];
  _pendingId?: string;
};

const FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "Alla" },
  { id: "open", label: "Öppna" },
  { id: "win", label: "Vinst" },
  { id: "loss", label: "Förlust" },
  { id: "void", label: "Void" },
  { id: "halfwin", label: "Halvvinst" },
  { id: "halfloss", label: "Halvförlust" },
];

const SHEET_ACTIONS: Array<{ result: BetResult; label: string }> = [
  { result: "win", label: "Vann" },
  { result: "loss", label: "Förlorade" },
  { result: "void", label: "Void" },
  { result: "halfwin", label: "Halvvinst" },
  { result: "halfloss", label: "Halvförlust" },
];

/** Samma fyra rättningar som i desktoptabellen — inte bara vann/förlorade. */
const QUICK_RESULTS: Array<{ result: BetResult; label: string }> = [
  { result: "win", label: "Vann" },
  { result: "loss", label: "Förlorade" },
  { result: "void", label: "Void" },
  { result: "open", label: "Öppen" },
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

function statusBadge(bet: DisplayBet): {
  label: string;
  className: string;
  live?: boolean;
} {
  if (bet._pendingStatus === "error") {
    return {
      label: "Kunde inte synkas",
      className: "bg-loss/15 text-loss border-loss/40",
    };
  }
  if (bet._pending) {
    return {
      label: "Väntar på synk",
      className: "bg-yellow/15 text-yellow border-yellow/40",
    };
  }
  if (bet.result === "open" && isInPlayStatus(bet.fixtures?.status)) {
    return {
      label: "Live",
      className: "bg-live/15 text-live border-live/45",
      live: true,
    };
  }
  if (bet.result === "open") {
    return {
      label: bet.settled_by === "auto" ? "AUTO-RÄTTAS" : "Orättat",
      className: "bg-blue/15 text-blue border-blue/45",
    };
  }
  if (bet.settled_by === "auto") {
    return {
      label: "AUTO-RÄTTAS",
      className: "bg-blue/15 text-blue border-blue/40",
    };
  }
  return {
    label: bet.result === "win" || bet.result === "loss" ? "FT" : resultLabel(bet.result),
    className: `${resultTone(bet.result).bg} ${resultTone(bet.result).fg} ${resultTone(bet.result).border}`,
  };
}

export function MobileBetCards({
  bets,
  sheetId,
  canEdit,
  canRygga = false,
  onRygga,
  hideChrome = false,
}: {
  bets: Bet[];
  sheetId: string;
  canEdit: boolean;
  canRygga?: boolean;
  onRygga?: (bet: Bet) => void;
  /** Dölj KPI-rad + statuschips (när parent hanterar filter/metrics). */
  hideChrome?: boolean;
}) {
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

  const displayBets: DisplayBet[] = useMemo(() => {
    const pendingDisplay = pending.map(pendingToDisplayBet);
    return [...pendingDisplay, ...bets];
  }, [pending, bets]);

  const filtered = useMemo(() => {
    if (hideChrome || filter === "all") return displayBets;
    return displayBets.filter((b) => b.result === filter);
  }, [displayBets, filter, hideChrome]);

  const live = useLiveFixtures(
    filtered.map((b) => b.fixture_id).filter((id): id is number => id != null),
    {
      hasLive: filtered.some((b) =>
        needsLiveRefresh(b.fixtures?.status, b.fixtures?.kickoff)
      ),
      onSettled: () => router.refresh(),
    }
  );

  const stats = hideChrome ? null : computeStats(bets);

  async function setResult(bet: DisplayBet, result: BetResult) {
    if (bet._pending || !online) return;
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
    if (error) {
      alert(error.message || "Kunde inte sätta resultat");
      return;
    }
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
    if (!confirm("Ta bort spelet?")) return;
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
    if (!user) return;
    const { error } = await supabase
      .from("bets")
      .insert({ ...item.payload, user_id: user.id });
    if (!error) {
      await removePendingBet(item.id);
      setPending((p) => p.filter((x) => x.id !== item.id));
      router.refresh();
    }
  }

  return (
    <div className="lg:hidden">
      {!hideChrome && stats ? (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto sb-scroll snap-x snap-mandatory pb-1">
            {[
              { label: "Netto", value: formatMoney(stats.netto), color: nettoColor(stats.netto) },
              { label: "ROI", value: formatRoi(stats.roi), color: nettoColor(stats.roi) },
              { label: "Hitrate", value: `${stats.hitrate.toFixed(0)}%`, color: "text-text" },
              { label: "Spel", value: String(stats.bets), color: "text-text" },
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
                {f.label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {syncing ? (
        <div className="mb-2 text-center text-[12px] text-muted">Synkar offline-kö…</div>
      ) : null}

      <div className="space-y-3">
        {filtered.map((bet) => (
          <SwipeBetCard
            key={bet.id}
            bet={applyLiveToBet(bet, live)}
            canEdit={canEdit && !bet._pending}
            canRygga={canRygga && !bet._pending}
            online={online}
            onSetResult={(result) => setResult(bet, result)}
            onOpenSheet={() => setSheetBet(bet)}
            onRetry={() => retryPending(bet)}
            onRygga={onRygga ? () => onRygga(bet) : undefined}
            onRemove={() => void remove(bet)}
          />
        ))}
        {!filtered.length ? (
          <div className="rounded-[12px] border border-line bg-panel px-4 py-10 text-center text-muted">
            Inga spel ännu.
          </div>
        ) : null}
      </div>

      {sheetBet ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/55">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Stäng"
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
              {canEdit && !sheetBet._pending
                ? SHEET_ACTIONS.map((a) => (
                    <button
                      key={a.result}
                      type="button"
                      disabled={!online || !!sheetBet._pending}
                      title={!online ? "Kräver uppkoppling" : undefined}
                      onClick={() => setResult(sheetBet, a.result)}
                      className="rounded-[10px] border border-line bg-panel-2 px-4 py-3 text-left font-semibold disabled:opacity-40"
                    >
                      {a.label}
                    </button>
                  ))
                : null}
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
                  Rygga spel
                </button>
              ) : null}
              {canEdit || sheetBet._pending ? (
                <button
                  type="button"
                  disabled={!online && !sheetBet._pending}
                  title={
                    !online && !sheetBet._pending
                      ? "Kräver uppkoppling"
                      : undefined
                  }
                  onClick={() => remove(sheetBet)}
                  className="rounded-[10px] border border-loss/40 bg-loss/10 px-4 py-3 text-left font-semibold text-loss disabled:opacity-40"
                >
                  Ta bort
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
  onRemove,
}: {
  bet: DisplayBet;
  canEdit: boolean;
  canRygga: boolean;
  online: boolean;
  onSetResult: (result: BetResult) => void;
  onOpenSheet: () => void;
  onRetry: () => void;
  onRygga?: () => void;
  onRemove?: () => void;
}) {
  const x = useMotionValue(0);
  const winOpacity = useTransform(x, [0, 120], [0, 1]);
  const lossOpacity = useTransform(x, [0, -120], [0, 1]);
  const holdTimer = useRef<number | null>(null);
  const badge = statusBadge(bet);
  const netto = betNetto(bet);
  const fixture = fixtureFromBet(bet);
  const isLive = isInPlayStatus(fixture?.status);
  const date = new Date(bet.placed_at).toLocaleDateString("sv-SE", {
    day: "2-digit",
    month: "short",
  });

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
        VINST
      </motion.div>
      <motion.div
        style={{ opacity: lossOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end bg-loss/90 px-5 font-display text-2xl font-bold text-white"
      >
        FÖRLUST
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
              : "border-line"
        )}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
            {bet.league ? (
              <>
                <LeagueLogo
                  src={betLeagueLogo(bet)}
                  leagueId={bet.league_id ?? bet.fixtures?.league_id}
                  sport={bet.sport ?? bet.fixtures?.sport}
                  name={bet.league}
                  size={18}
                />
                <span className="min-w-0 truncate">
                  {bet.league} · {date}
                </span>
              </>
            ) : (
              <span>Match · {date}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <BetRowActions
              bet={bet}
              canEdit={canEdit}
              canRygga={canRygga}
              onRygga={onRygga}
              onRemove={onRemove}
              hoverReveal={false}
            />
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-[6px] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                badge.className
              )}
            >
              {badge.live ? (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
              ) : null}
              {badge.label}
            </span>
            {canEdit || bet._pending || (canRygga && canRyggaBet(bet)) ? (
              <button
                type="button"
                onClick={onOpenSheet}
                className="px-1 text-muted"
                aria-label="Fler alternativ"
              >
                ⋯
              </button>
            ) : null}
          </div>
        </div>

        {fixture ? (
          <FixtureMatch fixture={fixture} stacked logoSize={20} />
        ) : (
          <ManualMatchLabel match={bet.match} stacked size={20} />
        )}
        <div className="mt-1 flex items-center gap-1.5 text-[15px] font-bold">
          <span className="inline-flex w-3.5 shrink-0 justify-center">
            <LoggedBeforeKickoffIcon value={bet.logged_before_kickoff} />
          </span>
          {bet.pick}
        </div>
        <div className="mt-2 flex items-center gap-2 font-mono-num text-[12.5px] text-muted">
          <BookmakerLogo
            logoPath={bet.bookmakers?.logo_url}
            name={bet.bookmakers?.name}
            placeholder
            size={18}
            maxWidth={68}
          />
          <span>
            {Number(bet.stake).toLocaleString("sv-SE")} ·{" "}
            {formatOdds(Number(bet.odds))}
          </span>
        </div>

        {canEdit && online && !bet._pending ? (
          <div
            role="group"
            aria-label="Rättning"
            className="mt-3 grid grid-cols-4 gap-1.5"
          >
            {QUICK_RESULTS.map(({ result, label }) => {
              const active = bet.result === result;
              const t = quickResultTone(result);
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
                      ? `${t.bg} ${t.fg} ${t.border}`
                      : "border-line text-muted"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        {bet.result !== "open" ? (
          <div className={`mt-2 font-mono-num text-[22px] font-semibold ${nettoColor(netto)}`}>
            {formatMoney(netto)}
          </div>
        ) : null}

        {bet._pendingStatus === "error" ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={!online}
            className="mt-2 text-sm font-semibold text-loss underline disabled:opacity-40"
          >
            Försök igen
          </button>
        ) : null}
      </motion.div>
    </div>
  );
}
