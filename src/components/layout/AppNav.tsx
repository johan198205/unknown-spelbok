"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Sitter inuti <Link> så useLinkStatus ser navigeringen. Länken markeras direkt
 * vid klick — annars ser desktop-navet dött ut tills servern svarat.
 */
function NavItemBody({ label, active }: { label: string; active: boolean }) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={cn(
        "block rounded-[8px] px-3.5 py-2 transition-colors duration-100",
        active || pending
          ? "bg-[#1B2436] text-[#E6EAF2]"
          : "bg-transparent text-[#8A94AB] group-hover:bg-[#1B2436] group-hover:text-[#E6EAF2]"
      )}
    >
      {label}
    </span>
  );
}

export function AppNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 gap-0.5 overflow-x-auto sb-scroll">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="group whitespace-nowrap text-[14px] font-semibold no-underline hover:no-underline"
          >
            <NavItemBody label={item.label} active={active} />
          </Link>
        );
      })}
    </nav>
  );
}
