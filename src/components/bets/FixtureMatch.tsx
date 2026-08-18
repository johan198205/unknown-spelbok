"use client";

import { LiveMatchCard } from "@/components/bets/LiveMatchCard";
import { MatchRow } from "@/components/bets/MatchRow";
import {
  isFinishedStatus,
  isInPlayStatus,
  type MatchFixture,
} from "@/lib/live-fixture";
import { cn } from "@/lib/utils";

export function FixtureMatch({
  fixture,
  className,
  showTime = true,
  stacked = false,
}: {
  fixture: MatchFixture;
  className?: string;
  showTime?: boolean;
  stacked?: boolean;
}) {
  if (
    stacked ||
    isInPlayStatus(fixture.status) ||
    isFinishedStatus(fixture.status)
  ) {
    return <LiveMatchCard fixture={fixture} className={className} />;
  }
  return (
    <MatchRow fixture={fixture} className={cn(className)} showTime={showTime} />
  );
}
