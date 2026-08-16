import Link from "next/link";
import { AppNav } from "@/components/layout/AppNav";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, initialOf } from "@/lib/utils";

export async function SiteHeader({
  variant = "public",
}: {
  variant?: "public" | "app";
}) {
  const profile = await getProfile();
  const supabase = await createClient();

  let netto = 0;
  if (profile) {
    const { data: bets } = await supabase
      .from("bets")
      .select("stake, payout, result")
      .eq("user_id", profile.id)
      .neq("result", "open");
    netto = (bets || []).reduce(
      (sum, b) => sum + Number(b.payout) - Number(b.stake),
      0
    );
  }

  const appNav = [
    { href: "/hem", label: "Hem" },
    { href: "/spelbok", label: "Spelbok" },
    { href: "/statistik", label: "Statistik" },
    { href: "/tavlingar", label: "Tävlingar" },
    { href: "/topplista", label: "Topplistor" },
    { href: "/installningar", label: "Profil" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-[rgba(11,14,20,.92)] backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-[1360px] items-center gap-[22px] px-5 py-3">
        <Link
          href={profile ? "/hem" : "/"}
          title="Till startsidan"
          className="font-display text-[19px] font-bold tracking-[0.14em] text-text no-underline hover:text-text hover:no-underline"
        >
          SPELBOK
        </Link>

        {variant === "app" && profile ? (
          <AppNav items={appNav} />
        ) : (
          <div className="flex flex-1 items-center gap-0.5 overflow-x-auto sb-scroll">
            <Link
              href="/topplista"
              className="whitespace-nowrap rounded-[var(--radius-btn-sm)] px-3.5 py-2 text-[14px] font-semibold text-muted no-underline hover:bg-panel-2 hover:text-text hover:no-underline"
            >
              Topplista
            </Link>
            <Link
              href="/spelbolag"
              className="whitespace-nowrap rounded-[var(--radius-btn-sm)] px-3.5 py-2 text-[14px] font-semibold text-muted no-underline hover:bg-panel-2 hover:text-text hover:no-underline"
            >
              Spelbolag
            </Link>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2.5">
          {profile ? (
            <>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-text">
                  {profile.username}
                </div>
                {/* Mockup: netto i header är muted mono, inte grön/röd */}
                <div className="font-mono-num text-xs text-muted">
                  {formatMoney(netto)}
                </div>
              </div>
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line-strong bg-panel-2 font-display font-semibold text-text">
                {initialOf(profile.username)}
              </div>
              {profile.role === "admin" ? (
                <Link
                  href="/admin/anvandare"
                  className="rounded-[var(--radius-btn-sm)] px-3 py-1.5 text-[13px] font-semibold text-yellow no-underline hover:bg-yellow/10 hover:text-yellow hover:no-underline"
                >
                  Admin
                </Link>
              ) : null}
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-[var(--radius-btn-sm)] bg-win px-[15px] py-[9px] text-[13.5px] font-bold text-win-ink no-underline hover:text-win-ink hover:no-underline hover:brightness-105"
            >
              Logga in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const supabase = await createClient();
  const { data: footerPages } = await supabase
    .from("pages")
    .select("slug, title")
    .eq("published", true)
    .eq("show_in_footer", true)
    .order("title");

  return (
    <footer className="mt-auto border-t border-line-soft bg-bg-footer">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-4 px-5 py-[22px] text-[13px] text-faint">
        <span className="font-display text-sm font-bold tracking-[0.14em] text-muted">
          SPELBOK
        </span>
        <span className="rounded-[6px] border border-line-strong px-2 py-[3px] font-display font-semibold text-muted">
          18+
        </span>
        <span className="font-semibold text-muted">Spela ansvarsfullt</span>
        {/* Mockup: footer-länkar är vanliga a → #4C8DFF */}
        <a href="https://stodlinjen.se" target="_blank" rel="noopener noreferrer">
          Stödlinjen
        </a>
        <a href="https://spelpaus.se" target="_blank" rel="noopener noreferrer">
          Spelpaus
        </a>
        {(footerPages ?? []).map((p) => (
          <Link key={p.slug} href={`/${p.slug}`}>
            {p.title}
          </Link>
        ))}
        <span className="ml-auto text-faint">
          Spelbok är ett verktyg för bokföring och statistik. Inga spel
          förmedlas.
        </span>
      </div>
    </footer>
  );
}
