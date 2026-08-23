import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, updateRuleSchema } from "@/lib/signals/schema";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RULE_COLUMNS =
  "id, name, bet_type, sport, conditions, weight, label_template, min_matches_played, active, created_at, updated_at, updated_by";

/**
 * Uppdaterar en regel, inklusive aktiv-toggeln.
 *
 * Ingen DELETE finns med flit: historiska förslag pekar på rule_id i sina
 * reasons, och en raderad regel gör gamla kort omöjliga att härleda.
 * Regler inaktiveras i stället.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Ogiltigt id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = updateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valideringsfel", fields: fieldErrors(parsed.error) },
      { status: 422 }
    );
  }
  if (!Object.keys(parsed.data).length) {
    return NextResponse.json({ error: "Inget att uppdatera" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("signal_rules")
    .update({ ...parsed.data, updated_by: auth.user.id })
    .eq("id", id)
    .is("user_id", null)
    .select(RULE_COLUMNS)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Valideringsfel", fields: { name: "Namnet används redan" } },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  return NextResponse.json({ rule: data });
}
