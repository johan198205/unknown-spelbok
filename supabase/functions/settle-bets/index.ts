/**
 * Bakåtkompatibel alias för settle-results.
 * Befintlig cron mot settle-bets fortsätter att fungera.
 *
 * Ny schemaläggning ska peka på settle-results (se db/cron.sql).
 */

import { handleSettleResults } from "../_shared/run-settle.ts";

Deno.serve(handleSettleResults);
