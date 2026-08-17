"use client";

import { teamLogoUrl } from "@/lib/logos";

function Logo({
  src,
  size,
}: {
  src: string | null;
  size: number;
}) {
  if (!src) {
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
    />
  );
}

export function TeamPair({
  homeLogo,
  awayLogo,
  homeTeamId,
  awayTeamId,
  sport,
  size = 22,
}: {
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  sport?: string | null;
  size?: number;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <Logo src={teamLogoUrl(homeLogo, homeTeamId, sport)} size={size} />
      <Logo src={teamLogoUrl(awayLogo, awayTeamId, sport)} size={size} />
    </span>
  );
}
