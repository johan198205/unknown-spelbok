"use client";

import { useState } from "react";
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
  const live = shown === "open" && isInPlayStatus(fixture?.status);
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

  return (
    <span
      className={cn(
        "flex items-center",
        card ? "min-w-0 flex-1" : "flex-wrap gap-1"
      )}
    >
      {/*
        Kortet visar redan ⚡ och live-pricken i sitt sidhuvud. Upprepades de
        här knuffade de dessutom ner rättningen på en egen rad i den smala
        fyrkolumnsvyn — ⚡ hamnade ensam ovanför W/L/P/V.
      */}
      {!card ? (
        <>
          <SettleSourceIcon bet={bet} />
          {live ? (
            <span
              className="size-1.5 shrink-0 animate-sbpulse rounded-full bg-cyan"
              title="Matchen pågår"
              aria-hidden
            />
          ) : null}
        </>
      ) : null}
      {canEdit ? (
        <span
          role="group"
          aria-label="Rättning"
          className={cn(
            "flex",
            card
              ? // Ett sammanhållet segmentreglage i stället för fyra lösa
                // bokstäver: samma höjd (32px) som ikonknapparna bredvid.
                "min-w-0 flex-1 items-center gap-px rounded-[9px] border border-line bg-panel-2 p-[3px]"
              : "gap-1"
          )}
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
                    ? "flex h-6 min-w-0 flex-1 items-center justify-center rounded-[6px] text-[11.5px]"
                    // Tabellens rättningskolumn är smal: chipsen måste rymmas
                    // på samma rad som ⚡ även vid sheet-brytpunkten.
                    : "rounded-[6px] px-[7px] py-[5px] text-[11.5px]",
                  active
                    ? `${tone.bg} ${tone.fg} ${tone.border}`
                    : cn(
                        "border-transparent text-faint hover:text-text",
                        card && "hover:bg-[rgba(230,234,242,0.06)]"
                      ),
                  waiting && "animate-sbshimmer"
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
