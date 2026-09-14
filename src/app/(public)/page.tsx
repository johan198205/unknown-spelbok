import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Panel } from "@/components/ui/Panel";
import { fetchLandingPage } from "@/lib/landing-content.server";
import { fetchSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { computeStats, formatMoney, formatRoi, nettoColor } from "@/lib/utils";
import type { Bet } from "@/lib/types";
import type { Metadata } from "next";

function LandingImage({
  src,
  alt,
  fill,
  priority,
  sizes,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const remote = /^https?:\/\//i.test(src);
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      priority={priority}
      sizes={sizes}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      unoptimized={remote}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const landing = await fetchLandingPage();
  return {
    title: landing.seoTitle || undefined,
    description: landing.seoDescription || undefined,
  };
}

export default async function LandingPage() {
  const supabase = await createClient();
  const site = await fetchSiteSettings(supabase);
  const landing = await fetchLandingPage();

  const [{ data: publicSheets }, { data: competitions }] = await Promise.all([
    supabase
      .from("sheets")
      .select("id, name, user_id, profiles(username), bets(stake, payout, result, odds)")
      .eq("is_public", true)
      .limit(20),
    supabase
      .from("competitions")
      .select("*, competition_entries(count)")
      .eq("active", true)
      .order("starts_at", { ascending: false })
      .limit(1),
  ]);

  const board = (publicSheets || [])
    .map((sheet) => {
      const bets = (sheet.bets || []) as Bet[];
      const stats = computeStats(bets);
      const owner =
        (sheet.profiles as unknown as { username: string } | null)?.username ||
        "Okänd";
      return {
        id: sheet.id,
        name: sheet.name,
        owner,
        ...stats,
      };
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  const comp = site.competitions_enabled ? competitions?.[0] : undefined;

  return (
    <div className="animate-sbfade">
      <section className="mx-auto grid max-w-[1240px] items-center gap-10 px-7 pb-6 pt-16 md:grid-cols-[0.95fr_1.15fr] md:gap-6 lg:gap-10">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] uppercase tracking-[0.08em] text-muted">
            <span className="h-[7px] w-[7px] rounded-full bg-cyan animate-sbpulse" />
            {landing.hero.badge}
          </div>
          <h1 className="font-display mb-4 whitespace-pre-line text-[42px] font-bold leading-[1.02] tracking-[-0.01em] md:text-[58px]">
            {landing.title}
          </h1>
          <p className="mb-7 max-w-[520px] text-lg leading-relaxed text-muted">
            {landing.hero.body}
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={landing.hero.primaryCta.href} size="lg">
              {landing.hero.primaryCta.label}
            </ButtonLink>
            <ButtonLink
              href={landing.hero.secondaryCta.href}
              variant="secondary"
              size="lg"
            >
              {landing.hero.secondaryCta.label}
            </ButtonLink>
          </div>
        </div>

        <div className="relative md:-mr-4 lg:-mr-8 xl:-mr-12">
          <LandingImage
            src={landing.hero.image}
            alt={landing.hero.imageAlt}
            width={979}
            height={624}
            priority
            sizes="(min-width: 768px) 640px, 100vw"
            className="mx-auto w-full max-w-[640px] object-contain drop-shadow-[0_28px_50px_rgba(0,0,0,.35)] md:max-w-none md:scale-[1.08] md:origin-center lg:scale-[1.14]"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-7 pt-16">
        <h2 className="font-display mb-1.5 text-[34px] font-semibold">
          {landing.howItWorks.title}
        </h2>
        <p className="mb-7 max-w-[560px] text-muted">
          {landing.howItWorks.body}
        </p>
        <div className="grid gap-[18px] md:grid-cols-3">
          {landing.howItWorks.steps.map((s) => (
            <Panel key={s.no} className="overflow-hidden">
              <div className="relative h-[150px] border-b border-line-soft bg-bg-soft">
                <LandingImage
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 768px) 380px, 100vw"
                  className="object-cover object-top"
                />
              </div>
              <div className="p-[18px]">
                <div className="font-display mb-1.5 text-[13px] tracking-[0.14em] text-win">
                  {s.no}
                </div>
                <div className="font-display mb-1.5 text-xl font-semibold">
                  {s.title}
                </div>
                <div className="text-[14.5px] leading-relaxed text-muted">
                  {s.body}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-7 pt-16">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-4">
            <div>
              <div className="font-display text-xl font-semibold">
                {landing.leaderboard.title}
              </div>
              <div className="text-[13px] text-muted">
                {landing.leaderboard.body}
              </div>
            </div>
            <ButtonLink
              href={landing.leaderboard.ctaHref}
              variant="secondary"
              size="sm"
            >
              {landing.leaderboard.ctaLabel}
            </ButtonLink>
          </div>
          {board.length ? (
            board.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-3 border-b border-[#171E2C] px-[18px] py-3"
              >
                <span className="font-display w-[26px] text-lg font-semibold text-muted">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-[12.5px] text-muted">
                    {r.owner} · {r.bets} spel · hitrate {r.hitrate.toFixed(0)}%
                  </div>
                </div>
                <span
                  className={`font-display min-w-[72px] text-right text-[19px] font-semibold ${nettoColor(r.roi)}`}
                >
                  {formatRoi(r.roi)}
                </span>
                <span
                  className={`min-w-[96px] text-right font-mono-num font-semibold ${nettoColor(r.netto)}`}
                >
                  {formatMoney(r.netto)}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-10 text-center text-muted">
              Inga publika spreadsheets ännu.
            </div>
          )}
        </Panel>

        {site.competitions_enabled ? (
          <Panel className="mt-6 p-[18px]">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="font-display text-[19px] font-semibold">
                {comp?.name || "Ingen tävling just nu"}
              </div>
              {comp ? <Badge tone="cyan">Pågår</Badge> : null}
            </div>
            <div className="mb-3 text-sm leading-relaxed text-muted">
              {comp?.description ||
                "Admin kan skapa tävlingar under Admin → Tävlingar."}
            </div>
            {comp ? (
              <div className="font-mono-num text-[12.5px] text-faint">
                {new Date(comp.starts_at).toLocaleDateString("sv-SE")} –{" "}
                {new Date(comp.ends_at).toLocaleDateString("sv-SE")}
              </div>
            ) : null}
          </Panel>
        ) : null}
      </section>

      <section className="mx-auto max-w-[1180px] px-7 py-16">
        <Panel className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-display mb-2 text-[32px] font-semibold">
              {landing.cta.title}
            </h2>
            <p className="max-w-[520px] text-muted">{landing.cta.body}</p>
          </div>
          <ButtonLink href={landing.cta.buttonHref} size="lg">
            {landing.cta.buttonLabel}
          </ButtonLink>
        </Panel>
      </section>
    </div>
  );
}
