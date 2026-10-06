import { cn } from "@/lib/utils";

const STODLINJEN = "https://stodlinjen.se";
const SPELPAUS = "https://spelpaus.se";

/**
 * Fälten raden behöver. Anropare som bara har en delmängd av spelbolaget
 * (kupongens `bookmakers`-join, topp 3-listan) slipper hämta hela raden.
 */
export type BookmakerDisclaimerSource = {
  terms?: string | null;
  terms_url?: string | null;
  extra_disclaimer?: string | null;
  /** 18 som standard; vissa bolag kräver 21+. */
  age_limit?: number | null;
};

/** "18+" eller bolagets egen gräns, t.ex. "21+". */
export function ageLabel(bookmaker?: BookmakerDisclaimerSource | null) {
  const age = Number(bookmaker?.age_limit);
  return `${Number.isFinite(age) && age >= 18 ? Math.round(age) : 18}+`;
}

/**
 * Ansvarsraden som måste synas i anslutning till varje reklamlänk.
 *
 * Standardtexten är identisk för alla bolag:
 *   18+ | Spela ansvarsfullt | Stodlinjen.se | Spelpaus.se | Regler & villkor gäller
 * Därefter fylls bolagets egen text på (villkor och extra disclaimer). Allt
 * ligger i en liten scrollruta — första raden syns alltid, resten scrollar
 * man fram, så kortet behåller sin höjd oavsett hur lång bolagets text är.
 *
 * `tone="light"` används i spelbolagskortet, som är den enda ljusa ytan i
 * sajten — där räcker inte de mörka temafärgerna för kontrast.
 */
export function BookmakerDisclaimer({
  bookmaker,
  prefix,
  tone = "dark",
  className,
}: {
  bookmaker?: BookmakerDisclaimerSource | null;
  /** T.ex. "Reklamlänk" — sätts först på raden. */
  prefix?: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const termsUrl = bookmaker?.terms_url?.trim();
  const terms = bookmaker?.terms?.trim();
  const extra = bookmaker?.extra_disclaimer?.trim();
  const light = tone === "light";

  const linkClass = light
    ? "text-[#5B6472] underline underline-offset-2 hover:text-[#12171F]"
    : "underline underline-offset-2 hover:text-text";

  return (
    <div
      className={cn(
        "max-h-[calc(3.1em+14px)] overflow-y-auto rounded-[8px] border px-2.5 py-1.5 text-[11.5px] leading-[1.55] [scrollbar-width:thin]",
        light
          ? "border-black/[.08] bg-white text-[#5B6472] [scrollbar-color:#B8BEC9_transparent]"
          : "border-line bg-bg-soft text-faint [scrollbar-color:#3A4560_transparent]",
        className
      )}
    >
      <p>
        {prefix ? `${prefix} | ` : null}
        {ageLabel(bookmaker)} | Spela ansvarsfullt |{" "}
        <a
          href={STODLINJEN}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Stodlinjen.se
        </a>{" "}
        |{" "}
        <a
          href={SPELPAUS}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Spelpaus.se
        </a>{" "}
        |{" "}
        {termsUrl ? (
          <a
            href={termsUrl}
            target="_blank"
            rel="noopener nofollow noreferrer"
            className={linkClass}
          >
            Regler &amp; villkor gäller
          </a>
        ) : (
          "Regler & villkor gäller"
        )}
        {terms ? ` ${terms}` : null}
        {/* Bolagets egen formulering, ordagrant — den får inte klippas eller
            skrivas om, så den ligger hel i scrollrutan. */}
        {extra ? ` ${extra}` : null}
      </p>
    </div>
  );
}
