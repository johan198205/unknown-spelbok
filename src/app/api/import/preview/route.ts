import { NextResponse } from "next/server";
import { normalizeRows, rowKeyOf } from "@/lib/import/normalize";
import { rateLimit } from "@/lib/import/rate-limit";
import {
  ImportRequestError,
  loadBookmakerIndex,
  loadExistingExternalIds,
  parseImportBody,
} from "@/lib/import/server";
import type { ImportPreviewResponse } from "@/lib/import/types";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/texts/server";

export const runtime = "nodejs";

/**
 * Förhandsgranskning. Skriver aldrig till databasen — normaliserar raderna
 * och talar om vilka som redan finns (hård dubblett) respektive troligen
 * finns från en annan fil (mjuk dubblett).
 */
export async function POST(request: Request) {
  const [supabase, t] = await Promise.all([createClient(), getT()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t("import.api.notLoggedIn") }, { status: 401 });
  }

  const limit = rateLimit(`import-preview:${user.id}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: t("import.api.rateLimited") },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  let body;
  try {
    body = parseImportBody(await request.json(), t);
  } catch (error) {
    const message =
      error instanceof ImportRequestError ? error.message : t("import.request.broken");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const bookmakerIndex = await loadBookmakerIndex(supabase);
  const { rows, unitDetected } = normalizeRows({
    rows: body.rows,
    mapping: body.mapping,
    fileHash: body.file_hash,
    unitValue: body.unit_value,
    source: body.import_source,
    bookmakerIndex,
    t,
  });

  const { ids: existingIds } = await loadExistingExternalIds(supabase, user.id);
  const existing = new Set(existingIds);
  const existingRowKeys = new Set(existingIds.map(rowKeyOf));

  const duplicates: string[] = [];
  const softDuplicates: string[] = [];
  for (const row of rows) {
    const id = row.bet.external_id;
    if (existing.has(id)) {
      duplicates.push(id);
      continue;
    }
    if (existingRowKeys.has(rowKeyOf(id))) softDuplicates.push(id);
  }

  const payload: ImportPreviewResponse = {
    bets: rows,
    duplicates,
    soft_duplicates: softDuplicates,
    unit_detected: unitDetected,
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
