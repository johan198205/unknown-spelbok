"use client";

import { useState } from "react";
import { teamLogoUrl } from "@/lib/logos";

export function TeamLogo({
  src,
  size,
}: {
  src: string | null;
  size: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className="shrink-0 rounded-full bg-panel-2"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

function TeamLine({
  name,
  logo,
  teamId,
  sport,
  size,
}: {
  name: string;
  logo?: string | null;
  teamId?: number | null;
  sport?: string | null;
  size: number;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TeamLogo src={teamLogoUrl(logo, teamId, sport)} size={size} />
      <span className="min-w-0 truncate font-semibold leading-tight">{name}</span>
    </span>
  );
}

/** [logo A] Lag A – [logo B] Lag B */
export function MatchSides({
  homeName,
  awayName,
  homeLogo,
  awayLogo,
  homeTeamId,
  awayTeamId,
  sport,
  size = 22,
}: {
  homeName: string;
  awayName: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  sport?: string | null;
  size?: number;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      <TeamLogo src={teamLogoUrl(homeLogo, homeTeamId, sport)} size={size} />
      <span className="min-w-0 truncate font-semibold">{homeName}</span>
      <span className="shrink-0 text-faint">–</span>
      <TeamLogo src={teamLogoUrl(awayLogo, awayTeamId, sport)} size={size} />
      <span className="min-w-0 truncate font-semibold">{awayName}</span>
    </span>
  );
}

/** Hemma ovanför borta, logga till vänster om namnet. */
export function MatchStack({
  homeName,
  awayName,
  homeLogo,
  awayLogo,
  homeTeamId,
  awayTeamId,
  sport,
  size = 18,
}: {
  homeName: string;
  awayName: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  sport?: string | null;
  size?: number;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <TeamLine
        name={homeName}
        logo={homeLogo}
        teamId={homeTeamId}
        sport={sport}
        size={size}
      />
      <TeamLine
        name={awayName}
        logo={awayLogo}
        teamId={awayTeamId}
        sport={sport}
        size={size}
      />
    </span>
  );
}
