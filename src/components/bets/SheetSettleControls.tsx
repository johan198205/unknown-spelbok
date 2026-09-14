"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SheetLockIcon } from "@/components/bets/LoggedBeforeKickoff";
import { createClient } from "@/lib/supabase/client";
import { settleOutcome, track } from "@/lib/analytics";
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

export function SheetSettleControls({
  bet,
  canEdit,
  size = "table",
  /** Låsikonen hör hemma i tabellens Rättning-kolumn, inte i kortets huvudrad. */
  showLock = size === "table",
}: {
  bet: Bet;
  canEdit: boolean;
  size?: "table" | "card";
  showLock?: boolean;
}) {
  const router = useRouter();

  /*
    Rättningen skriver till databasen och laddar sedan om sidan. Fram tills
    dess sitter raden kvar på sitt gamla resultat, vilket ser ut som att
    klicket försvann — så man klickar igen, på en annan knapp, och skriver
    över sig själv. Valet markeras därför direkt och knapparna låses medan
    skrivningen pågår. Faller den, backar markeringen tillbaka.
  */
  const [picked, setPicked] = useState<BetResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [seen, setSeen] = useState(bet.result);
  if (seen !== bet.result) {
    setSeen(bet.result);
    setPicked(null);
  }

  const shown = picked ?? bet.result;
  const card = size === "card";

  async function setResult(result: BetResult) {
    if (saving || result === shown) return;
    setPicked(result);
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("bets")
      .update({
        result,
        settled_at: result === "open" ? null : new Date().toISOString(),
        settled_by: result === "open" ? null : "user",
      })
      .eq("id", bet.id);
    setSaving(false);
    if (error) {
      setPicked(null);
      alert(error.message || "Kunde inte sätta resultat");
      return;
    }
    const outcome = settleOutcome(result);
    if (outcome) track({ event: "settle_bet", outcome });
    router.refresh();
  }

  if (!canEdit) {
    return (
      <span
        className={cn(
          "inline-block rounded-[7px] px-[11px] py-1.5 font-mono-num text-[11.5px] font-semibold tracking-[0.06em]",
          resultTone(bet.result).bg,
          resultTone(bet.result).fg
        )}
      >
        {resultLabel(bet.result)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex items-center",
        card ? "w-full min-w-0" : "whitespace-nowrap"
      )}
    >
      {showLock ? <SheetLockIcon value={bet.logged_before_kickoff} /> : null}
      <span
        role="group"
        aria-label="Rättning"
        className={cn("flex", card ? "min-w-0 w-full gap-[5px]" : "gap-1")}
      >
        {CHOICES.map(({ value, short, label }) => {
          const active = shown === value;
          const waiting = active && saving;
          const tone = choiceTone(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => void setResult(value)}
              disabled={saving && !active}
              title={label}
              aria-label={label}
              aria-pressed={active}
              aria-busy={waiting || undefined}
              className={cn(
                "cursor-pointer border font-mono-num font-semibold transition disabled:cursor-wait",
                card
                  ? "min-w-0 flex-1 rounded-[8px] px-0 py-[9px] text-[12px]"
                  : "rounded-[6px] px-[7px] py-[5px] text-[11.5px]",
                active
                  ? `${tone.bg} ${tone.fg} ${tone.border}`
                  : card
                    ? "border-line-strong bg-transparent text-[#5D6883] hover:border-line-hover hover:text-text"
                    : "border-transparent text-faint hover:text-text",
                waiting && "animate-sbshimmer"
              )}
            >
              {short}
            </button>
          );
        })}
      </span>
    </span>
  );
}
