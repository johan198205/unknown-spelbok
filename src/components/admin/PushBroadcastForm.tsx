"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const TITLE_MAX = 60;
const BODY_MAX = 160;

type SendResult = {
  sent: number;
  failed: number;
  removed: number;
};

export function PushBroadcastForm({
  initialCount,
}: {
  initialCount: number;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [count, setCount] = useState(initialCount);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    let subscriberCount = count;
    try {
      const countRes = await fetch("/api/admin/push");
      if (countRes.ok) {
        const data = (await countRes.json()) as { count?: number };
        subscriberCount = data.count ?? count;
        setCount(subscriberCount);
      }
    } catch {
      /* använd senast kända antal */
    }

    if (subscriberCount === 0) {
      setError("Det finns inga prenumeranter ännu.");
      return;
    }

    const confirmed = window.confirm(
      `Skicka notis till alla ${subscriberCount} prenumeranter?`
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || "/",
        }),
      });
      const data = (await res.json()) as SendResult & { error?: string };
      if (!res.ok) {
        setError(data.error || "Utskicket misslyckades.");
        return;
      }
      setResult(data);
      setCount((prev) => Math.max(0, prev - (data.removed ?? 0)));
    } catch {
      setError("Utskicket misslyckades.");
    } finally {
      setSending(false);
    }
  }

  const previewTitle = title.trim() || "Rubrik";
  const previewBody = body.trim() || "Meddelandet visas här";

  return (
    <form onSubmit={onSubmit} className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="rounded-[14px] border border-line bg-panel p-5">
        <div className="mb-1.5 font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
          Nytt utskick
        </div>
        <p className="mb-5 text-[13px] text-muted">
          Skickas till alla som aktiverat notiser. {count.toLocaleString("sv-SE")}{" "}
          {count === 1 ? "prenumerant" : "prenumeranter"} just nu.
        </p>
        {count === 0 ? (
          <div className="mb-5 rounded-[9px] border border-yellow/40 bg-yellow-soft px-3.5 py-3 text-[13.5px] text-yellow">
            Ingen har aktiverat notiser ännu. Gå till Inställningar i appen,
            klicka på “Aktivera notiser” och godkänn i webbläsaren — sedan går
            utskicket fram.
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <Input
              label="Rubrik"
              value={title}
              maxLength={TITLE_MAX}
              required
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ny tävling öppen"
            />
            <div className="mt-1 text-right font-mono-num text-[11.5px] text-dim">
              {title.length}/{TITLE_MAX}
            </div>
          </div>

          <div>
            <Textarea
              label="Meddelande"
              value={body}
              maxLength={BODY_MAX}
              required
              rows={4}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Gå med i augustitävlingen innan den stänger."
            />
            <div className="mt-1 text-right font-mono-num text-[11.5px] text-dim">
              {body.length}/{BODY_MAX}
            </div>
          </div>

          <Input
            label="Länk (valfri)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/tavlingar"
          />
          <p className="text-[12.5px] text-dim">
            Relativ sökväg i appen, t.ex. <span className="text-text-soft">/tavlingar</span>.
            Tom länk öppnar startsidan.
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-[9px] border border-loss/40 bg-loss/10 px-3 py-2 text-[13px] text-loss-text">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 rounded-[9px] border border-win/40 bg-win/10 px-3 py-2 text-[13.5px] text-win">
            Skickat till {result.sent}, misslyckades {result.failed}, rensade{" "}
            {result.removed} döda prenumerationer
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={sending}>
            {sending ? "Skickar…" : "Skicka"}
          </Button>
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-panel p-5">
        <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-dim">
          Förhandsvisning
        </div>
        <div
          className={cn(
            "rounded-[16px] border border-line-strong bg-panel-2 p-3.5 shadow-[0_18px_40px_rgba(0,0,0,.35)]"
          )}
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-bg">
              <Bell className="size-4 text-win" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Spelbok
                </span>
                <span className="font-mono-num text-[11px] text-dim">nu</span>
              </div>
              <div className="mt-0.5 truncate font-display text-[16px] font-semibold">
                {previewTitle}
              </div>
              <div className="mt-0.5 line-clamp-3 text-[13.5px] text-text-soft">
                {previewBody}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
