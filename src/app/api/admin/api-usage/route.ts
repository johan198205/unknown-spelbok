import { NextRequest, NextResponse } from "next/server";
import { getApiUsage, parseApiUsageFilters } from "@/lib/admin/api-usage";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireApiAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Ej inloggad" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Förbjudet" }, { status: 403 }),
    };
  }

  return { user };
}

/**
 * Förbrukning mot API-Sports.
 *
 * Query: from, to (ISO-datum), provider (api-football|api-hockey),
 * groupBy (day|hour). Utan parametrar: senaste 7 dygnen, båda providers.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  const sp = request.nextUrl.searchParams;
  const filters = parseApiUsageFilters({
    period: sp.get("period"),
    provider: sp.get("provider"),
    from: sp.get("from"),
    to: sp.get("to"),
    groupBy: sp.get("groupBy"),
  });

  try {
    const data = await getApiUsage(filters);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Kunde inte hämta förbrukningen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
