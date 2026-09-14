"use client";

import { useAmount } from "@/components/DisplayPrefsProvider";

/**
 * Belopp som följer display-mode direkt i klienten. Använd i stället för
 * server-side formatAmount där togglen SEK↔Units ska kännas omedelbar.
 */
export function FormattedAmount({
  value,
  sign,
}: {
  value: number;
  sign?: boolean;
}) {
  const amount = useAmount();
  return <>{amount(value, sign === undefined ? undefined : { sign })}</>;
}
