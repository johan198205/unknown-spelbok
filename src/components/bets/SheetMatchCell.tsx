"use client";

import { TeamLogo } from "@/components/bets/TeamPair";
import {
  fixtureFromBet,
  formatKickoffTime,
  isInPlayStatus,
} from "@/lib/live-fixture";
import { parseMatchSides, teamLogoUrl } from "@/lib/logos";
import type { Bet } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { SheetDensity } from "@/lib/sheet-filters";

type Side = {
  name: string;
  logo: string | null;
  score: number | null;
};

type Sides = {
  home: Side;
  away: Side;
  /** FT / LIVE / starttid. */
  status: string;
  live: boolean;
  hasScore: boolean;
};

/**
 * Matchen som cellen faktiskt ska rita: lag, loggor och målsiffror.
 *
 * Kopplade spel läser lag och resultat ur fixtures-cachen; manuella spel
 * delar upp `match`-strängen och får inga siffror.
 */
export function betMatchSides(bet: Bet): Sides {
  const fixture = fixtureFromBet(bet);
  const live = isInPlayStatus(fixture?.status);
  const settled = bet.result !== "open";
  const status = settled
    ? "FT"
    : live
      ? "LIVE"
      : formatKickoffTime(fixture?.kickoff || bet.placed_at) || "—";

  if (fixture) {
    const sport = fixture.sport;
    return {
      home: {
        name: fixture.home_name || "Hemma",
        logo: teamLogoUrl(fixture.home_logo, fixture.home_team_id, sport),
        score: fixture.home_score ?? null,
      },
      away: {
        name: fixture.away_name || "Borta",
        logo: teamLogoUrl(fixture.away_logo, fixture.away_team_id, sport),
        score: fixture.away_score ?? null,
      },
      status,
      live,
      hasScore: fixture.home_score != null && fixture.away_score != null,
    };
  }

  const manual = parseMatchSides(bet.match);
  return {
    home: { name: manual?.home || bet.match, logo: null, score: null },
    away: { name: manual?.away || "", logo: null, score: null },
    status,
    live,
    hasScore: false,
  };
}

function scoreText(value: number | null) {
  return value == null ? "–" : String(value);
}

/** Vinnande lag står i klartext, förlorande dämpas. Oavgjort → båda ljusa. */
function sideTone(mine: number | null, other: number | null) {
  if (mine == null || other == null) return "text-text";
  if (mine > other) return "text-text";
  if (mine < other) return "text-muted";
  return "text-text";
}

function TeamRow({
  side,
  other,
  logoSize,
  nameSize,
  showScore,
}: {
  side: Side;
  other: Side;
  logoSize: number;
  nameSize: string;
  showScore: boolean;
}) {
  const tone = showScore ? sideTone(side.score, other.score) : "text-text";
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TeamLogo src={side.logo} size={logoSize} initial={side.name} />
      {/*
        Lagnamnet får ALDRIG kapas här — det är kolumnens hela poäng. Ryms det
        inte på en rad bryts det till nästa i stället för att sluta i "...".
      */}
      <span
        title={side.name}
        className={cn(
          "min-w-0 flex-1 break-words leading-[1.2]",
          nameSize,
          tone
        )}
      >
        {side.name}
      </span>
      {showScore ? (
        <span
          className={cn(
            "w-4 shrink-0 text-right font-mono-num text-[16px] font-semibold",
            tone
          )}
        >
          {scoreText(side.score)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Matchcellen i tabellen och på korten, i de två lägen växlaren styr.
 *
 * Slimmat läge måste vara SMALARE än resultatläget — lagnamnen får därför
 * krympa (`flex 0 1 auto` + `min-width`), inte tvinga fram en bredare cell.
 */
export function SheetMatchCell({
  bet,
  density,
  variant = "table",
}: {
  bet: Bet;
  density: SheetDensity;
  variant?: "table" | "card";
}) {
  const sides = betMatchSides(bet);
  const showScore = sides.hasScore;

  if (density === "slim") {
    /*
      Här ryms båda lagen på EN rad i samma kolumn — namnen måste därför få
      kortas. Titeln bär hela namnet så inget är oåtkomligt; vill man se dem
      i klartext är resultatläget rätt läge.
    */
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-[14.5px]">
        <TeamLogo src={sides.home.logo} size={22} initial={sides.home.name} />
        <span
          title={sides.home.name}
          className="min-w-[24px] flex-[0_1_auto] truncate"
        >
          {sides.home.name}
        </span>
        <span className="shrink-0 text-faint">–</span>
        <TeamLogo src={sides.away.logo} size={22} initial={sides.away.name} />
        <span
          title={sides.away.name}
          className="min-w-[24px] flex-[0_1_auto] truncate"
        >
          {sides.away.name}
        </span>
        <span className="shrink-0 rounded-[6px] bg-panel-2 px-1.5 py-0.5 font-mono-num text-[12.5px] font-semibold">
          {showScore
            ? `${scoreText(sides.home.score)}–${scoreText(sides.away.score)}`
            : sides.status}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex min-w-0 items-center border border-line-soft bg-bg-soft",
        variant === "card"
          ? "rounded-[11px] px-[13px] py-2.5"
          : "rounded-[10px] px-2.5 py-2"
      )}
    >
      {/* Statusblocket hålls smalt — varje pixel här är en pixel mindre lagnamn. */}
      <span
        className={cn(
          "shrink-0 whitespace-nowrap border-r border-line-soft font-mono-num text-[12px] font-semibold",
          variant === "card" ? "mr-3 pr-3" : "mr-2 pr-2",
          sides.live ? "text-cyan" : "text-faint"
        )}
      >
        {sides.status}
      </span>
      {/* Inget max-w här: namnen ska få hela kolumnen, inte ett tak på 250px. */}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <TeamRow
          side={sides.home}
          other={sides.away}
          logoSize={26}
          nameSize={variant === "card" ? "text-[15px]" : "text-[15.5px]"}
          showScore={showScore}
        />
        <TeamRow
          side={sides.away}
          other={sides.home}
          logoSize={26}
          nameSize={variant === "card" ? "text-[15px]" : "text-[15.5px]"}
          showScore={showScore}
        />
      </span>
    </span>
  );
}
