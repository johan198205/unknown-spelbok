"use client";

import { TeamLogo } from "@/components/bets/TeamPair";
import { useClockTick } from "@/hooks/useClockTick";
import {
  fixtureClock,
  isFinishedStatus,
  isInPlayStatus,
  isTickingStatus,
  type MatchFixture,
} from "@/lib/live-fixture";
import { teamLogoUrl } from "@/lib/logos";
import { cn } from "@/lib/utils";

function TeamLine({
  name,
  logo,
  teamId,
  sport,
  score,
  showScore,
  logoSize,
}: {
  name: string;
  logo?: string | null;
  teamId?: number | null;
  sport?: string | null;
  score: number | null;
  showScore: boolean;
  logoSize: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <TeamLogo
        src={teamLogoUrl(logo, teamId, sport)}
        size={logoSize}
        initial={name}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] text-text">{name}</span>
      {showScore ? (
        <span className="w-5 shrink-0 text-right font-mono-num text-[13px] font-bold text-text">
          {score ?? 0}
        </span>
      ) : null}
    </div>
  );
}

export function LiveMatchCard({
  fixture,
  className,
  logoSize = 16,
}: {
  fixture: MatchFixture;
  className?: string;
  logoSize?: number;
}) {
  const live = isInPlayStatus(fixture.status);
  const finished = isFinishedStatus(fixture.status);
  const showScore = live || finished;
  const now = useClockTick(isTickingStatus(fixture.status));
  const clock = fixtureClock(fixture, now);
  const clockColor = finished
    ? "text-faint"
    : live
      ? "text-live"
      : "text-faint";

  return (
    <div
      className={cn(
        "relative flex w-full min-w-0 overflow-hidden rounded-[10px] bg-panel-2",
        className
      )}
    >
      {live ? (
        <span className="absolute inset-y-0 left-0 w-[3px] bg-live" />
      ) : null}
      <span
        className={cn(
          // Bredden måste rymma tilläggstid ("90+3'"), inte bara "67'".
          "flex w-12 shrink-0 items-center justify-center whitespace-nowrap font-mono-num text-[12px] font-medium",
          live || finished ? "pl-1" : "",
          clockColor
        )}
      >
        {clock}
      </span>
      <span className="my-1.5 w-px shrink-0 bg-line-soft" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-1.5 pr-2.5 pl-2">
        <TeamLine
          name={fixture.home_name || ""}
          logo={fixture.home_logo}
          teamId={fixture.home_team_id}
          sport={fixture.sport}
          score={fixture.home_score ?? null}
          showScore={showScore}
          logoSize={logoSize}
        />
        <TeamLine
          name={fixture.away_name || ""}
          logo={fixture.away_logo}
          teamId={fixture.away_team_id}
          sport={fixture.sport}
          score={fixture.away_score ?? null}
          showScore={showScore}
          logoSize={logoSize}
        />
      </div>
    </div>
  );
}
