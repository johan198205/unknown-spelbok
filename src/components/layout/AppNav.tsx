"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
            className={cn(
              "whitespace-nowrap rounded-[8px] px-3.5 py-2 text-[14px] font-semibold no-underline transition hover:no-underline",
              active
                ? "bg-[#1B2436] text-[#E6EAF2] hover:text-[#E6EAF2]"
                : "bg-transparent text-[#8A94AB] hover:bg-[#1B2436] hover:text-[#E6EAF2]"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
