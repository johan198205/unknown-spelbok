import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { AdSlot } from "@/components/ui/AdSlot";
import { Badge, Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/server";
import {
  computeStats,
  formatMoney,
  formatRoi,
  initialOf,
  nettoColor,
} from "@/lib/utils";
import type { Bet } from "@/lib/types";

export default async function LandingPage() {
  const supabase = await createClient();

  const [
    { count: betsCount },
    { count: sheetsCount },
    { data: bookmakers },
    { data: publicSheets },
    { data: competitions },
  ] = await Promise.all([
    supabase.from("bets").select("*", { count: "exact", head: true }),
    supabase
      .from("sheets")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true),
    supabase
      .from("bookmakers")
      .select("name")
      .eq("active", true)
      .order("rank")
      .limit(8),
    supabase
      .from("sheets")
      .select("id, name, user_id, profiles(username), bets(stake, payout, result, odds, match, pick)")
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

  const top = board[0];
  const topBets = top
    ? ((publicSheets || []).find((s) => s.id === top.id)?.bets as Bet[]) || []
    : [];
  const recentRows = topBets
    .filter((b) => b.result !== "open")
    .slice(0, 5)
    .map((b) => {
      const netto = Number(b.payout) - Number(b.stake);
      return {
        match: b.match,
        pick: b.pick,
        odds: Number(b.odds).toFixed(2),
        netto: formatMoney(netto),
        color: netto >= 0 ? "#66E38A" : "#FF6B6B",
      };
    });

  const turnover = board.reduce((sum, s) => sum + s.stake, 0);
  const comp = competitions?.[0];

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
      body: "Netto, ROI och hitrate räknas om direkt. Jämför dig i topplistan och i tävlingar.",
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
            andra i topplistan och möt dem i tävlingar där bara siffrorna talar.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/registrera" size="lg">
              Börja bokföra gratis
            </ButtonLink>
            <ButtonLink href="/topplista" variant="secondary" size="lg">
              Se ett publikt spreadsheet
            </ButtonLink>
          </div>
          <div className="mt-9 flex gap-8">
            <div>
              <div className="font-display text-[30px] font-semibold tabular-nums">
                {(betsCount || 0).toLocaleString("sv-SE")}
              </div>
              <div className="text-[13px] text-muted">bokförda spel</div>
            </div>
            <div>
              <div className="font-display text-[30px] font-semibold tabular-nums">
                {(sheetsCount || 0).toLocaleString("sv-SE")}
              </div>
              <div className="text-[13px] text-muted">publika spreadsheets</div>
            </div>
            <div>
              <div className="font-display text-[30px] font-semibold tabular-nums">
                {formatMoney(turnover).replace("+", "")}
              </div>
              <div className="text-[13px] text-muted">omsättning</div>
            </div>
          </div>
        </div>

        <Panel className="p-[18px] shadow-[0_24px_60px_rgba(0,0,0,.45)]">
          <div className="mb-3.5 flex items-baseline justify-between">
            <div>
              <div className="font-display text-[19px] font-semibold">
                {top?.name || "Ingen publik bok ännu"}
              </div>
              <div className="text-[13px] text-muted">
                av {top?.owner || "—"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-[26px] font-semibold text-win tabular-nums">
                {top ? formatMoney(top.netto) : "—"}
              </div>
              <div className="text-[12px] text-muted">
                netto · ROI {top ? formatRoi(top.roi) : "—"}
              </div>
            </div>
          </div>
          {recentRows.length ? (
            recentRows.map((r) => (
              <div
                key={`${r.match}-${r.pick}-${r.odds}`}
                className="flex items-center gap-2.5 border-t border-line-soft py-2.5 text-[13px]"
              >
                <span className="flex-1 truncate text-[#C3CBDB]">{r.match}</span>
                <span className="font-bold">{r.pick}</span>
                <span className="font-mono-num text-muted">{r.odds}</span>
                <span
                  className="min-w-[74px] text-right font-mono-num font-semibold"
                  style={{ color: r.color }}
                >
                  {r.netto}
                </span>
              </div>
            ))
          ) : (
            <div className="border-t border-line-soft py-8 text-center text-sm text-muted">
              Registrera dig och bli först i topplistan.
            </div>
          )}
          <div className="mt-3.5 border-t border-line-soft pt-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-muted">
              Topplista · ROI i år
            </div>
            {board.slice(0, 3).map((l, i) => (
              <div
                key={l.id}
                className="flex items-center gap-2.5 py-1.5 text-sm"
              >
                <span className="font-display w-[18px] text-muted">{i + 1}</span>
                <span className="flex-1">{l.owner}</span>
                <span className="font-mono-num text-win">{formatRoi(l.roi)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <div className="mx-auto max-w-[1180px] px-7">
        <div className="flex flex-wrap items-center gap-3.5 border-y border-line-soft py-4">
          <span className="mr-1.5 text-[11px] uppercase tracking-[0.14em] text-faint">
            Bokför spel från
          </span>
          {(bookmakers || []).map((b) => (
            <span
              key={b.name}
              className="font-display text-[15px] tracking-[0.04em] text-muted"
            >
              {b.name}
            </span>
          ))}
          {!bookmakers?.length ? (
            <span className="text-sm text-muted">
              Importera spelbolag via scripts/import-bookmakers.ts
            </span>
          ) : null}
        </div>
      </div>

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
        <div className="grid items-start gap-6 md:grid-cols-[1.2fr_1fr]">
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
                      {r.owner} · {r.bets} spel · hitrate{" "}
                      {r.hitrate.toFixed(0)}%
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

          <div className="flex flex-col gap-4">
            <Panel className="p-[18px]">
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
            <AdSlot
              placement="home"
              className="h-[250px]"
              label="ANNONSPLATS 300×250"
            />
          </div>
        </div>
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
        <div className="mt-8 flex items-center gap-2 text-[13px] text-faint">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2A3346] bg-panel-2 font-display font-semibold">
            {initialOf("S")}
          </span>
          <Link href="/spelbolag" className="text-muted">
            Jämför svenska spelbolag
          </Link>
        </div>
      </section>
    </div>
  );
}
