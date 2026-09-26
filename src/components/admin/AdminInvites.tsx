"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createAdminInvite,
  revokeAdminInvite,
  type AdminInviteRow,
} from "@/lib/admin/admin-auth";
import { cn } from "@/lib/utils";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

function statusOf(inv: AdminInviteRow) {
  if (inv.used_at) return { label: "Använd", tone: "text-win" };
  if (inv.revoked_at) return { label: "Återkallad", tone: "text-dim" };
  if (new Date(inv.expires_at).getTime() < Date.now())
    return { label: "Utgången", tone: "text-dim" };
  return { label: "Väntar", tone: "text-yellow" };
}

/**
 * Nya admininlogg skapas bara via inbjudan. Länken visas en gång — bara
 * dess hash sparas — så den kopieras här och skickas till personen.
 */
export function AdminInvites({ invites }: { invites: AdminInviteRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLink(null);
    setCopied(false);
    startTransition(async () => {
      const res = await createAdminInvite(email);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      const url = new URL("/admin/registrera", window.location.origin);
      url.searchParams.set("token", res.token);
      setLink(url.toString());
      setEmail("");
      router.refresh();
    });
  }

  async function onCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-8 rounded-[14px] border border-line bg-panel">
      <div className="border-b border-line px-[18px] py-3.5">
        <div className="font-semibold">Admininloggningar</div>
        <div className="mt-0.5 text-[13px] text-muted">
          Admin har ett eget inlogg på /admin/login. Bjud in någon så får hen en
          personlig länk för att skapa sitt konto. Länken gäller i 7 dagar och
          kan användas en gång.
        </div>
      </div>

      <div className="px-[18px] py-4">
        <form onSubmit={onCreate} className="flex flex-wrap gap-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-post till den nya admin"
            required
            className="w-[300px] max-w-full rounded-[10px] border border-line bg-bg-soft px-3.5 py-2.5 text-[14px] outline-none placeholder:text-dim"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] border border-transparent bg-win px-4 py-2.5 text-[14px] font-bold text-win-ink disabled:opacity-50"
          >
            {pending ? "Skapar…" : "Skapa inbjudan"}
          </button>
        </form>

        {error ? (
          <div className="mt-3 text-[13px] text-loss">{error}</div>
        ) : null}

        {link ? (
          <div className="mt-3.5 rounded-[10px] border border-[rgba(102,227,138,.35)] bg-win/10 px-3.5 py-3">
            <div className="mb-2 text-[13px] text-text-soft">
              Kopiera länken nu och skicka den till personen. Den visas inte
              igen.
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <code className="min-w-0 flex-1 break-all rounded-[8px] bg-bg-soft px-2.5 py-2 text-[12.5px]">
                {link}
              </code>
              <button
                type="button"
                onClick={onCopy}
                className="rounded-[9px] border border-line bg-panel px-3 py-2 text-[13px] font-semibold"
              >
                {copied ? "Kopierad" : "Kopiera"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {invites.length ? (
        <div className="border-t border-line">
          {invites.map((inv) => {
            const status = statusOf(inv);
            const open = status.label === "Väntar";
            return (
              <div
                key={inv.id}
                className="flex flex-wrap items-center gap-3 border-b border-rowline px-[18px] py-3 last:border-b-0"
              >
                <span className="min-w-[200px] flex-1 truncate">
                  {inv.email}
                </span>
                <span className="font-mono-num w-[110px] text-[12.5px] text-muted">
                  {fmtDate(inv.created_at)}
                </span>
                <span className={cn("w-[90px] text-[13px]", status.tone)}>
                  {status.label}
                </span>
                <span className="w-[90px] text-right">
                  {open ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await revokeAdminInvite(inv.id);
                          router.refresh();
                        })
                      }
                      className="text-[13px] text-muted hover:text-loss"
                    >
                      Återkalla
                    </button>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
