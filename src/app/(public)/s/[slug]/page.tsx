import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProfile, getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SpelbokSheetView } from "@/components/bets/SpelbokSheetView";
import { AdSlot } from "@/components/ui/AdSlot";
import {
  fetchSheetStatsBundle,
  type AffiliateTopRow,
} from "@/lib/bet-stats";
import type { Bet, Bookmaker, Sheet } from "@/lib/types";

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function PublicSheetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;

  const { data: sheetRow } = await supabase
    .from("sheets")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  // Privat eller saknas → 404 (läck inte existens)
  if (!sheetRow) notFound();

  const sheet = sheetRow as Sheet;

  const { data: owner } = await supabase
    .from("profiles")
    .select("username, unit_size")
    .eq("id", sheet.user_id)
    .maybeSingle();

  if (!owner?.username) notFound();

  const [{ data: bookmakers }, viewerSheetsResult] = await Promise.all([
    supabase
      .from("bookmakers")
      .select("*")
      .eq("active", true)
      .order("rank")
      .order("name"),
    user
      ? supabase
          .from("sheets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Sheet[] }),
  ]);

  let bets: Bet[] = [];
  const query = await supabase
    .from("bets")
    .select(
      "*, bookmakers(id, name, logo_url), fixtures:fixture_id(fixture_id, kickoff, status, elapsed, home_score, away_score, home_logo, away_logo, home_team_id, away_team_id, home_name, away_name, sport, league_id, league_logo)"
    )
    .eq("sheet_id", sheet.id)
    .order("placed_at", { ascending: false });

  if (query.error) {
    const fallback = await supabase
      .from("bets")
      .select(
        "*, bookmakers(id, name, logo_url), fixtures:fixture_id(fixture_id, kickoff, status, home_score, away_score, home_logo, away_logo, home_team_id, away_team_id, home_name, away_name, sport)"
      )
      .eq("sheet_id", sheet.id)
      .order("placed_at", { ascending: false });
    bets = (fallback.data || []) as Bet[];
  } else {
    bets = (query.data || []) as Bet[];
  }

  bets = toPlain(bets).map((bet) => ({
    ...bet,
    bookmakers: asOne(bet.bookmakers),
    fixtures: asOne(bet.fixtures),
  }));

  const unitSize =
    profile?.unit_size && profile.unit_size > 0
      ? Number(profile.unit_size)
      : 100;

  const affiliates: AffiliateTopRow[] = ((bookmakers || []) as Bookmaker[])
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logo_url: b.logo_url,
      rank: b.rank,
      rating: b.rating,
      bonus_value: b.bonus_value,
      bonus: b.bonus,
      usp: b.usp,
      terms: b.terms,
    }));

  const statsBundle = await fetchSheetStatsBundle(
    supabase,
    sheet.id,
    "all",
    unitSize
  );

  const viewerSheets = toPlain(
    ((viewerSheetsResult.data || []) as Sheet[]) ?? []
  );

  return (
    <div className="mx-auto w-full max-w-[1360px] animate-sbfade px-4 py-6 lg:px-5">
      <div className="mb-[26px]">
        <AdSlot
          placement="sheet"
          className="hidden h-[90px] lg:flex"
          label="ANNONSPLATS 970×90"
        />
        <AdSlot
          placement="sheet"
          className="h-[100px] lg:hidden"
          label="ANNONSPLATS 320×100"
        />
      </div>
      <Suspense
        fallback={<div className="py-10 text-center text-muted">Laddar…</div>}
      >
        <SpelbokSheetView
          sheet={toPlain(sheet)}
          bets={bets}
          sheets={viewerSheets}
          bookmakers={toPlain((bookmakers || []) as Bookmaker[])}
          username={owner.username}
          initialStats={toPlain(statsBundle.stats)}
          affiliates={toPlain(affiliates)}
          mode="public"
          viewerSheets={viewerSheets}
          unitSize={unitSize}
          isAuthenticated={!!user}
        />
      </Suspense>
    </div>
  );
}
