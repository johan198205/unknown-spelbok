"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function IconBooks({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4.5A1.5 1.5 0 0 1 6.5 3H11v18H6.5A1.5 1.5 0 0 1 5 19.5v-15Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M13 3h4.5A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5H13V3Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        opacity={filled ? 0.7 : 1}
      />
    </svg>
  );
}

function IconBoard({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 19V11M12 19V5M19 19v-7"
        stroke="currentColor"
        strokeWidth={filled ? 2.4 : 1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlanket({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4V5.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBank({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.5 9 12 4l8.5 5h-17Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M6 11.5v6M10 11.5v6M14 11.5v6M18 11.5v6M4 20.5h16"
        stroke="currentColor"
        strokeWidth={filled ? 2.2 : 1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS = [
  {
    href: "/spelbok",
    label: "Böcker",
    match: (p: string) => p.startsWith("/spelbok"),
    Icon: IconBooks,
  },
  {
    href: "/planket",
    label: "Planket",
    match: (p: string) => p.startsWith("/planket"),
    Icon: IconPlanket,
  },
  {
    href: "/topplista",
    label: "Topplista",
    match: (p: string) =>
      p.startsWith("/topplista") || p.startsWith("/tavlingar"),
    Icon: IconBoard,
  },
  {
    href: "/spelbolag",
    label: "Spelbolag",
    match: (p: string) => p.startsWith("/spelbolag"),
    Icon: IconBank,
  },
] as const;

type Tab = (typeof TABS)[number];

/**
 * Måste sitta inuti <Link> för att useLinkStatus ska se navigeringen. Fliken
 * färgas direkt vid tryck så det syns att klicket gick fram, även innan
 * servern hunnit svara.
 */
function TabBody({ tab, active }: { tab: Tab; active: boolean }) {
  const { pending } = useLinkStatus();
  const lit = active || pending;

  return (
    <span
      className={cn(
        "flex flex-col items-center gap-1 transition-colors duration-100",
        lit ? "text-win" : "text-faint",
        pending && !active ? "opacity-70" : null,
      )}
    >
      <tab.Icon filled={lit} />
      {tab.label}
    </span>
  );
}

function NavTab({ tab, pathname }: { tab: Tab; pathname: string }) {
  const active = tab.match(pathname);

  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className="flex flex-col items-center gap-1 py-1 text-[10.5px] font-semibold no-underline active:scale-95 transition-transform duration-100"
    >
      <TabBody tab={tab} active={active} />
    </Link>
  );
}

export function BottomNav({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname() || "";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[rgba(15,20,32,.94)] pb-[max(22px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-[14px] lg:hidden"
      aria-label="Huvudnavigering"
    >
      {/*
        Fem kolumner med plusknappen exakt i mitten: Böcker, Planket, [+],
        Topplista, Spelbolag. Startsidan nås via loggan och profilen via
        profilbilden i headern.
      */}
      <div className="grid grid-cols-5 items-end px-1">
        {TABS.slice(0, 2).map((tab) => (
          <NavTab key={tab.href} tab={tab} pathname={pathname} />
        ))}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Lägg nytt spel"
            className="-mt-[26px] flex h-14 w-14 items-center justify-center rounded-full border-4 border-bg-soft bg-win text-win-ink shadow-[0_8px_22px_rgba(102,227,138,.3)]"
          >
            {/* SVG i stället för "+"-tecknet, som typsnittet placerar för lågt. */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 4v16M4 12h16"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {TABS.slice(2).map((tab) => (
          <NavTab key={tab.href} tab={tab} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
