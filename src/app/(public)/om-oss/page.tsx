import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  fetchAboutStats,
  fetchTeamMembers,
  formatCount,
  formatTeamRoi,
} from "@/lib/about";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Om Spelbok",
  description:
    "Vi byggde verktyget vi själva saknade. Läs om Spelboks principer, team och siffror.",
};

const PRINCIPLES = [
  {
    n: "01",
    title: "Siffrorna ljuger inte, det gör minnet",
    body: "Netto, ROI och hitrate räknas ut ur varje enskilt spel. Ingen kan runda upp, glömma en förlust eller välja period.",
  },
  {
    n: "02",
    title: "Vi förmedlar inga spel",
    body: "Spelbok tar inga insatser och betalar inga vinster. Du spelar hos ditt licensierade spelbolag och bokför resultatet här.",
  },
  {
    n: "03",
    title: "Öppet om hur vi tjänar pengar",
    body: "Tjänsten är gratis och finansieras av annonsplatser och reklamlänkar till spelbolag. Varje sådan länk är märkt. Betyg och rankning påverkas inte av ersättning.",
  },
  {
    n: "04",
    title: "Ansvar före tillväxt",
    body: "18+, Stödlinjen och Spelpaus finns på varje sida. Vi använder aldrig brådska eller bonusretorik för att få någon att spela mer.",
  },
] as const;

export default async function OmOssPage() {
  const [stats, team] = await Promise.all([
    fetchAboutStats(),
    fetchTeamMembers(),
  ]);

  const kpis = [
    {
      value: formatCount(stats.users),
      label: "registrerade användare",
      accent: true,
    },
    {
      value: formatCount(stats.bets),
      label: "bokförda spel",
      accent: false,
    },
    {
      value: formatCount(stats.publicSheets),
      label: "publika spelböcker",
      accent: false,
    },
    {
      value: "0 kr",
      label: "i spel förmedlade. Vi är ett bokföringsverktyg.",
      accent: false,
    },
  ] as const;

  return (
    <div className="animate-sbfade pb-20">
      <section className="mx-auto max-w-[1220px] px-5 pt-[72px]">
        <div className="max-w-[760px]">
          <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-win">
            Om Spelbok
          </p>
          <h1 className="font-display text-[52px] font-semibold leading-[1.05] text-text [text-wrap:balance]">
            Vi byggde verktyget vi själva saknade.
          </h1>
          <p className="mt-5 text-[19px] leading-[1.6] text-[#C3CBDB] [text-wrap:pretty]">
            Spelbok startade 2025 som ett kalkylark mellan tre vänner som
            tröttnat på att gissa om de låg plus eller minus. Idag är det en
            plattform för alla som vill bokföra sina spel, se sin riktiga ROI
            och jämföra sig med andra på lika villkor.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-[72px] max-w-[1220px] px-5">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-[14px] border border-line bg-panel p-[22px]"
            >
              <div
                className={cn(
                  "font-mono-num text-[34px] font-semibold",
                  kpi.accent ? "text-win" : "text-[#E6EAF2]"
                )}
              >
                {kpi.value}
              </div>
              <p className="mt-1 text-[13.5px] leading-snug text-[#8A94AB]">
                {kpi.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-[72px] max-w-[1220px] px-5">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_1.3fr] md:gap-14">
          <div>
            <h2 className="font-display text-[32px] font-semibold leading-[1.1] text-text">
              Det vi tror på
            </h2>
            <p className="mt-3 text-[16px] leading-[1.6] text-[#8A94AB]">
              Fyra principer som styr varje beslut om produkten. De står här så
              att du kan hålla oss ansvariga.
            </p>
          </div>
          <div className="flex flex-col">
            {PRINCIPLES.map((p, i) => (
              <div
                key={p.n}
                className={cn(
                  "flex gap-5 border-t border-line-soft py-[22px]",
                  i === PRINCIPLES.length - 1 && "border-b"
                )}
              >
                <span className="w-7 shrink-0 pt-1 font-mono-num text-[13px] text-[#5D6883]">
                  {p.n}
                </span>
                <div>
                  <h3 className="font-display mb-1.5 text-[20px] font-semibold text-text">
                    {p.title}
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-[#8A94AB]">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-[72px] max-w-[1220px] px-5">
        <h2 className="font-display text-[32px] font-semibold leading-[1.1] text-text">
          Teamet
        </h2>
        <p className="mt-2 mb-[26px] max-w-[560px] text-[16px] leading-[1.6] text-[#8A94AB]">
          Tre personer i Stockholm och Göteborg. Alla bokför sina egna spel
          publikt på plattformen.
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {team.map((member) => (
            <article
              key={member.username}
              className="overflow-hidden rounded-[14px] border border-line bg-panel"
            >
              <div className="relative h-[220px] bg-[#101623]">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
              <div className="p-[18px]">
                <h3 className="font-display text-[20px] font-semibold text-text">
                  {member.name}
                </h3>
                <p className="mt-0.5 mb-2 text-[13px] text-win">{member.role}</p>
                <p className="text-[14px] leading-[1.55] text-[#8A94AB]">
                  {member.bio}
                </p>
                <p className="mt-3 font-mono-num text-[12px] text-[#5D6883]">
                  {member.isPublic ? (
                    <>
                      <Link
                        href={`/profil/${encodeURIComponent(member.username)}`}
                        className="text-[#5D6883] no-underline hover:text-text hover:underline"
                      >
                        @{member.username}
                      </Link>
                      {member.roi != null ? (
                        <>
                          {" · ROI "}
                          <span
                            className={cn(
                              member.roi > 0 && "text-win",
                              member.roi < 0 && "text-loss",
                              member.roi === 0 && "text-[#C3CBDB]"
                            )}
                          >
                            {formatTeamRoi(member.roi)}
                          </span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <span>@{member.username}</span>
                  )}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-[72px] max-w-[1220px] px-5">
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-panel p-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-[28px] font-semibold leading-tight text-text">
              Frågor, samarbeten eller press?
            </h2>
            <p className="mt-1.5 text-[15.5px] text-[#8A94AB]">
              Vi svarar på vardagar inom 24 timmar.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/kontakt"
              className="rounded-[10px] bg-win px-6 py-[13px] text-center text-[15px] font-bold text-win-ink no-underline hover:text-win-ink hover:no-underline hover:brightness-105"
            >
              Kontakta oss
            </Link>
            <Link
              href="/registrera"
              className="rounded-[10px] border border-line-strong bg-panel-2 px-6 py-[13px] text-center text-[15px] font-semibold text-text no-underline hover:text-text hover:no-underline"
            >
              Skapa konto
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
