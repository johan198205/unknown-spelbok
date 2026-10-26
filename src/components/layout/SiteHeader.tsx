import Link from "next/link";
import { Emblem, Logo } from "@/components/brand/Logo";
import { AppNav } from "@/components/layout/AppNav";
import { PublicNav } from "@/components/layout/PublicNav";
import { DisplayModeToggle } from "@/components/layout/DisplayModeToggle";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { MobileMenu } from "@/components/layout/MobileMenu";
import type { NavIconKey } from "@/components/layout/NavIcon";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getProfile } from "@/lib/auth";
import { FormattedAmount } from "@/components/FormattedAmount";
import { getUnreadNotificationCount } from "@/lib/notifications-server";
import { fetchSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import type { TextKey } from "@/lib/texts";
import { getT } from "@/lib/texts/server";
import { initialOf, nettoColor } from "@/lib/utils";

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
      0,
    );
  }

  const site = await fetchSiteSettings(supabase);
  const unread = profile ? await getUnreadNotificationCount() : 0;
  const t = await getT();

  // Hem nås via loggan och profilen via namnet/avataren uppe till höger.
  // Kuponger är avstängd tills vidare (FEATURES.coupons).
  const appNav: { href: string; label: string; icon: NavIconKey }[] = [
    { href: "/spelbok", label: t("header.nav.spreadsheet"), icon: "spelbok" },
    { href: "/planket", label: t("header.nav.planket"), icon: "planket" },
    ...(site.competitions_enabled
      ? [
          {
            href: "/tavlingar",
            label: t("header.nav.tavlingar"),
            icon: "tavlingar" as const,
          },
        ]
      : []),
    { href: "/topplista", label: t("header.nav.topplistor"), icon: "topplista" },
    { href: "/spelbolag", label: t("header.nav.spelbolag"), icon: "spelbolag" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-[rgba(0,0,0,.86)] pt-[env(safe-area-inset-top)] backdrop-blur-[10px]">
      <div className="mx-auto flex min-w-0 max-w-[1360px] items-center gap-3 px-4 py-3 lg:gap-[22px] lg:px-5">
        <Link
          href={profile ? "/hem" : "/"}
          title={t("header.brandTitle")}
          className="flex shrink-0 items-center text-text no-underline hover:text-text hover:no-underline"
        >
          <Logo title={t("header.brand")} className="h-[22px] w-auto lg:h-6" />
        </Link>

        {/* I mobil ersätts menyraden av hamburgermenyn längst till höger. */}
        <div className="hidden min-w-0 flex-1 lg:flex">
          {variant === "app" && profile ? (
            <AppNav items={appNav} />
          ) : (
            <PublicNav />
          )}
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 lg:gap-2.5">
          {profile ? (
            <>
              <span
                className={`min-w-0 truncate font-mono-num text-[13px] font-semibold lg:hidden ${nettoColor(netto)}`}
              >
                <FormattedAmount value={netto} />
              </span>
              <DisplayModeToggle className="hidden lg:flex" />
              {/* Namn och avatar är vägen till profilen — ingen egen menyflik. */}
              <Link
                href="/installningar"
                title={t("header.profile.title")}
                className="hidden text-right no-underline hover:no-underline lg:block"
              >
                <div className="text-sm font-semibold text-text hover:underline">
                  {profile.username}
                </div>
                {/* Samma färg som i mobilen: grönt plus, rött minus. */}
                <div className={`font-mono-num text-xs ${nettoColor(netto)}`}>
                  <FormattedAmount value={netto} />
                </div>
              </Link>
              {/* Mobil: saldo → profilbild → notisklocka → meny. */}
              <Link
                href="/installningar"
                aria-label={t("header.profile.title")}
                title={t("header.profile.title")}
                className="shrink-0 no-underline hover:no-underline max-lg:order-1"
              >
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
              </Link>
              <div className="max-lg:order-2">
                <NotificationBell userId={profile.id} initialUnread={unread} />
              </div>
              {profile.role === "admin" ? (
                <Link
                  href="/admin/anvandare"
                  className="hidden rounded-[var(--radius-btn-sm)] px-3 lg:block py-1.5 text-[13px] font-semibold text-yellow no-underline hover:bg-yellow/10 hover:text-yellow hover:no-underline"
                >
                  {t("header.admin")}
                </Link>
              ) : null}
              <div className="hidden lg:block">
                <SignOutButton />
              </div>
              <div className="max-lg:order-3">
                <MobileMenu
                  user={{
                    username: profile.username,
                    avatarUrl: profile.avatar_url,
                    netto,
                    isAdmin: profile.role === "admin",
                  }}
                />
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-[var(--radius-btn-sm)] bg-win px-[15px] py-[9px] text-[13.5px] font-bold text-win-ink no-underline hover:text-win-ink hover:no-underline hover:brightness-105"
            >
              {t("header.login")}
            </Link>
          )}
          {profile ? null : <MobileMenu user={null} />}
        </div>
      </div>
    </header>
  );
}

/**
 * Footerns kolumner. Länkar med `cms: true` ligger i CMS:et (`pages` → route
 * `/[slug]`) och visas bara när sidan är publicerad — annars ger de 404.
 * Övriga är egna routes och visas alltid. Titeln hämtas från CMS:et när det
 * finns en publicerad sida och faller annars tillbaka på standardetiketten.
 * CMS-sidor markerade `show_in_footer` som inte redan finns här hamnar under
 * Hjälp.
 */
const FOOTER_COLUMNS: {
  title: TextKey;
  links: { href: string; label: TextKey; cms?: boolean }[];
}[] = [
  {
    title: "header.footer.col.spelbok",
    links: [
      { href: "/planket", label: "header.footer.link.planket" },
      { href: "/topplista", label: "header.footer.link.topplista" },
      { href: "/spelbolag", label: "header.footer.link.spelbolag" },
      { href: "/om-oss", label: "header.footer.link.omOss" },
    ],
  },
  {
    title: "header.footer.col.hjalp",
    links: [
      {
        href: "/sa-fungerar-spelbok",
        label: "header.footer.link.saFungerar",
        cms: true,
      },
      { href: "/faq", label: "header.footer.link.faq", cms: true },
      { href: "/kontakt", label: "header.footer.link.kontakt" },
    ],
  },
  {
    title: "header.footer.col.juridiskt",
    links: [
      {
        href: "/integritetspolicy",
        label: "header.footer.link.integritet",
        cms: true,
      },
      {
        href: "/anvandarvillkor",
        label: "header.footer.link.villkor",
        cms: true,
      },
      { href: "/cookies", label: "header.footer.link.cookies", cms: true },
    ],
  },
];

export async function SiteFooter() {
  const supabase = await createClient();
  const [{ data: pages }, t] = await Promise.all([
    supabase
      .from("pages")
      .select("slug, title, show_in_footer")
      .eq("published", true)
      .order("title"),
    getT(),
  ]);

  const published = pages ?? [];
  const known = new Set(
    FOOTER_COLUMNS.flatMap((c) => c.links.map((l) => l.href)),
  );
  const columns = FOOTER_COLUMNS.map((col) => ({
    title: t(col.title),
    links: col.links.flatMap((l) => {
      const page = published.find((row) => `/${row.slug}` === l.href);
      if (l.cms && !page) return [];
      return [{ href: l.href, label: page?.title || t(l.label) }];
    }),
  }));
  columns[1].links.push(
    ...published
      .filter((p) => p.show_in_footer && !known.has(`/${p.slug}`))
      .map((p) => ({ href: `/${p.slug}`, label: p.title })),
  );
  const legal = columns[2].links;
  // En kolumn utan publicerade sidor ska inte stå kvar som tom rubrik.
  const visibleColumns = columns.filter((col) => col.links.length > 0);

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-line-soft bg-bg-footer text-[13.5px]">
      {/* Emblemet som stor, svag vattenstämpel i footerns hörn. */}
      <Emblem className="pointer-events-none absolute -bottom-16 -right-20 h-[300px] w-auto text-white opacity-[0.035]" />
      <div className="relative mx-auto max-w-[1360px] px-5">
        <div className="grid gap-10 py-12 md:grid-cols-[1.3fr_3fr]">
          <div className="max-w-[360px]">
            <Link
              href="/"
              title={t("header.brandTitle")}
              className="inline-flex items-center gap-3 text-text no-underline hover:text-text hover:no-underline"
            >
              <Logo title={t("header.brand")} className="h-7 w-auto" />
            </Link>
            <p className="mt-4 leading-relaxed text-faint">
              {t("header.footer.about")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {visibleColumns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <span className="mb-4 block text-[11px] font-semibold uppercase tracking-[0.25em] text-faint">
                  {col.title}
                </span>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="font-medium text-text no-underline hover:text-win hover:no-underline"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-y-4 border-t border-line-soft py-8 text-text [&>*]:px-6 sm:[&>*+*]:border-l sm:[&>*+*]:border-line-soft">
          <span
            title={t("header.footer.responsible.title")}
            className="flex items-center"
          >
            <AgeMark
              line1={t("header.footer.responsible.line1")}
              line2={t("header.footer.responsible.line2")}
            />
          </span>
          <ExternalMark
            href="https://www.stodlinjen.se"
            label={t("header.footer.stodlinjen")}
          >
            <StodlinjenMark />
          </ExternalMark>
          <ExternalMark
            href="https://www.spelpaus.se"
            label={t("header.footer.spelpaus")}
          >
            <SpelpausMark />
          </ExternalMark>
          <ExternalMark
            href="https://www.spelinspektionen.se"
            label={t("header.footer.spelinspektionen")}
          >
            <SpelinspektionenMark />
          </ExternalMark>
        </div>

        <div className="flex flex-col gap-3 border-t border-line-soft py-6 text-[12px] text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t("header.footer.copyright", { year: new Date().getFullYear() })}
          </span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {legal.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-faint no-underline hover:text-text hover:no-underline"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* Stödlinjen, Spelpaus och Spelinspektionen länkar ut till respektive sajt;
   18+-märket är bara en markering. Märkena är ritade som SVG i footerns egen
   färg så att de håller ihop mot den mörka bakgrunden. */
function ExternalMark({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex items-center text-text no-underline opacity-85 transition-opacity hover:text-text hover:no-underline hover:opacity-100"
    >
      {children}
    </a>
  );
}

function AgeMark({ line1, line2 }: { line1: string; line2: string }) {
  return (
    <svg width="116" height="30" viewBox="0 0 116 30" aria-hidden="true">
      <circle
        cx="13"
        cy="16"
        r="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <text
        x="13"
        y="20"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="currentColor"
      >
        18
      </text>
      <text x="23" y="8" fontSize="10" fontWeight="700" fill="currentColor">
        +
      </text>
      <text x="36" y="13" fontSize="9" fontWeight="800" fill="currentColor">
        {line1}
      </text>
      <text x="36" y="23" fontSize="9" fontWeight="800" fill="currentColor">
        {line2}
      </text>
    </svg>
  );
}

function StodlinjenMark() {
  return (
    <svg width="96" height="30" viewBox="0 0 96 30" aria-hidden="true">
      <text x="0" y="16" fontSize="17" fontWeight="600" fill="currentColor">
        Stödlinjen
      </text>
      <text x="0" y="27" fontSize="6.5" fill="currentColor" opacity="0.75">
        för spelare och anhöriga
      </text>
    </svg>
  );
}

function SpelpausMark() {
  return (
    <svg width="104" height="26" viewBox="0 0 104 26" aria-hidden="true">
      <circle cx="13" cy="13" r="12" fill="currentColor" />
      <rect
        x="8.5"
        y="7"
        width="3"
        height="12"
        rx="1"
        className="fill-bg-footer"
      />
      <rect
        x="14.5"
        y="7"
        width="3"
        height="12"
        rx="1"
        className="fill-bg-footer"
      />
      <text x="31" y="18.5" fontSize="16" fontWeight="500" fill="currentColor">
        Spelpaus
      </text>
    </svg>
  );
}

function SpelinspektionenMark() {
  return (
    <svg width="46" height="32" viewBox="0 0 46 32" aria-hidden="true">
      <rect x="0" y="0" width="22" height="11" fill="currentColor" />
      <rect x="4" y="10" width="28" height="11" fill="currentColor" />
      <rect x="10" y="20" width="36" height="11" fill="currentColor" />
      <g fontSize="7.5" fontWeight="700" className="fill-bg-footer">
        <text x="2" y="8.5">
          Spel
        </text>
        <text x="6" y="18.5">
          inspek
        </text>
        <text x="13" y="28.5">
          tionen
        </text>
      </g>
    </svg>
  );
}
