import { NextRequest, NextResponse } from "next/server";
import { refreshLiveFixtures } from "@/lib/refresh-live";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

function parseIds(raw: string) {
  return raw
    .split(/[,-]/)
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id) && id > 0)
    .slice(0, 40);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Ej inloggad" }, { status: 401 }),
    };
  }
  return { user };
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const ids = parseIds(request.nextUrl.searchParams.get("ids") ?? "");
  if (!ids.length) {
    return NextResponse.json({ fixtures: [], settled: 0 });
  }

  try {
    const result = await refreshLiveFixtures(ids);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunde inte uppdatera live";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
