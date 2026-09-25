"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DisplayModeToggle } from "@/components/layout/DisplayModeToggle";
import { FormattedAmount } from "@/components/FormattedAmount";
import { createClient } from "@/lib/supabase/client";
import { cn, initialOf, nettoColor } from "@/lib/utils";

export type MobileMenuUser = {
  username: string;
  avatarUrl: string | null;
  netto: number;
  isAdmin: boolean;
};

const LOGGED_IN_LINKS = [
  { href: "/hem", label: "Hem" },
  { href: "/spelbok", label: "Spreadsheets" },
  { href: "/topplista", label: "Topplista" },
  { href: "/installningar", label: "Profil" },
];

const LOGGED_OUT_LINKS = [
  { href: "/kuponger", label: "Kuponger" },
  { href: "/topplista", label: "Topplista" },
  { href: "/spelbolag", label: "Spelbolag" },
  { href: "/om-oss", label: "Om oss" },
];

/**
 * Hamburgermenyn längst till höger i mobilheadern. Finns i både utloggat och
 * inloggat läge; innehållet skiljer sig. Valet mellan SEK och Units bor här i
 * stället för i headern. Stängs vid klick utanför, Escape och sidbyte.
 */
export function MobileMenu({ user }: { user: MobileMenuUser | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState(pathname);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onLogout() {
    await createClient().auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const links = user ? LOGGED_IN_LINKS : LOGGED_OUT_LINKS;

  return (
    <div ref={ref} className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Stäng menyn" : "Öppna menyn"}
        className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-line-strong bg-transparent text-text"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          {open ? (
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      {open ? (
        <div className="absolute inset-x-3 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[14px] border border-line-strong bg-panel shadow-[0_18px_48px_rgba(0,0,0,.55)]">
          {user ? (
            <div className="flex items-center gap-3 border-b border-line-soft px-4 py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-panel-2 font-display font-semibold text-text">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initialOf(user.username)
                )}
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-text">
                  {user.username}
                </div>
                <div
                  className={cn(
                    "font-mono-num text-[13px]",
                    nettoColor(user.netto),
                  )}
                >
                  <FormattedAmount value={user.netto} /> totalt
                </div>
              </div>
            </div>
          ) : null}

          <nav aria-label="Meny" className="flex flex-col p-1.5">
            {links.map((l) => {
              const active =
                pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-[9px] px-3 py-3 text-[15px] font-semibold text-text no-underline hover:bg-hover hover:text-text hover:no-underline",
                    active && "bg-panel-2",
                  )}
                >
                  {l.label}
                  <span aria-hidden className="text-faint">
                    ›
                  </span>
                </Link>
              );
            })}
            {user?.isAdmin ? (
              <Link
                href="/admin/anvandare"
                className="flex items-center justify-between rounded-[9px] px-3 py-3 text-[15px] font-semibold text-yellow no-underline hover:bg-hover hover:text-yellow hover:no-underline"
              >
                Admin
                <span aria-hidden className="text-faint">
                  ›
                </span>
              </Link>
            ) : null}
          </nav>

          {user ? (
            <>
              <div className="mx-3 mb-3 rounded-[10px] border border-line-soft p-3">
                <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
                  Visa belopp i
                </div>
                <DisplayModeToggle variant="menu" />
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="w-full border-t border-line-soft px-4 py-3.5 text-left text-[15px] font-semibold text-loss hover:bg-hover"
              >
                Logga ut
              </button>
            </>
          ) : (
            <div className="flex gap-2 border-t border-line-soft p-3">
              <Link
                href="/login"
                className="flex-1 rounded-[var(--radius-btn-sm)] bg-win py-2.5 text-center text-[14px] font-bold text-win-ink no-underline hover:text-win-ink hover:no-underline"
              >
                Logga in
              </Link>
              <Link
                href="/registrera"
                className="flex-1 rounded-[var(--radius-btn-sm)] border border-line-strong py-2.5 text-center text-[14px] font-semibold text-text no-underline hover:text-text hover:no-underline"
              >
                Skapa konto
              </Link>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-line-soft px-4 py-3 text-[13px]">
            <span className="rounded-[5px] border border-line-strong px-1.5 py-0.5 font-display font-semibold text-muted">
              18+
            </span>
            <a
              href="https://www.stodlinjen.se"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan no-underline hover:no-underline"
            >
              Stödlinjen
            </a>
            <a
              href="https://www.spelpaus.se"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan no-underline hover:no-underline"
            >
              Spelpaus
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
