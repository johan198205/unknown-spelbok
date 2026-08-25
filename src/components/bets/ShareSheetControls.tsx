"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, CopyCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { randomSheetSlug, sheetShareUrl } from "@/lib/sheet-slug";
import { cn } from "@/lib/utils";

export function ShareSheetButton({
  slug,
  className,
  variant = "secondary",
  size = "sm",
}: {
  slug: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = sheetShareUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Länk kopierad");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Kunde inte kopiera länken");
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => void share()}
      className={cn("gap-1.5", className)}
    >
      {copied ? (
        <CopyCheck className="size-3.5" strokeWidth={2.25} />
      ) : (
        <Copy className="size-3.5" strokeWidth={2.25} />
      )}
      Dela
    </Button>
  );
}

export function FollowSheetButtonStub({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled
      title="Kommer snart"
      className={cn("opacity-50", className)}
    >
      Följ
    </Button>
  );
}

/**
 * Publik/privat som en klickbar badge direkt efter spelbokens namn.
 *
 * Ersätter det egna kortet "Publik spelbok" — ett helt kort för en kryssruta
 * var mest tom yta, och statusen hör hemma vid namnet.
 */
export function SheetVisibilityBadge({
  sheetId,
  isPublic,
  slug,
  canEdit,
}: {
  sheetId: string;
  isPublic: boolean;
  slug: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const value = optimistic ?? isPublic;

  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          value ? "bg-win" : "bg-faint"
        )}
      />
      {value ? "Publik" : "Privat"}
    </>
  );

  const className = cn(
    "inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] px-[7px] py-[3px] text-[9.5px] font-semibold uppercase tracking-[0.1em]",
    value
      ? "bg-[var(--badge-pub-bg)] text-win"
      : "bg-[var(--badge-priv-bg)] text-muted"
  );

  if (!canEdit) {
    return <span className={className}>{body}</span>;
  }

  async function toggle() {
    const next = !value;
    setBusy(true);
    setOptimistic(next);
    const supabase = createClient();

    const patch: { is_public: boolean; slug?: string } = { is_public: next };
    if (next && !slug) patch.slug = randomSheetSlug();

    const { error } = await supabase
      .from("sheets")
      .update(patch)
      .eq("id", sheetId);

    setBusy(false);
    if (error) {
      setOptimistic(!next);
      toast(error.message || "Kunde inte uppdatera");
      return;
    }
    setOptimistic(null);
    toast(next ? "Spelboken är publik" : "Spelboken är privat");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      title={
        value
          ? "Synlig för alla med länken. Klicka för att göra privat."
          : "Endast du kan se spelboken. Klicka för att göra publik."
      }
      className={cn(className, "cursor-pointer transition hover:brightness-125")}
    >
      {body}
    </button>
  );
}

export function SheetPublicToggle({
  sheetId,
  isPublic,
  slug,
}: {
  sheetId: string;
  isPublic: boolean;
  slug: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const value = optimistic ?? isPublic;

  async function onToggle(next: boolean) {
    setBusy(true);
    setOptimistic(next);
    const supabase = createClient();

    const patch: { is_public: boolean; slug?: string } = { is_public: next };
    if (next && !slug) {
      patch.slug = randomSheetSlug();
    }

    const { error } = await supabase
      .from("sheets")
      .update(patch)
      .eq("id", sheetId);

    setBusy(false);
    if (error) {
      setOptimistic(!next);
      toast(error.message || "Kunde inte uppdatera");
      return;
    }
    setOptimistic(null);
    router.refresh();
  }

  return (
    <div className="rounded-[10px] border border-line bg-panel-2/60 px-3.5 py-3">
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={value}
          disabled={busy}
          onChange={(e) => void onToggle(e.target.checked)}
          className="accent-win mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          <span className="block text-[14px] font-semibold text-text">
            Publik spelbok
          </span>
          {value ? (
            <span className="mt-0.5 block text-[12.5px] text-muted">
              Din spelbok blir synlig för alla och kan delas via länk.
            </span>
          ) : (
            <span className="mt-0.5 block text-[12.5px] text-muted">
              Endast du kan se spelboken.
            </span>
          )}
        </span>
      </label>
    </div>
  );
}
