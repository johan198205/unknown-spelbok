"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import type { DailySuggestion } from "@/lib/suggestions";
import { cn } from "@/lib/utils";

/**
 * "AI-analys" på ett förslagskort (Nivå 2).
 *
 * Genererar bara på klick — aldrig vid sidladdning. Redan genererad text
 * visas direkt utan knapp. AI-badgen följer alltid med texten så det
 * framgår att den är maskinskriven; den är en del av ansvarsgränsen, inte
 * en dekoration.
 */
export function AiReasonButton({
  suggestion,
  onGenerated,
}: {
  suggestion: DailySuggestion;
  onGenerated: (reason: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const { toast } = useToast();

  if (suggestion.ai_reason) {
    return <AiReasonText reason={suggestion.ai_reason} />;
  }

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/suggestions/${suggestion.id}/ai-reason`, {
        method: "POST",
      });
      const json = (await res.json()) as { reason?: string; error?: string };

      if (res.status === 429) {
        setLimitReached(true);
        toast(json.error || "Dagens AI-analyser är slut (10/dag)");
        return;
      }
      if (!res.ok || !json.reason) {
        toast("Kunde inte generera just nu");
        return;
      }
      onGenerated(json.reason);
    } catch {
      toast("Kunde inte generera just nu");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        className="flex h-[30px] items-center gap-1 px-2"
        role="status"
        aria-label="Genererar AI-analys"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={generate}
      disabled={limitReached}
      title={
        limitReached
          ? "Dagens AI-analyser är slut (10/dag)"
          : "Kort motivering av varför matchen passar din historik"
      }
      className={cn(
        "inline-flex h-[30px] items-center gap-1.5 rounded-[var(--radius-btn-sm)] border px-2.5 text-[12px] font-semibold transition-colors",
        limitReached
          ? "cursor-not-allowed border-line text-faint opacity-60"
          : "border-cyan/35 text-cyan hover:bg-cyan/10"
      )}
    >
      <Sparkles className="size-3.5" strokeWidth={2.25} />
      AI-analys
    </button>
  );
}

function AiReasonText({ reason }: { reason: string }) {
  return (
    <div className="animate-sbfade rounded-[var(--radius-btn-sm)] bg-panel-2 px-2.5 py-2">
      <Badge tone="yellow">AI</Badge>
      <p className="mt-1.5 text-[13px] leading-snug text-muted">{reason}</p>
    </div>
  );
}
