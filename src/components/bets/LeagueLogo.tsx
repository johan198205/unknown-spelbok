"use client";

import { useEffect, useState } from "react";
import { leagueInitials, leagueLogoUrl } from "@/lib/logos";
import { cn } from "@/lib/utils";

type LeagueLogoProps = {
  src?: string | null;
  leagueId?: number | null;
  sport?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

/** Ligalogga med deterministisk tvåbokstavs-fallback (inte sportkod). */
export function LeagueLogo({
  src,
  leagueId,
  sport,
  name,
  size = 20,
  className,
}: LeagueLogoProps) {
  const resolved = leagueLogoUrl(src, leagueId, sport);
  const [failed, setFailed] = useState(false);
  const initials = leagueInitials(name);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!resolved || failed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-[#1B2436] font-semibold text-[#7FB0FF]",
          className
        )}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(7, Math.round(size * 0.38)),
        }}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
