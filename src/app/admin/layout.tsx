import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/anvandare", label: "Användare" },
  { href: "/admin/spelbolag", label: "Spelbolag" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/sidor", label: "Sidor" },
  { href: "/admin/tavlingar", label: "Tävlingar" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-1 gap-6 px-5 py-6">
      <aside className="w-[200px] shrink-0">
        <div className="font-display mb-4 text-lg font-bold tracking-[0.12em]">
          ADMIN
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold text-muted no-underline hover:bg-panel-2 hover:text-text"
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/spelbok"
            className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-cyan no-underline"
          >
            ← Tillbaka
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
