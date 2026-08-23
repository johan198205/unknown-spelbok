import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin/require-admin";
import {
  MAX_CONDITIONS_PER_RULE,
  SIGNAL_BET_TYPES,
  SIGNAL_FIELDS,
  SIGNAL_FIELD_GROUPS,
  SIGNAL_OPERATORS,
  SIGNAL_SPORTS,
} from "@/lib/signals/fields";

export const runtime = "nodejs";

/**
 * Fältbiblioteket för admin-formulärets dropdowns.
 *
 * Samma konstant som valideringen och evaluatorn använder, så en admin kan
 * aldrig välja ett fält som inte går att spara eller köra.
 */
export async function GET() {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  return NextResponse.json({
    groups: SIGNAL_FIELD_GROUPS,
    fields: SIGNAL_FIELDS,
    operators: SIGNAL_OPERATORS,
    betTypes: SIGNAL_BET_TYPES,
    sports: SIGNAL_SPORTS,
    maxConditions: MAX_CONDITIONS_PER_RULE,
  });
}
