"use client";

import { useState, useTransition } from "react";
import {
  banAuthor,
  hidePost,
  keepPost,
  type ReportedPost,
} from "@/lib/admin/planket";
import {
  PLANKET_AUTOHIDE_REPORTS,
  reportReasonLabel,
} from "@/lib/planket";
import { cn } from "@/lib/utils";

/**
 * Anmälda inlägg. Tre åtgärder per rad: Behåll, Dölj och Stäng av
 * författaren. Alla tre stänger anmälningarna så raden lämnar kön —
 * en åtgärd som lämnar kvar ärendet är ingen åtgärd.
 */
export function PlanketAdmin({ rows }: { rows: ReportedPost[] }) {
  const [items, setItems] = useState(rows);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, postId: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Åtgärden misslyckades.");
        return;
      }
      setItems((prev) => prev.filter((row) => row.post_id !== postId));
    });
  }

  if (!items.length) {
    return (
      <div className="rounded-[14px] border border-line bg-panel px-6 py-12 text-center text-muted">
        Inga anmälda inlägg.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-[13px] text-loss">{error}</p> : null}

      {items.map((row) => (
        <article
          key={row.post_id}
          className="rounded-[14px] border border-line bg-panel p-4"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-semibold">
              {row.author_username}
            </span>
            {row.author_banned ? (
              <span className="rounded-[6px] bg-loss/15 px-2 py-[3px] text-[11px] font-semibold text-loss">
                Avstängd
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-[6px] px-2 py-[3px] font-mono-num text-[11.5px] font-semibold",
                row.report_count >= PLANKET_AUTOHIDE_REPORTS
                  ? "bg-loss/15 text-loss"
                  : "bg-panel-2 text-muted"
              )}
            >
              {row.report_count} anmälningar
            </span>
            {row.hidden_at ? (
              <span className="rounded-[6px] bg-yellow/15 px-2 py-[3px] text-[11px] font-semibold text-yellow">
                Dold
              </span>
            ) : null}
            {row.deleted_at ? (
              <span className="rounded-[6px] bg-panel-2 px-2 py-[3px] text-[11px] font-semibold text-muted">
                Borttagen av författaren
              </span>
            ) : null}
            <span className="ml-auto text-[12px] text-faint">
              {new Date(row.last_reported_at).toLocaleString("sv-SE")}
            </span>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            {row.reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-[6px] border border-line-strong px-2 py-[3px] text-[11.5px] text-muted"
              >
                {reportReasonLabel(reason)}
              </span>
            ))}
          </div>

          <p className="mb-3 whitespace-pre-wrap rounded-[10px] border border-line-soft bg-bg-soft p-3 text-[14px] leading-[1.6] text-text-soft">
            {row.body || <span className="text-faint">(inlägg utan text)</span>}
            {row.attachment_type !== "none" ? (
              <span className="mt-2 block text-[12.5px] text-faint">
                Bilaga: {row.attachment_type === "bet" ? "spel" : "kupong"}
              </span>
            ) : null}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => keepPost(row.post_id), row.post_id)}
              className="cursor-pointer rounded-[9px] border border-line-strong bg-panel-2 px-4 py-2 text-[13.5px] font-semibold text-text disabled:opacity-50"
            >
              Behåll
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => hidePost(row.post_id), row.post_id)}
              className="cursor-pointer rounded-[9px] border border-yellow/40 bg-yellow/15 px-4 py-2 text-[13.5px] font-semibold text-yellow disabled:opacity-50"
            >
              Dölj
            </button>
            <button
              type="button"
              disabled={pending || row.author_banned}
              onClick={() =>
                run(() => banAuthor(row.post_id, row.author_id), row.post_id)
              }
              className="cursor-pointer rounded-[9px] border border-loss/40 bg-loss/15 px-4 py-2 text-[13.5px] font-semibold text-loss disabled:opacity-50"
            >
              Stäng av författaren
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
