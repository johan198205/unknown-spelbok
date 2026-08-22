"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function IconHome({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function IconProfile({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="9"
        r="3.5"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 19.5c1.6-3.2 4-4.5 7-4.5s5.4 1.3 7 4.5"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS = [
  { href: "/hem", label: "Hem", match: (p: string) => p === "/hem", Icon: IconHome },
  {
    href: "/spelbok",
    label: "Böcker",
    match: (p: string) => p.startsWith("/spelbok") || p.startsWith("/statistik"),
    Icon: IconBooks,
  },
  {
    href: "/topplista",
    label: "Topplista",
    match: (p: string) =>
      p.startsWith("/topplista") || p.startsWith("/tavlingar"),
    Icon: IconBoard,
  },
  {
    href: "/installningar",
    label: "Profil",
    match: (p: string) => p.startsWith("/installningar"),
    Icon: IconProfile,
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
        pending && !active ? "opacity-70" : null
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
      <div className="grid grid-cols-5 items-end px-1">
        {TABS.slice(0, 2).map((tab) => (
          <NavTab key={tab.href} tab={tab} pathname={pathname} />
        ))}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Lägg nytt spel"
            className="-mt-[26px] flex h-14 w-14 items-center justify-center rounded-full border-4 border-bg-soft bg-win text-[28px] font-bold leading-none text-win-ink shadow-[0_8px_22px_rgba(102,227,138,.3)]"
          >
            +
          </button>
        </div>

        {TABS.slice(2).map((tab) => (
          <NavTab key={tab.href} tab={tab} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
