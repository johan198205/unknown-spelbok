"use client";

import type { Fixture } from "@/lib/types";
import { FixturePicker } from "@/components/bets/FixturePicker";

export function MatchSelector({
  onSelect,
}: {
  onSelect: (fixture: Fixture) => void;
}) {
  return <FixturePicker onSelect={onSelect} />;
}
