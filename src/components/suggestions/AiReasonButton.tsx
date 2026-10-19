"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/components/TextsProvider";
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
  const t = useT();
  // Samma gräns som DAILY_AI_LIMIT i lib/ai-reason (server-only).
  const limitText = t("forslag.ai.limitReached", { limit: 10 });

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
        toast(json.error || limitText);
        return;
      }
      if (!res.ok || !json.reason) {
        toast(t("forslag.ai.failed"));
        return;
      }
      onGenerated(json.reason);
    } catch {
      toast(t("forslag.ai.failed"));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        className="flex h-[30px] items-center gap-1 px-2"
        role="status"
        aria-label={t("forslag.ai.loadingAria")}
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
        limitReached ? limitText : t("forslag.ai.buttonTitle")
      }
      className={cn(
        "inline-flex h-[30px] items-center gap-1.5 rounded-[var(--radius-btn-sm)] border px-2.5 text-[12px] font-semibold transition-colors",
        limitReached
          ? "cursor-not-allowed border-line text-faint opacity-60"
          : "border-cyan/35 text-cyan hover:bg-cyan/10"
      )}
    >
      <Sparkles className="size-3.5" strokeWidth={2.25} />
      {t("forslag.ai.button")}
    </button>
  );
}

function AiReasonText({ reason }: { reason: string }) {
  const t = useT();
  return (
    <div className="animate-sbfade rounded-[var(--radius-btn-sm)] bg-panel-2 px-2.5 py-2">
      <Badge tone="yellow">{t("forslag.ai.badge")}</Badge>
      <p className="mt-1.5 text-[13px] leading-snug text-muted">{reason}</p>
    </div>
  );
}
