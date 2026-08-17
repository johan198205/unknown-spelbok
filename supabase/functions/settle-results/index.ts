/**
 * SPELBOK — Edge Function: settle-results
 *
 * Körs var 15:e minut. Hämtar resultat BARA när det finns fixtures
 * med passerad avspark som inte är terminala — annars noll API-anrop.
 *
 * Settling 1X2 / Över-Under: score.fulltime (90 min), se regulationScore.
 * AWD/WO settlas om siffror finns men flaggas i sync_log.meta.awarded.
 * PST/TBD: uppdatera kickoff, rör inte spelen.
 * CANC/ABD: void öppna spel.
 *
 * Leaderboard är en vy över bets — den uppdateras av sig själv efter
 * att bets.result skrivs. Ingen separat statistiktabell att nolla.
 *
 * Deploy:
 *   supabase functions deploy settle-results
 */

import { handleSettleResults } from "../_shared/run-settle.ts";

Deno.serve(handleSettleResults);
