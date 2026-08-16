"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search as SearchIcon } from "lucide-react";
import {
  adminGlobalSearch,
  type AdminSearchGroups,
  type AdminSearchHit,
} from "@/lib/admin/search";
import { cn, initialOf } from "@/lib/utils";

const TITLES: Record<string, string> = {
  "/admin": "Översikt",
  "/admin/anvandare": "Användare",
  "/admin/spelbolag": "Spelbolag",
  "/admin/banners": "Banners",
  "/admin/sidor": "Sidor",
  "/admin/tavlingar": "Tävlingar",
  "/admin/statistik": "Statistik",
  "/admin/sattling": "Sättling och matchdata",
  "/admin/installningar": "Inställningar",
};

function titleFor(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/admin/sidor/")) return "Redigera sida";
  for (const [href, title] of Object.entries(TITLES)) {
    if (href !== "/admin" && pathname.startsWith(href)) return title;
  }
  return "Admin";
}

const GROUP_LABEL: Record<keyof AdminSearchGroups, string> = {
  profiles: "Användare",
  bookmakers: "Spelbolag",
  pages: "Sidor",
};

export function AdminTopbar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<AdminSearchGroups | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setGroups(null);
      return;
    }
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const res = await adminGlobalSearch(q);
        setGroups(res);
        setOpen(true);
      });
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const hasHits =
    groups &&
    (groups.profiles.length > 0 ||
      groups.bookmakers.length > 0 ||
      groups.pages.length > 0);

  return (
    <header className="sticky top-0 z-40 flex items-center gap-5 border-b border-line bg-bar-bg px-7 py-3.5 backdrop-blur-[12px]">
      <div className="min-w-0">
        <h1 className="font-display whitespace-nowrap text-[22px] font-semibold uppercase tracking-[0.05em]">
          {titleFor(pathname)}
        </h1>
      </div>

      <div ref={rootRef} className="relative max-w-[440px] flex-1">
        <SearchIcon
          className="pointer-events-none absolute left-[13px] top-1/2 size-[13px] -translate-y-1/2 text-dim"
          strokeWidth={2.5}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (hasHits) setOpen(true);
          }}
          placeholder="Sök användare, spelbolag, sidor …"
          className="w-full rounded-[10px] border border-line bg-panel py-2.5 pl-9 pr-3.5 text-[14px] text-text outline-none placeholder:text-dim focus:border-line-hover"
        />
        {open && query.trim().length >= 2 ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-auto rounded-[11px] border border-line-strong bg-panel-elevated shadow-[0_18px_50px_rgba(0,0,0,.55)]">
            {pending && !groups ? (
              <div className="px-4 py-3 text-[13px] text-dim">Söker…</div>
            ) : null}
            {groups && !hasHits ? (
              <div className="px-4 py-3 text-[13px] text-dim">
                Inga träffar för “{query.trim()}”.
              </div>
            ) : null}
            {groups
              ? (Object.keys(GROUP_LABEL) as (keyof AdminSearchGroups)[]).map(
                  (key) => {
                    const hits = groups[key];
                    if (!hits.length) return null;
                    return (
                      <div key={key}>
                        <div className="px-3.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">
                          {GROUP_LABEL[key]}
                        </div>
                        {hits.map((hit) => (
                          <SearchResult
                            key={hit.id}
                            hit={hit}
                            onPick={() => {
                              setOpen(false);
                              setQuery("");
                            }}
                          />
                        ))}
                      </div>
                    );
                  }
                )
              : null}
          </div>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-3.5">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-[38px] rounded-full border border-line-strong object-cover"
          />
        ) : (
          <span className="font-display flex size-[38px] items-center justify-center rounded-full border border-line-strong bg-panel-2 font-semibold">
            {initialOf(username)}
          </span>
        )}
      </div>
    </header>
  );
}

function SearchResult({
  hit,
  onPick,
}: {
  hit: AdminSearchHit;
  onPick: () => void;
}) {
  return (
    <Link
      href={hit.href}
      onClick={onPick}
      className={cn(
        "flex items-center gap-2 px-3.5 py-2 no-underline transition hover:bg-hover2"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold text-text">
          {hit.label}
        </div>
        {hit.detail ? (
          <div className="font-mono-num truncate text-[11.5px] text-dim">
            {hit.detail}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
