"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { deletePost, reportPost } from "@/lib/planket-actions";
import { REPORT_REASONS, postUrl, type PlanketPost } from "@/lib/planket";
import { cn } from "@/lib/utils";

/**
 * ···-menyn på ett inlägg.
 *
 * Anmäl och Kopiera länk för alla, Redigera och Ta bort bara för
 * författaren. Radering är soft delete på servern — knappen heter
 * "Ta bort" men raden ligger kvar så reaktioner och ryggningar behåller
 * sin referens.
 */
export function PostMenu({
  post,
  onEdit,
  onDeleted,
}: {
  post: PlanketPost;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setReporting(false);
  }

  async function copyLink() {
    close();
    try {
      await navigator.clipboard.writeText(postUrl(post.id));
      toast("Länken är kopierad.");
    } catch {
      toast("Kunde inte kopiera länken.");
    }
  }

  async function submitReport(reason: string) {
    setBusy(true);
    const result = await reportPost(post.id, reason);
    setBusy(false);
    close();
    toast(
      result.ok
        ? "Tack — anmälan är skickad till redaktionen."
        : result.error
    );
  }

  async function remove() {
    if (!window.confirm("Ta bort inlägget?")) return;
    setBusy(true);
    const result = await deletePost(post.id);
    setBusy(false);
    close();
    if (result.ok) {
      onDeleted();
      toast("Inlägget är borttaget.");
    } else {
      toast(result.error);
    }
  }

  const item =
    "block w-full cursor-pointer border-none bg-transparent px-3.5 py-2.5 text-left text-[13.5px] text-[#C3CBDB] hover:bg-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Fler val"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "cursor-pointer border-none bg-transparent px-1.5 py-0.5 text-[17px] leading-none",
          open ? "text-[#C3CBDB]" : "text-[#5D6883] hover:text-[#C3CBDB]"
        )}
      >
        ···
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-[210px] overflow-hidden rounded-[10px] border border-line-strong bg-panel py-1 shadow-[var(--shadow-dropdown)]"
        >
          {reporting ? (
            <>
              <div className="px-3.5 py-2 text-[11px] uppercase tracking-[0.12em] text-[#5D6883]">
                Anledning
              </div>
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.key}
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className={item}
                  onClick={() => void submitReport(reason.key)}
                >
                  {reason.label}
                </button>
              ))}
            </>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={() => setReporting(true)}
              >
                Anmäl
              </button>
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={() => void copyLink()}
              >
                Kopiera länk
              </button>
              {post.isAuthor ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className={item}
                    onClick={() => {
                      close();
                      onEdit();
                    }}
                  >
                    Redigera
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    className={cn(item, "text-loss hover:text-loss")}
                    onClick={() => void remove()}
                  >
                    Ta bort
                  </button>
                </>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
