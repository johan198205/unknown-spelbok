"use client";

import { X } from "lucide-react";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { MatchSides } from "@/components/bets/TeamPair";
import { Badge } from "@/components/ui/Badge";
import { kickoffLabel, topReasons, type DailySuggestion } from "@/lib/suggestions";
import { cn } from "@/lib/utils";

/**
 * Ett förslagskort. All copy är formulerad som "matchar din spelstil" /
 * "värd att kolla upp" — aldrig en uppmaning att spela, aldrig en gissning
 * om utfallet. Det är en juridisk gräns, inte en stilfråga.
 */
export function SuggestionCard({
  suggestion,
  leaving,
  onOpen,
  onDismiss,
}: {
  suggestion: DailySuggestion;
  leaving?: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const reasons = topReasons(suggestion);
  const sport = suggestion.sport === "hockey" ? "Ishockey" : "Fotboll";

  return (
    <div
      className={cn(
        "relative w-[286px] shrink-0 snap-start rounded-[var(--radius-panel)] border border-line bg-panel transition-all duration-200 lg:w-auto",
        leaving
          ? "pointer-events-none scale-[0.97] opacity-0"
          : "opacity-100"
      )}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dölj ${suggestion.home_team} – ${suggestion.away_team}`}
        className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-faint transition-colors hover:bg-panel-2 hover:text-text"
      >
        <X className="size-3.5" strokeWidth={2.5} />
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="block w-full px-3.5 pb-3.5 pt-3.5 text-left"
      >
        <div className="flex items-center gap-1.5 pr-14 text-[12px] text-muted">
          <LeagueLogo
            src={suggestion.league_logo}
            leagueId={suggestion.league_id || null}
            sport={sport}
            name={suggestion.league_name}
            size={16}
          />
          <span className="min-w-0 truncate">{suggestion.league_name}</span>
          {/*
            Relevanspoängen (0–100). Utan enhet läses siffran lätt som odds
            eller sannolikhet, vilket den inte är — därav både etiketten och
            nämnaren.
          */}
          <span
            className="ml-auto shrink-0 font-mono-num text-[11px] text-faint"
            title="Matchpoäng: hur väl matchen stämmer med din spelhistorik (0–100)"
          >
            {Math.round(Number(suggestion.match_score))}
            <span className="text-[9.5px]">/100</span>
          </span>
        </div>

        <div className="mt-2 flex min-w-0 text-[14px]">
          <MatchSides
            homeName={suggestion.home_team}
            awayName={suggestion.away_team}
            homeLogo={suggestion.home_logo}
            awayLogo={suggestion.away_logo}
            homeTeamId={suggestion.home_team_id}
            awayTeamId={suggestion.away_team_id}
            sport={sport}
            size={18}
          />
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <span className="font-mono-num text-[13px] text-text-soft">
            {kickoffLabel(suggestion.kickoff)}
          </span>
          {suggestion.suggested_bet_type ? (
            <Badge tone="cyan">{suggestion.suggested_bet_type}</Badge>
          ) : null}
        </div>

        {reasons.history.length || reasons.signals.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {reasons.history.map((reason) => (
              <span
                key={`${reason.type}-${reason.label}`}
                className="rounded-[var(--radius-badge)] border border-line-strong bg-panel-2 px-2 py-1 text-[11.5px] leading-tight text-text-soft"
              >
                {reason.label}
              </span>
            ))}
            {/*
              Gul accent: signalskäl beskriver matchbilden, historikskäl
              beskriver användaren. Två olika sorters påstående ska inte se
              likadana ut.
            */}
            {reasons.signals.map((reason) => (
              <span
                key={reason.rule_id ?? reason.label}
                className="rounded-[var(--radius-badge)] border border-[var(--yellow-border)] bg-yellow/10 px-2 py-1 text-[11.5px] leading-tight text-yellow"
              >
                {reason.label}
              </span>
            ))}
          </div>
        ) : null}
      </button>
    </div>
  );
}
