"use client";

import { useState } from "react";
import { teamLogoUrl } from "@/lib/logos";

function TeamLogo({
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

/** [logo A] Lag A – Lag B [logo B] */
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
      <span className="min-w-0 truncate font-semibold">{awayName}</span>
      <TeamLogo src={teamLogoUrl(awayLogo, awayTeamId, sport)} size={size} />
    </span>
  );
}
