"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { canRyggaBet, ryggaPlacedAt } from "@/lib/rygga";
import { createClient } from "@/lib/supabase/server";

export type RyggaBetInput = {
  sourceBetId: string;
  targetSheetId: string;
  stake: number;
  odds: number;
};

export type RyggaBetResult =
  | {
      ok: true;
      betId: string;
      sheetId: string;
      sheetName: string;
      sheetSlug: string | null;
    }
  | { ok: false; error: string; code?: "duplicate" | "auth" | "started" | "forbidden" };

type SourceBetRow = {
  id: string;
  user_id: string;
  sheet_id: string;
  fixture_id: number | null;
  sport: string | null;
  league: string | null;
  league_id: number | null;
  league_logo: string | null;
  match: string;
  pick: string;
  bookmaker_id: string | null;
  odds: number;
  stake: number;
  result: string;
  placed_at: string;
  fixtures: {
    fixture_id: number;
    kickoff: string;
    status: string;
  } | null;
  sheets: {
    id: string;
    user_id: string;
    is_public: boolean;
  } | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function ryggaBet(input: RyggaBetInput): Promise<RyggaBetResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Du måste vara inloggad.", code: "auth" };
  }

  const stake = Number(input.stake);
  const odds = Number(input.odds);
  if (!Number.isFinite(stake) || stake <= 0) {
    return { ok: false, error: "Ogiltig insats." };
  }
  if (!Number.isFinite(odds) || odds < 1) {
    return { ok: false, error: "Ogiltigt odds." };
  }

  const supabase = await createClient();

  const { data: targetSheet, error: sheetError } = await supabase
    .from("sheets")
    .select("id, name, slug, user_id")
    .eq("id", input.targetSheetId)
    .maybeSingle();

  if (sheetError) {
    return {
      ok: false,
      error: sheetError.message || "Kunde inte läsa målspelboken.",
    };
  }
  if (!targetSheet || targetSheet.user_id !== user.id) {
    return {
      ok: false,
      error: "Målspelboken hittades inte.",
      code: "forbidden",
    };
  }

  const { data: rawSource, error: sourceError } = await supabase
    .from("bets")
    .select(
      "id, user_id, sheet_id, fixture_id, sport, league, league_id, league_logo, match, pick, bookmaker_id, odds, stake, result, placed_at, fixtures:fixture_id(fixture_id, kickoff, status), sheets:sheet_id(id, user_id, is_public)"
    )
    .eq("id", input.sourceBetId)
    .maybeSingle();

  if (sourceError || !rawSource) {
    return { ok: false, error: "Källspelet hittades inte.", code: "forbidden" };
  }

  const source: SourceBetRow = {
    ...(rawSource as Omit<SourceBetRow, "fixtures" | "sheets">),
    fixtures: asOne(
      (rawSource as { fixtures?: SourceBetRow["fixtures"] | SourceBetRow["fixtures"][] })
        .fixtures
    ),
    sheets: asOne(
      (rawSource as { sheets?: SourceBetRow["sheets"] | SourceBetRow["sheets"][] })
        .sheets
    ),
  };

  const sheet = source.sheets;
  const allowed =
    source.user_id === user.id || (sheet != null && sheet.is_public === true);
  if (!allowed) {
    return {
      ok: false,
      error: "Du har inte behörighet att rygga detta spel.",
      code: "forbidden",
    };
  }

  if (
    !canRyggaBet({
      result: source.result as "open",
      placed_at: source.placed_at,
      fixtures: source.fixtures,
    })
  ) {
    return {
      ok: false,
      error: "Spelet kan inte ryggas (matchen har startat eller är avgjord).",
      code: "started",
    };
  }

  const { data: existing } = await supabase
    .from("bets")
    .select("id")
    .eq("copied_from_bet_id", source.id)
    .eq("sheet_id", targetSheet.id)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "Du har redan ryggat detta spel i den spelboken",
      code: "duplicate",
    };
  }

  const placedAt = ryggaPlacedAt({
    placed_at: source.placed_at,
    fixtures: source.fixtures,
  });

  const { data: inserted, error: insertError } = await supabase
    .from("bets")
    .insert({
      sheet_id: targetSheet.id,
      user_id: user.id,
      fixture_id: source.fixture_id,
      sport: source.sport,
      league: source.league,
      league_id: source.league_id,
      league_logo: source.league_logo,
      match: source.match,
      pick: source.pick,
      bookmaker_id: source.bookmaker_id,
      odds,
      stake,
      result: "open",
      placed_at: placedAt,
      copied_from_bet_id: source.id,
      copied_from_user_id: source.user_id,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    if (
      insertError.code === "23505" ||
      /unique|duplicate/i.test(insertError.message)
    ) {
      return {
        ok: false,
        error: "Du har redan ryggat detta spel i den spelboken",
        code: "duplicate",
      };
    }
    return { ok: false, error: insertError.message || "Kunde inte spara spelet." };
  }

  if (!inserted) {
    return { ok: false, error: "Kunde inte spara spelet." };
  }

  revalidatePath("/spelbok");
  revalidatePath(`/s/${targetSheet.slug}`);
  if (sheet?.is_public) {
    // källsheet kan vara publikt under annan slug — revalidera generellt
    revalidatePath("/s", "layout");
  }

  return {
    ok: true,
    betId: inserted.id,
    sheetId: targetSheet.id,
    sheetName: targetSheet.name,
    sheetSlug: targetSheet.slug,
  };
}
