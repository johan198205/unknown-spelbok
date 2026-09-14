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
};

/**
 * Ansvarsraden som måste synas i anslutning till varje reklamlänk.
 *
 * Standardtexten är identisk överallt och ligger därför här, inte utspridd i
 * varje yta — en ändring i formuleringen ska slå igenom på ett ställe. Utan
 * `bookmaker` renderas bara standardraden, vilket är det rätta för ytor som
 * visar flera bolag samtidigt (grid, topplista, kupongsidans header).
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

  const linkClass = tone === "light" ? "text-[#3A6FD8] hover:underline" : undefined;

  return (
    <div
      className={cn(
        "text-[11.5px] leading-relaxed",
        tone === "light" ? "text-[#7A838F]" : "text-faint",
        className
      )}
    >
      <p>
        {prefix ? `${prefix} | ` : null}
        18+ |{" "}
        {termsUrl ? (
          <a
            href={termsUrl}
            target="_blank"
            rel="noopener nofollow noreferrer"
            className={linkClass}
          >
            Regler &amp; Villkor
          </a>
        ) : (
          "Regler & Villkor"
        )}{" "}
        gäller | Spela ansvarsfullt |{" "}
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
        </a>
      </p>
      {terms ? <p className="mt-1">{terms}</p> : null}
      {/* Bolagets egen formulering, ordagrant — den får inte klippas eller
          skrivas om, så ingen trunkering här. */}
      {extra ? <p className="mt-1 [text-wrap:pretty]">{extra}</p> : null}
    </div>
  );
}
