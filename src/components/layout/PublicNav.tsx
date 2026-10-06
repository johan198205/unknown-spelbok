"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, type NavIconKey } from "@/components/layout/NavIcon";
import { cn } from "@/lib/utils";

/** Kuponger är avstängd tills vidare (FEATURES.coupons). */
const ITEMS: { href: string; label: string; icon: NavIconKey }[] = [
  { href: "/topplista", label: "Topplista", icon: "topplista" },
  { href: "/spelbolag", label: "Spelbolag", icon: "spelbolag" },
  { href: "/om-oss", label: "Om oss", icon: "om-oss" },
];

/**
 * Publik header-nav. Aktiv sida får grön underkant — skilt från app-navets
 * panelbakgrund, så gäster ser samma signal som i designprototypen.
 */
export function PublicNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Huvudmeny"
      className="flex flex-1 items-center gap-0.5 overflow-x-auto sb-scroll"
    >
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap px-3.5 py-2 text-[14px] font-semibold no-underline hover:no-underline",
              active
                ? "border-b-2 border-win text-[#E6EAF2]"
                : "border-b-2 border-transparent text-muted hover:text-text"
            )}
          >
            <NavIcon
              name={item.icon}
              className={cn("size-4 shrink-0", active ? "text-win" : "text-[#5D6883]")}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
