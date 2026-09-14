import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { AdSlot } from "@/components/ui/AdSlot";
import { Badge, Panel } from "@/components/ui/Panel";
import { fetchSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";
import { computeStats, formatMoney, formatRoi, nettoColor } from "@/lib/utils";
import type { Bet } from "@/lib/types";

export default async function LandingPage() {
  const supabase = await createClient();
  const site = await fetchSiteSettings(supabase);

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

  const steps = [
    {
      no: "01",
      title: "Skapa ett spreadsheet",
      body: "En bok per strategi. Sätt startbankroll, välj om den ska vara publik och börja logga.",
      img: "/img/sa-funkar-det/skapa-spreadsheet.png",
      alt: "Formuläret för nytt spreadsheet med namn, startbankroll och publik-val.",
    },
    {
      no: "02",
      title: "Bokför varje spel",
      body: "Match, tipp, odds, insats och resultat. Filtrera på liga, spelbolag eller oddsintervall.",
      img: "/img/sa-funkar-det/bokfor-spel.png",
      alt: "Spellistan med datum, liga, match, tipp, odds, resultat och netto per rad.",
    },
    {
      no: "03",
      title: "Läs av sanningen",
      body: "Netto, ROI och hitrate räknas om direkt. Jämför dig i topplistorna.",
      img: "/img/sa-funkar-det/statistik.png",
      alt: "Statistikvyn med netto, ROI, hitrate och grafen över ackumulerat netto.",
    },
  ];

  return (
    <div className="animate-sbfade">
      <section className="mx-auto grid max-w-[1180px] items-center gap-14 px-7 pb-6 pt-16 md:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] uppercase tracking-[0.08em] text-muted">
            <span className="h-[7px] w-[7px] rounded-full bg-cyan animate-sbpulse" />
            Live bokföring
          </div>
          <h1 className="font-display mb-4 text-[42px] font-bold leading-[1.02] tracking-[-0.01em] md:text-[58px]">
            TA KONTROLL ÖVER
            <br />
            DITT SPELANDE.
          </h1>
          <p className="mb-7 max-w-[520px] text-lg leading-relaxed text-muted">
            Bokför varje spel, se din riktiga ROI och sluta gissa. Jämför dig med
            andra i topplistorna där bara siffrorna talar.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/registrera" size="lg">
              Börja bokföra gratis
            </ButtonLink>
            <ButtonLink href="/topplista" variant="secondary" size="lg">
              Se ett publikt spreadsheet
            </ButtonLink>
          </div>
        </div>

        {/* Statisk mockup — inte live data. Byts mot riktiga assets när design
            är beslutad (public/mockups/spreadsheet-{desktop,mobile}.svg). */}
        <div>
          <Image
            src="/mockups/spreadsheet-desktop.svg"
            alt="Mockup av ett spreadsheet i Spelbok med netto, ROI, hitrate och bokförda spel."
            width={1200}
            height={800}
            unoptimized
            priority
            className="hidden w-full rounded-[var(--radius-panel)] border border-line shadow-[0_24px_60px_rgba(0,0,0,.45)] md:block"
          />
          <Image
            src="/mockups/spreadsheet-mobile.svg"
            alt="Mockup av Spelbok i mobilen med netto, ROI och bokförda spel som kort."
            width={430}
            height={860}
            unoptimized
            priority
            className="mx-auto w-full max-w-[320px] rounded-[var(--radius-panel)] border border-line shadow-[0_24px_60px_rgba(0,0,0,.45)] md:hidden"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-7 pt-16">
        <h2 className="font-display mb-1.5 text-[34px] font-semibold">
          Så funkar det
        </h2>
        <p className="mb-7 max-w-[560px] text-muted">
          Tre steg från utspridda skärmdumpar och minneslappar till en bok som
          visar exakt var pengarna kommer ifrån.
        </p>
        <div className="grid gap-[18px] md:grid-cols-3">
          {steps.map((s) => (
            <Panel key={s.no} className="overflow-hidden">
              <div className="relative h-[150px] border-b border-line-soft bg-bg-soft">
                <Image
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
                Topplistan just nu
              </div>
              <div className="text-[13px] text-muted">
                Publika spreadsheets rankade på ROI
              </div>
            </div>
            <ButtonLink href="/topplista" variant="secondary" size="sm">
              Se hela listan
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

        {/* Annonsytan flyttad från sidokolumnen till fullbredd under listan —
            formaten matchar övriga sidor så samma HTML-banners kan återanvändas. */}
        <AdSlot
          format="970x90"
          placement="home"
          className="mt-6 hidden h-[90px] lg:flex"
        />
        <AdSlot
          format="320x100"
          placement="home"
          className="mt-6 h-[100px] lg:hidden"
        />
      </section>

      <section className="mx-auto max-w-[1180px] px-7 py-16">
        <Panel className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-display mb-2 text-[32px] font-semibold">
              Börja bokföra idag
            </h2>
            <p className="max-w-[520px] text-muted">
              Gratis konto, obegränsat antal spreadsheets och full statistik från
              första spelet.
            </p>
          </div>
          <ButtonLink href="/registrera" size="lg">
            Skapa konto
          </ButtonLink>
        </Panel>
      </section>
    </div>
  );
}
