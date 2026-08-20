"use client";

import { TeamLogo } from "@/components/bets/TeamPair";
import { formatKickoffTime, type MatchFixture } from "@/lib/live-fixture";
import { teamLogoUrl } from "@/lib/logos";
import { cn } from "@/lib/utils";

export function MatchRow({
  fixture,
  className,
  showTime = true,
  size = 18,
}: {
  fixture: MatchFixture;
  className?: string;
  showTime?: boolean;
  size?: number;
}) {
  const home = fixture.home_name || "";
  const away = fixture.away_name || "";

  return (
    <div className={cn("flex min-w-0 w-full items-center gap-2", className)}>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <TeamLogo
          src={teamLogoUrl(fixture.home_logo, fixture.home_team_id, fixture.sport)}
          size={size}
          initial={home}
        />
        <span className="min-w-0 truncate">{home}</span>
        <span className="shrink-0 text-faint">–</span>
        <TeamLogo
          src={teamLogoUrl(fixture.away_logo, fixture.away_team_id, fixture.sport)}
          size={size}
          initial={away}
        />
        <span className="min-w-0 truncate">{away}</span>
      </span>
      {showTime ? (
        <span className="shrink-0 font-mono-num text-[11px] text-faint">
          {formatKickoffTime(fixture.kickoff)}
        </span>
      ) : null}
    </div>
  );
}
