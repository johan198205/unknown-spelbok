"use client";

import { useCallback, useState } from "react";
import { X } from "lucide-react";
import { useMobileChrome } from "@/components/layout/MobileChrome";
import { MatchLine } from "@/components/bets/TeamPair";
import { fixtureFromSuggestion, type DailySuggestion } from "@/lib/suggestions";

export type MatchForYou = {
  suggestion: DailySuggestion;
  /** "47 tidigare spel i Allsvenskan · netto −5 262 kr" — räknat på servern. */
  note: string;
};

/**
 * "Matcher för dig" i dashboardens högerkolumn.
 *
 * Copy-regeln gäller: matchningen beskriver hur nära matchen ligger
 * användarens egen historik. Den är inte en prognos, och siffran får aldrig
 * stå naken — utan etiketten "MATCHNING" läses 77 som odds eller sannolikhet.
 */
export function MatchesForYou({
  items,
  dateLabel,
}: {
  items: MatchForYou[];
  dateLabel: string;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const chrome = useMobileChrome();

  const patch = useCallback(
    (id: string, body: { clicked?: boolean; dismissed?: boolean }) => {
      void fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {
        /* uppföljningsdata — får tappas utan att störa användaren */
      });
    },
    []
  );

  const visible = items.filter((i) => !dismissed.includes(i.suggestion.id));
  if (!visible.length) return null;

  return (
    <section aria-labelledby="matcher-for-dig">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2
          id="matcher-for-dig"
          className="font-display text-[15px] font-semibold uppercase tracking-[0.09em]"
        >
          Matcher för dig
        </h2>
        <span className="shrink-0 font-mono-num text-[12px] text-faint">
          {dateLabel}
        </span>
      </div>

      <div className="overflow-hidden rounded-[13px] border border-line bg-panel">
        {visible.map(({ suggestion, note }) => {
          const sport = suggestion.sport === "hockey" ? "Ishockey" : "Fotboll";
          return (
            <div
              key={suggestion.id}
              className="group relative border-b border-line-row last:border-b-0"
            >
              <button
                type="button"
                onClick={() => {
                  patch(suggestion.id, { clicked: true });
                  chrome?.openAddBet(fixtureFromSuggestion(suggestion));
                }}
                className="flex w-full cursor-pointer items-start gap-3 px-[13px] py-[10px] text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5 pr-6 text-[13.5px] font-semibold">
                    <MatchLine
                      homeName={suggestion.home_team}
                      awayName={suggestion.away_team}
                      homeLogo={suggestion.home_logo}
                      awayLogo={suggestion.away_logo}
                      homeTeamId={suggestion.home_team_id}
                      awayTeamId={suggestion.away_team_id}
                      sport={sport}
                    />
                  </span>
                  <span className="mt-1 block truncate font-mono-num text-[11.5px] text-faint">
                    {suggestion.league_name} · {kickoff(suggestion.kickoff)}
                  </span>
                  <span className="mt-[7px] block text-[12px] text-muted">
                    {note}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block font-mono-num text-[14px] font-semibold text-[#7FB0FF]">
                    {Math.round(Number(suggestion.match_score))}
                  </span>
                  <span className="block text-[9.5px] uppercase tracking-[0.1em] text-faint">
                    Matchning
                  </span>
                </span>
              </button>

              <button
                type="button"
                aria-label={`Dölj ${suggestion.home_team} – ${suggestion.away_team}`}
                onClick={() => {
                  patch(suggestion.id, { dismissed: true });
                  setDismissed((prev) => [...prev, suggestion.id]);
                }}
                className="absolute right-[10px] top-[8px] flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-faint opacity-0 transition hover:bg-panel-2 hover:text-text focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="size-3" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11.5px] leading-snug text-faint">
        Matchningen visar hur nära matchen ligger din egen spelhistorik. Ingen
        prognos av utfallet.
      </p>
    </section>
  );
}

/** "8/14 15:45" i svensk tid. */
function kickoff(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
  const parts = new Intl.DateTimeFormat("sv-SE", {
    month: "numeric",
    day: "numeric",
    timeZone: "Europe/Stockholm",
  }).formatToParts(d);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${month}/${day} ${time}`;
}
