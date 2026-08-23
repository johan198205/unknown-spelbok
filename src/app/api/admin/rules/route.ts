import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRuleSchema, fieldErrors } from "@/lib/signals/schema";

export const runtime = "nodejs";

const RULE_COLUMNS =
  "id, name, bet_type, sport, conditions, weight, label_template, min_matches_played, active, created_at, updated_at, updated_by";

/** Globala regler, nyaste ändring först. Inaktiva syns bara här. */
export async function GET() {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("signal_rules")
    .select(RULE_COLUMNS)
    .is("user_id", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rules: data ?? [] });
}

/**
 * Skapar en regel. Alltid inaktiv: en regel som börjar påverka riktiga
 * förslag i samma ögonblick den sparas hinner ingen förhandsgranska.
 */
export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valideringsfel", fields: fieldErrors(parsed.error) },
      { status: 422 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("signal_rules")
    .insert({
      ...parsed.data,
      user_id: null,
      active: false,
      updated_by: auth.user.id,
    })
    .select(RULE_COLUMNS)
    .single();

  if (error) {
    // Unikt namn per global regel — ge ett begripligt fel i stället för
    // databasens råa constraint-text.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Valideringsfel", fields: { name: "Namnet används redan" } },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rule: data }, { status: 201 });
}
