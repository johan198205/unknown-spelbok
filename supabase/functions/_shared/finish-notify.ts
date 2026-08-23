/**
 * Notiser när en match tar slut. Delas av poll-live och settle-results.
 *
 * Ordningen spelar roll:
 *   1. notifyFulltime FÖRE settleOpenBets — målgruppen är bets med
 *      notify_goals och result='open', och rättningen tömmer den.
 *   2. notifySettleReminders EFTER settleOpenBets — allt som fortfarande
 *      står öppet på en avslutad match kunde inte auto-rättas.
 *
 * Dubbletter fångas av sent_notifications på site-sidan, så en extra
 * körning är ofarlig.
 */

import { notifySite } from "./site-notify.ts";

export type FinishedMatchNotice = {
  fixtureId: number;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
};

export async function notifyFulltime(matches: FinishedMatchNotice[]) {
  if (!matches.length) return;
  await notifySite({ kind: "fulltime", matches });
}

export async function notifySettleReminders(matches: FinishedMatchNotice[]) {
  if (!matches.length) return;
  await notifySite({ kind: "settle-reminder", matches });
}
