import Link from "next/link";
import { AppNav } from "@/components/layout/AppNav";
import { PublicNav } from "@/components/layout/PublicNav";
import { DisplayModeToggle } from "@/components/layout/DisplayModeToggle";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getProfile } from "@/lib/auth";
import { FormattedAmount } from "@/components/FormattedAmount";
import { getUnreadNotificationCount } from "@/lib/notifications-server";
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
      0,
    );
  }

  const site = await fetchSiteSettings(supabase);
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
                  <FormattedAmount value={netto} />
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
 * Footerns kolumner. Om oss och Kontakt ska alltid finnas med. Övriga sidor
 * ligger i CMS:et (`pages` → route `/[slug]`), så titeln hämtas därifrån när
 * sidan är publicerad och faller annars tillbaka på standardetiketten.
 * CMS-sidor markerade `show_in_footer` som inte redan finns här hamnar under
 * Hjälp.
 */
const FOOTER_COLUMNS = [
  {
    title: "Spelbok",
    links: [
      { href: "/kuponger", label: "Kuponger" },
      { href: "/topplista", label: "Topplista" },
      { href: "/spelbolag", label: "Spelbolag" },
      { href: "/om-oss", label: "Om oss" },
    ],
  },
  {
    title: "Hjälp",
    links: [
      { href: "/sa-fungerar-spelbok", label: "Så fungerar Spelbok" },
      { href: "/faq", label: "FAQ" },
      { href: "/kontakt", label: "Kontakt" },
    ],
  },
  {
    title: "Juridiskt",
    links: [
      { href: "/integritetspolicy", label: "Integritetspolicy" },
      { href: "/anvandarvillkor", label: "Användarvillkor" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export async function SiteFooter() {
  const supabase = await createClient();
  const { data: pages } = await supabase
    .from("pages")
    .select("slug, title, show_in_footer")
    .eq("published", true)
    .order("title");

  const published = pages ?? [];
  const known = new Set(
    FOOTER_COLUMNS.flatMap((c) => c.links.map((l) => l.href)),
  );
  const columns = FOOTER_COLUMNS.map((col) => ({
    title: col.title,
    links: col.links.map((l) => ({
      href: l.href,
      label:
        published.find((row) => `/${row.slug}` === l.href)?.title || l.label,
    })),
  }));
  columns[1].links.push(
    ...published
      .filter((p) => p.show_in_footer && !known.has(`/${p.slug}`))
      .map((p) => ({ href: `/${p.slug}`, label: p.title })),
  );
  const legal = columns[2].links;

  return (
    <footer className="mt-auto border-t border-line-soft bg-bg-footer text-[13.5px]">
      <div className="mx-auto max-w-[1360px] px-5">
        <div className="grid gap-10 py-12 md:grid-cols-[1.3fr_3fr]">
          <div className="max-w-[360px]">
            <Link
              href="/"
              title="Till startsidan"
              className="inline-flex items-center gap-3 text-text no-underline hover:text-text hover:no-underline"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-line-strong bg-panel font-display text-[14px] font-bold">
                S
              </span>
              <span className="font-display text-[20px] font-bold tracking-[0.14em]">
                SPELBOK
              </span>
            </Link>
            <p className="mt-4 leading-relaxed text-faint">
              Spelbok är ett verktyg för bokföring och statistik av dina
              bettingspel. Följ din ROI, jämför dig i topplistan. Inga spel
              förmedlas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
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
          <span title="18+ · Spela ansvarsfullt" className="flex items-center">
            <AgeMark />
          </span>
          <ExternalMark
            href="https://www.stodlinjen.se"
            label="Stödlinjen – för spelare och anhöriga"
          >
            <StodlinjenMark />
          </ExternalMark>
          <ExternalMark
            href="https://www.spelpaus.se"
            label="Spelpaus – stäng av dig från spel"
          >
            <SpelpausMark />
          </ExternalMark>
          <ExternalMark
            href="https://www.spelinspektionen.se"
            label="Spelinspektionen"
          >
            <SpelinspektionenMark />
          </ExternalMark>
        </div>

        <div className="flex flex-col gap-3 border-t border-line-soft py-6 text-[12px] text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Spelbok</span>
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

function AgeMark() {
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
        SPELA
      </text>
      <text x="36" y="23" fontSize="9" fontWeight="800" fill="currentColor">
        ANSVARSFULLT
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
