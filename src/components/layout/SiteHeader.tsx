import Link from "next/link";
import { AppNav } from "@/components/layout/AppNav";
import { PublicNav } from "@/components/layout/PublicNav";
import { DisplayModeToggle } from "@/components/layout/DisplayModeToggle";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getProfile } from "@/lib/auth";
import { getDisplayPrefs } from "@/lib/display-prefs";
import { getUnreadNotificationCount } from "@/lib/notifications-server";
import { formatAmount } from "@/lib/display";
import { fetchSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { initialOf } from "@/lib/utils";

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

  const site = await fetchSiteSettings(supabase);
  const prefs = await getDisplayPrefs();
  const unread = profile ? await getUnreadNotificationCount() : 0;

  const appNav = [
    { href: "/hem", label: "Hem" },
    { href: "/spelbok", label: "Spelbok" },
    { href: "/planket", label: "Planket" },
    { href: "/kuponger", label: "Kuponger" },
    ...(site.competitions_enabled
      ? [{ href: "/tavlingar", label: "Tävlingar" }]
      : []),
    { href: "/topplista", label: "Topplistor" },
    { href: "/spelbolag", label: "Spelbolag" },
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
          <PublicNav />
        )}

        <div className="ml-auto flex items-center gap-2.5">
          {profile ? (
            <>
              <DisplayModeToggle className="hidden sm:flex" />
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-text">
                  {profile.username}
                </div>
                {/* Mockup: netto i header är muted mono, inte grön/röd */}
                <div className="font-mono-num text-xs text-muted">
                  {formatAmount(netto, prefs)}
                </div>
              </div>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-[34px] w-[34px] rounded-full border border-line-strong object-cover"
                />
              ) : (
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line-strong bg-panel-2 font-display font-semibold text-text">
                  {initialOf(profile.username)}
                </div>
              )}
              <NotificationBell userId={profile.id} initialUnread={unread} />
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

/**
 * Om oss och Kontakt ska alltid finnas i footern. Sidorna ligger i CMS:et
 * (`pages` → route `/[slug]`), så titeln hämtas därifrån när den är publicerad
 * och faller annars tillbaka på slug + standardetikett.
 */
const REQUIRED_FOOTER_PAGES = [
  { slug: "om-oss", label: "Om oss" },
  { slug: "kontakt", label: "Kontakt" },
];

export async function SiteFooter() {
  const supabase = await createClient();
  const { data: pages } = await supabase
    .from("pages")
    .select("slug, title, show_in_footer")
    .eq("published", true)
    .order("title");

  const published = pages ?? [];
  const required = REQUIRED_FOOTER_PAGES.map((p) => ({
    slug: p.slug,
    title: published.find((row) => row.slug === p.slug)?.title || p.label,
  }));
  const extra = published
    .filter(
      (p) =>
        p.show_in_footer &&
        !REQUIRED_FOOTER_PAGES.some((r) => r.slug === p.slug)
    )
    .map((p) => ({ slug: p.slug, title: p.title }));
  const navPages = [...required, ...extra];

  return (
    <footer className="mt-auto border-t border-line-soft bg-bg-footer">
      <div className="mx-auto max-w-[1360px] px-5 py-7 text-[13px] text-faint">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/"
              title="Till startsidan"
              className="font-display text-[17px] font-bold tracking-[0.14em] text-text no-underline hover:text-text hover:no-underline"
            >
              SPELBOK
            </Link>
            <p className="mt-2 max-w-[320px] leading-relaxed text-faint">
              Spelbok är ett verktyg för bokföring och statistik. Inga spel
              förmedlas.
            </p>
          </div>

          <nav
            aria-label="Sidfot"
            className="flex flex-col gap-2 md:min-w-[160px]"
          >
            <span className="text-[11px] uppercase tracking-[0.14em] text-faint">
              Spelbok
            </span>
            {navPages.map((p) => (
              <Link key={p.slug} href={`/${p.slug}`}>
                {p.title}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2 md:min-w-[260px]">
            <span className="text-[11px] uppercase tracking-[0.14em] text-faint">
              Spela ansvarsfullt
            </span>
            <div className="flex items-center gap-2.5">
              <span className="rounded-[6px] border border-line-strong px-2 py-[3px] font-display font-semibold text-muted">
                18+
              </span>
              <span className="font-semibold text-muted">
                Spela ansvarsfullt
              </span>
            </div>
            {/* Mockup: footer-länkar är vanliga a → #4C8DFF */}
            <a
              href="https://www.stodlinjen.se"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stödlinjen — stöd vid spelproblem
            </a>
            <a
              href="https://www.spelpaus.se"
              target="_blank"
              rel="noopener noreferrer"
            >
              Spelpaus — stäng av dig från spel
            </a>
          </div>
        </div>

        <div className="mt-6 border-t border-line-soft pt-4 text-faint">
          © {new Date().getFullYear()} Spelbok
        </div>
      </div>
    </footer>
  );
}
