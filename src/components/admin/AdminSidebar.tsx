"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn, initialOf } from "@/lib/utils";

const NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/admin", label: "Översikt", icon: LayoutDashboard },
  { href: "/admin/anvandare", label: "Användare", icon: Users },
  { href: "/admin/spelbolag", label: "Spelbolag", icon: Building2 },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/sidor", label: "Sidor", icon: FileText },
  { href: "/admin/tavlingar", label: "Tävlingar", icon: Trophy },
  { href: "/admin/statistik", label: "Statistik", icon: BarChart3 },
  { href: "/admin/sattling", label: "Sättling", icon: CheckCircle2 },
  { href: "/admin/installningar", label: "Inställningar", icon: Settings },
];

export function AdminSidebar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="flex items-center gap-[9px] border-b border-line-soft px-5 pb-[18px] pt-[22px]">
        <span className="font-display text-[19px] font-bold tracking-[0.16em]">
          SPELBOK
        </span>
        <span className="rounded-[5px] bg-yellow/15 px-[7px] py-[3px] text-[9.5px] font-bold tracking-[0.12em] text-yellow">
          ADMIN
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-5 pt-2.5">
        {NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mb-0.5 flex w-full items-center gap-[11px] rounded-r-[9px] border-l-[3px] px-[13px] py-[11px] text-left text-[14.5px] font-semibold no-underline transition-[background] duration-150",
                active
                  ? "border-win bg-hover text-text"
                  : "border-transparent text-muted hover:bg-hover hover:text-text"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-win" : "text-muted"
                )}
                strokeWidth={active ? 2.25 : 2}
              />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line-soft px-4 py-3.5">
        <div className="mb-2.5 flex items-center gap-2.5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="size-[34px] rounded-full border border-line-strong object-cover"
            />
          ) : (
            <span className="font-display flex size-[34px] items-center justify-center rounded-full border border-line-strong bg-panel-2 font-semibold">
              {initialOf(username)}
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold">
              {username}
            </div>
            <div className="text-[11.5px] text-dim">Superadmin</div>
          </div>
        </div>
        <Link
          href="/spelbok"
          className="block rounded-[9px] border border-line bg-panel px-[9px] py-[9px] text-center text-[13px] font-semibold text-text-soft no-underline hover:text-text"
        >
          Till appen ↗
        </Link>
      </div>
    </aside>
  );
}
