"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { settleOutcome, track } from "@/lib/analytics";
import { fixtureFromBet, isInPlayStatus } from "@/lib/live-fixture";
import type { Bet, BetResult } from "@/lib/types";
import { cn, resultLabel, resultTone } from "@/lib/utils";

/**
 * Rättningarna i spelbokens tabell och kort.
 *
 * W(in) · L(oss) · P(ush, samma som void i den här appen) · V(äntar, dvs.
 * öppet spel). Fyra lägen, samma fyra som resten av appen kan sätta.
 */
const CHOICES: Array<{ value: BetResult; short: string; label: string }> = [
  { value: "win", short: "W", label: "Vinst" },
  { value: "loss", short: "L", label: "Förlust" },
  { value: "void", short: "P", label: "Push / void" },
  { value: "open", short: "V", label: "Väntar (orättat)" },
];

function choiceTone(result: BetResult) {
  // resultTone("open") är samma grå som inaktivt läge → egen aktiv-ton.
  if (result === "open") {
    return { bg: "bg-blue/15", fg: "text-blue", border: "border-blue/45" };
  }
  return resultTone(result);
}

/** ⚡ = kopplad till en match och rättas automatiskt. ✎ = manuellt spel. */
export function SettleSourceIcon({ bet }: { bet: Bet }) {
  const auto = bet.fixture_id != null;
  return (
    <span
      title={
        auto
          ? "Kopplat till en match — rättas automatiskt"
          : "Manuellt spel — du rättar det själv"
      }
      className={cn(
        "inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px]",
        auto
          ? "bg-[var(--blue-soft)] text-blue"
          : "bg-panel-2 text-muted"
      )}
      aria-hidden
    >
      {auto ? "⚡" : "✎"}
    </span>
  );
}

export function SheetSettleControls({
  bet,
  canEdit,
  size = "table",
}: {
  bet: Bet;
  canEdit: boolean;
  size?: "table" | "card";
}) {
  const router = useRouter();
  const fixture = fixtureFromBet(bet);
  const live = bet.result === "open" && isInPlayStatus(fixture?.status);

  async function setResult(result: BetResult) {
    if (result === bet.result) return;
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
    const outcome = settleOutcome(result);
    if (outcome) track({ event: "settle_bet", outcome });
    router.refresh();
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <SettleSourceIcon bet={bet} />
      {live ? (
        <span
          className="size-1.5 shrink-0 animate-sbpulse rounded-full bg-cyan"
          title="Matchen pågår"
          aria-hidden
        />
      ) : null}
      {canEdit ? (
        <span role="group" aria-label="Rättning" className="flex gap-1">
          {CHOICES.map(({ value, short, label }) => {
            const active = bet.result === value;
            const tone = choiceTone(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => void setResult(value)}
                title={label}
                aria-label={label}
                aria-pressed={active}
                className={cn(
                  "cursor-pointer rounded-[6px] border font-mono-num font-semibold transition",
                  size === "card"
                    ? "px-2.5 py-2 text-[11px]"
                    : "px-2 py-[5px] text-[11.5px]",
                  active
                    ? `${tone.bg} ${tone.fg} ${tone.border}`
                    : "border-transparent text-faint hover:text-text"
                )}
              >
                {short}
              </button>
            );
          })}
        </span>
      ) : (
        <span
          className={cn(
            "rounded-[6px] px-2 py-[5px] text-[11.5px] font-semibold",
            resultTone(bet.result).bg,
            resultTone(bet.result).fg
          )}
        >
          {resultLabel(bet.result)}
        </span>
      )}
    </span>
  );
}
