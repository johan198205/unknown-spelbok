"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  markFixturesSynced,
  settleQueuedBet,
  type ManualRow,
} from "@/lib/admin/settle";
import { formatPick } from "@/lib/picks";
import { cn } from "@/lib/utils";

const ACTIONS: {
  key: "win" | "loss" | "void";
  label: string;
  className: string;
}[] = [
  { key: "win", label: "W", className: "border-win/40 text-win" },
  { key: "loss", label: "L", className: "border-loss/40 text-loss" },
  { key: "void", label: "Void", className: "border-line-strong text-muted" },
];

export function ManualSettleRows({ rows }: { rows: ManualRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!rows.length) {
    return (
      <div className="px-[18px] py-8 text-center text-[13.5px] text-dim">
        Inget väntar på manuell hantering. Alla spel har rättats automatiskt.
      </div>
    );
  }

  return (
    <>
      {error ? (
        <div className="border-b border-rowline bg-loss/10 px-[18px] py-2.5 text-[13px] text-loss-text">
          {error}
        </div>
      ) : null}
      {rows.map((row) => (
        <div
          key={row.queueId}
          className={cn(
            "flex min-w-[1000px] items-center gap-3 border-b border-rowline px-[18px] py-3.5 transition-colors hover:bg-hover",
            busy === row.queueId && pending && "opacity-50"
          )}
        >
          <span className="w-[130px] shrink-0 truncate text-[13.5px]">
            {row.user}
          </span>
          <span className="min-w-0 flex-[1.2] truncate text-[13.5px]">
            {row.match}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">
            {formatPick(row.pick)}
          </span>
          <span className="font-mono-num w-[70px] shrink-0 text-right text-[13px]">
            {row.odds.toFixed(2)}
          </span>
          <span className="font-mono-num w-[90px] shrink-0 text-right text-[13px]">
            {row.stake.toLocaleString("sv-SE")} kr
          </span>
          <span className="w-[150px] shrink-0">
            <span className="rounded-[6px] bg-amber/15 px-2 py-1 text-[10.5px] font-bold tracking-[0.07em] text-amber">
              {row.reasonLabel}
            </span>
          </span>
          <span className="flex w-[150px] shrink-0 justify-end gap-1.5">
            {ACTIONS.map((action) => (
              <button
                key={action.key}
                type="button"
                disabled={pending}
                onClick={() => {
                  setBusy(row.queueId);
                  setError(null);
                  startTransition(async () => {
                    try {
                      await settleQueuedBet(row.queueId, row.betId, action.key);
                      router.refresh();
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Kunde inte rätta spelet"
                      );
                    } finally {
                      setBusy(null);
                    }
                  });
                }}
                className={cn(
                  "font-mono-num rounded-[7px] border bg-transparent px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors hover:bg-hover2 disabled:opacity-40",
                  action.className
                )}
              >
                {action.label}
              </button>
            ))}
          </span>
        </div>
      ))}
    </>
  );
}

export function SyncFixturesButton({
  league,
  className,
}: {
  league?: string;
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "syncing" | "error">("idle");

  return (
    <button
      type="button"
      disabled={state === "syncing"}
      onClick={async () => {
        setState("syncing");
        try {
          const res = await fetch("/api/admin/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job: "sync-fixtures" }),
          });
          if (!res.ok) throw new Error(String(res.status));
          await markFixturesSynced(league);
          setState("idle");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
      className={cn(
        "whitespace-nowrap rounded-lg border border-line-strong bg-panel-2 px-[13px] py-[7px] text-[12.5px] font-semibold text-text transition-colors hover:bg-hover2 disabled:opacity-50",
        state === "error" && "border-loss/40 text-loss",
        className
      )}
    >
      {state === "syncing"
        ? "Synkar…"
        : state === "error"
          ? "Försök igen"
          : "Synka nu"}
    </button>
  );
}