"use client";

import { useEffect, useState } from "react";
import { parseMatchSides, teamInitial, teamLogoUrl } from "@/lib/logos";

export function TeamLogo({
  src,
  size,
  initial,
}: {
  src: string | null;
  size: number;
  initial?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const letter = teamInitial(initial);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-panel-2 font-semibold text-muted"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(8, Math.round(size * 0.45)),
        }}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
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
      <TeamLogo
        src={teamLogoUrl(logo, teamId, sport)}
        size={size}
        initial={name}
      />
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
      <TeamLogo
        src={teamLogoUrl(homeLogo, homeTeamId, sport)}
        size={size}
        initial={homeName}
      />
      <span className="min-w-0 truncate font-semibold">{homeName}</span>
      <span className="shrink-0 text-faint">–</span>
      <TeamLogo
        src={teamLogoUrl(awayLogo, awayTeamId, sport)}
        size={size}
        initial={awayName}
      />
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

/** Manuell match eller fri text: logga-platshållare med initialer när möjligt. */
export function ManualMatchLabel({
  match,
  size = 18,
  stacked = false,
}: {
  match: string;
  size?: number;
  stacked?: boolean;
}) {
  const sides = parseMatchSides(match);
  if (!sides) {
    return <span className="font-semibold text-text">{match}</span>;
  }
  if (stacked) {
    return (
      <MatchStack homeName={sides.home} awayName={sides.away} size={size} />
    );
  }
  return <MatchSides homeName={sides.home} awayName={sides.away} size={size} />;
}
