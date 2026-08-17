"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { FixtureMatch } from "@/components/bets/FixtureMatch";
import { useLiveFixtures } from "@/hooks/useLiveFixtures";
import {
  applyLiveToBet,
  fixtureFromBet,
  isInPlayStatus,
} from "@/lib/live-fixture";
import type { Bet, BetResult } from "@/lib/types";
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
  { result: "win", label: "Vinst" },
  { result: "loss", label: "Förlust" },
  { result: "void", label: "Void" },
  { result: "halfwin", label: "Halvvinst" },
  { result: "halfloss", label: "Halvförlust" },
];

function vibrate(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

function statusBadge(bet: DisplayBet) {
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
  if (bet.result === "open") {
    return {
      label: bet.settled_by === "auto" ? "AUTO-RÄTTAS" : "Öppet",
      className: "bg-cyan/15 text-cyan border-cyan/40",
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
}: {
  bets: Bet[];
  sheetId: string;
  canEdit: boolean;
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
    if (filter === "all") return displayBets;
    return displayBets.filter((b) => b.result === filter);
  }, [displayBets, filter]);

  const live = useLiveFixtures(
    filtered.map((b) => b.fixture_id).filter((id): id is number => id != null),
    { hasLive: filtered.some((b) => isInPlayStatus(b.fixtures?.status)) }
  );

  const stats = computeStats(bets);

  async function setResult(bet: DisplayBet, result: BetResult) {
    if (bet._pending || !online) return;
    vibrate(18);
    const supabase = createClient();
    await supabase
      .from("bets")
      .update({
        result,
        settled_at: result === "open" ? null : new Date().toISOString(),
        settled_by: result === "open" ? null : "user",
      })
      .eq("id", bet.id);
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

      {syncing ? (
        <div className="mb-2 text-center text-[12px] text-muted">Synkar offline-kö…</div>
      ) : null}

      <div className="space-y-3">
        {filtered.map((bet) => (
          <SwipeBetCard
            key={bet.id}
            bet={applyLiveToBet(bet, live)}
            canEdit={canEdit && !bet._pending}
            online={online}
            onSwipeWin={() => setResult(bet, "win")}
            onSwipeLoss={() => setResult(bet, "loss")}
            onOpenSheet={() => setSheetBet(bet)}
            onRetry={() => retryPending(bet)}
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
            <div className="grid gap-2">
              {SHEET_ACTIONS.map((a) => (
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
              ))}
              <button
                type="button"
                disabled={!online && !sheetBet._pending}
                title={!online && !sheetBet._pending ? "Kräver uppkoppling" : undefined}
                onClick={() => remove(sheetBet)}
                className="rounded-[10px] border border-loss/40 bg-loss/10 px-4 py-3 text-left font-semibold text-loss disabled:opacity-40"
              >
                Ta bort
              </button>
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
  online,
  onSwipeWin,
  onSwipeLoss,
  onOpenSheet,
  onRetry,
}: {
  bet: DisplayBet;
  canEdit: boolean;
  online: boolean;
  onSwipeWin: () => void;
  onSwipeLoss: () => void;
  onOpenSheet: () => void;
  onRetry: () => void;
}) {
  const x = useMotionValue(0);
  const winOpacity = useTransform(x, [0, 120], [0, 1]);
  const lossOpacity = useTransform(x, [0, -120], [0, 1]);
  const holdTimer = useRef<number | null>(null);
  const badge = statusBadge(bet);
  const netto = betNetto(bet);
  const fixture = fixtureFromBet(bet);
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
            onSwipeWin();
          } else if (info.offset.x < -110) {
            vibrate(25);
            onSwipeLoss();
          }
          animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
        }}
        className="relative rounded-[12px] border border-line bg-panel p-3.5"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
            {bet.league || "Match"} · {date}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-[6px] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                badge.className
              )}
            >
              {badge.label}
            </span>
            {canEdit || bet._pending ? (
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
          <FixtureMatch fixture={fixture} />
        ) : (
          <div className="font-semibold text-text">{bet.match}</div>
        )}
        <div className="mt-1 text-[15px] font-bold">{bet.pick}</div>
        <div className="mt-2 flex items-center gap-1.5 font-mono-num text-[12.5px] text-muted">
          {bet.bookmakers?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bet.bookmakers.logo_url}
              alt=""
              className="h-3.5 w-3.5 object-contain"
            />
          ) : null}
          <span>
            {bet.bookmakers?.name || "—"} · {Number(bet.stake).toLocaleString("sv-SE")} ·{" "}
            {formatOdds(Number(bet.odds))}
          </span>
        </div>

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
