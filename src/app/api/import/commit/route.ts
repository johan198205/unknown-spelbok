import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { normalizeRows } from "@/lib/import/normalize";
import { rateLimit } from "@/lib/import/rate-limit";
import {
  ImportRequestError,
  loadBookmakerIndex,
  parseImportBody,
} from "@/lib/import/server";
import type { ImportCommitResponse } from "@/lib/import/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CHUNK = 250;

/**
 * Sparar de rader användaren bockat i. Raderna normaliseras om här med samma
 * normalize.ts som förhandsgranskningen — klienten skickar rådata och
 * mappning, aldrig färdiga spel.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const limit = rateLimit(`import-commit:${user.id}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "För många försök. Vänta en stund." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const raw = (await request.json()) as Record<string, unknown>;

  let body;
  try {
    body = parseImportBody(raw);
  } catch (error) {
    const message =
      error instanceof ImportRequestError ? error.message : "Trasig data.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const selected = new Set(
    Array.isArray(raw.external_ids)
      ? raw.external_ids.filter((id): id is string => typeof id === "string")
      : []
  );
  if (!selected.size) {
    return NextResponse.json({ error: "Inga spel valda." }, { status: 400 });
  }

  const sheetId = typeof raw.sheet_id === "string" ? raw.sheet_id : "";
  const { data: sheet } = await supabase
    .from("sheets")
    .select("id, slug, user_id")
    .eq("id", sheetId)
    .maybeSingle();
  if (!sheet || sheet.user_id !== user.id) {
    return NextResponse.json(
      { error: "Spelboken hittades inte." },
      { status: 400 }
    );
  }

  const bookmakerIndex = await loadBookmakerIndex(supabase);
  const { rows } = normalizeRows({
    rows: body.rows,
    mapping: body.mapping,
    fileHash: body.file_hash,
    unitValue: body.unit_value,
    bookmakerIndex,
  });

  const now = new Date().toISOString();
  const inserts = rows
    .filter((row) => row.valid && selected.has(row.bet.external_id))
    .map(({ bet, bookmaker_id }) => {
      const settled = bet.result !== "pending";
      return {
        sheet_id: sheet.id,
        user_id: user.id,
        fixture_id: null,
        sport: bet.sport,
        league: bet.league,
        league_id: null,
        league_logo: null,
        match: bet.match_label as string,
        pick: bet.market || "—",
        bookmaker_id,
        odds: bet.odds as number,
        stake: bet.stake as number,
        // 'pending' i filen = orättat spel i spelboken.
        result: settled ? (bet.result as string) : "open",
        settled_at: settled ? now : null,
        settled_by: settled ? "user" : null,
        // Verified-badgen betyder "loggat före avspark" och kan aldrig
        // gälla importerad data.
        logged_before_kickoff: false,
        import_source: "file",
        import_external_id: bet.external_id,
        import_source_url: body.filename,
        ...(bet.placed_at ? { placed_at: bet.placed_at } : {}),
      };
    });

  if (!inserts.length) {
    return NextResponse.json({ error: "Inga giltiga spel valda." }, { status: 400 });
  }

  let imported = 0;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const { data, error } = await supabase
      .from("bets")
      .upsert(inserts.slice(i, i + CHUNK), {
        onConflict: "user_id,import_external_id",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      // 42P10 = ON CONFLICT hittar inget matchande unikt index, dvs.
      // kolumnerna finns men dubblettindexet saknas.
      if (
        error.code === "42P10" ||
        /import_external_id|import_source/.test(error.message)
      ) {
        return NextResponse.json(
          {
            error:
              "Importfunktionen kräver migrationen db/import-migration.sql.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: error.message || "Kunde inte spara spelen." },
        { status: 500 }
      );
    }
    imported += data?.length ?? 0;
  }

  revalidatePath("/spelbok");
  if (sheet.slug) revalidatePath(`/s/${sheet.slug}`);

  const payload: ImportCommitResponse = {
    imported,
    skipped: inserts.length - imported,
  };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
