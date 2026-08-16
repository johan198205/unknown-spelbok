"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPage,
  deletePage,
  duplicatePage,
  publishPage,
  type PageListRow,
} from "@/lib/admin/pages";
import { cn } from "@/lib/utils";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

export function PagesAdmin({ rows, q }: { rows: PageListRow[]; q: string }) {
  const router = useRouter();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<PageListRow | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onDoc() {
      setMenuId(null);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function open(id: string) {
    router.push(`/admin/sidor/${id}`);
  }

  return (
    <div className="animate-[admfade_.22s_ease]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const next = String(fd.get("q") || "").trim();
            router.push(next ? `/admin/sidor?q=${encodeURIComponent(next)}` : "/admin/sidor");
          }}
          className="flex-1"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Sök sida …"
            className="w-full max-w-[320px] rounded-[10px] border border-line bg-panel px-3.5 py-2.5 text-[14px] outline-none placeholder:text-dim"
          />
        </form>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => createPage())}
          className="ml-auto rounded-[11px] bg-win px-5 py-3 font-bold text-win-ink disabled:opacity-60"
        >
          + Ny sida
        </button>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-line bg-panel">
        <div className="flex min-w-[860px] gap-3 border-b border-line bg-bg-soft px-[18px] py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span className="flex-[1.3]">Titel</span>
          <span className="flex-[1.4]">Slug</span>
          <span className="w-[120px] shrink-0">Status</span>
          <span className="w-[130px] shrink-0">Författare</span>
          <span className="w-[120px] shrink-0">Uppdaterad</span>
          <span className="w-[34px] shrink-0" />
        </div>

        {rows.map((p) => (
          <div
            key={p.id}
            className="relative flex min-w-[860px] items-center gap-3 border-b border-rowline px-[18px] py-3.5 transition-[background] duration-100 hover:bg-hover"
          >
            <button
              type="button"
              onClick={() => open(p.id)}
              className="min-w-0 flex-[1.3] truncate border-0 bg-transparent p-0 text-left font-semibold text-text"
            >
              {p.title}
            </button>
            <span className="font-mono-num min-w-0 flex-[1.4] truncate text-[12.5px] text-muted">
              /{p.slug}
            </span>
            <span className="w-[120px] shrink-0">
              <span
                className={cn(
                  "rounded-[6px] px-[9px] py-1 text-[10.5px] font-bold tracking-[0.09em]",
                  p.published
                    ? "bg-win/15 text-win"
                    : "bg-panel-2 text-muted"
                )}
              >
                {p.published ? "PUBLICERAD" : "UTKAST"}
              </span>
            </span>
            <span className="w-[130px] shrink-0 truncate text-[13.5px] text-text-soft">
              {p.author}
            </span>
            <span className="font-mono-num w-[120px] shrink-0 text-[12.5px] text-muted">
              {fmtDate(p.updated_at)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuId(menuId === p.id ? null : p.id);
              }}
              className="h-[30px] w-[34px] shrink-0 rounded-lg border border-line bg-transparent text-[14px] leading-none text-muted"
            >
              ⋯
            </button>

            {menuId === p.id ? (
              <div
                className="absolute right-[18px] top-11 z-30 min-w-[190px] rounded-[11px] border border-line-strong bg-panel-elevated p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.55)]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="w-full rounded-[7px] px-[11px] py-[9px] text-left text-[13.5px] font-semibold hover:bg-hover2"
                  onClick={() => open(p.id)}
                >
                  Redigera
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="w-full rounded-[7px] px-[11px] py-[9px] text-left text-[13.5px] font-semibold hover:bg-hover2"
                  onClick={() => {
                    setMenuId(null);
                    startTransition(async () => {
                      const copy = await duplicatePage(p.id);
                      router.push(`/admin/sidor/${copy.id}`);
                    });
                  }}
                >
                  Duplicera
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="w-full rounded-[7px] px-[11px] py-[9px] text-left text-[13.5px] font-semibold hover:bg-hover2"
                  onClick={() => {
                    setMenuId(null);
                    startTransition(async () => {
                      await publishPage(p.id, !p.published);
                      router.refresh();
                    });
                  }}
                >
                  {p.published ? "Avpublicera" : "Publicera"}
                </button>
                <button
                  type="button"
                  className="w-full rounded-[7px] px-[11px] py-[9px] text-left text-[13.5px] font-semibold text-loss hover:bg-hover2"
                  onClick={() => {
                    setMenuId(null);
                    setConfirmRow(p);
                  }}
                >
                  Radera
                </button>
              </div>
            ) : null}
          </div>
        ))}

        {!rows.length ? (
          <div className="px-[18px] py-10 text-center text-muted">
            {q ? "Inga sidor matchar sökningen." : "Inga sidor ännu."}
          </div>
        ) : null}
      </div>

      {confirmRow ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(5,7,12,.7)] p-4">
          <div className="w-full max-w-md rounded-[14px] border border-line bg-panel p-5 shadow-[0_40px_90px_rgba(0,0,0,.65)]">
            <div className="font-display text-[18px] font-semibold uppercase tracking-[0.05em]">
              Radera sida?
            </div>
            <p className="mt-2 text-[14px] text-muted">
              {confirmRow.title} · /{confirmRow.slug}. Det går inte att ångra.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const id = confirmRow.id;
                  startTransition(async () => {
                    await deletePage(id);
                    setConfirmRow(null);
                    router.refresh();
                  });
                }}
                className="rounded-[9px] bg-loss px-4 py-2.5 text-[13.5px] font-bold text-[#1A0508] disabled:opacity-60"
              >
                Ja, radera
              </button>
              <button
                type="button"
                onClick={() => setConfirmRow(null)}
                className="rounded-[9px] border border-line-strong bg-panel-2 px-4 py-2.5 font-semibold text-text-soft"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
