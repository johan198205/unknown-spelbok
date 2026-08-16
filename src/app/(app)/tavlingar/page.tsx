import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, EmptyState, Panel } from "@/components/ui/Panel";
import { JoinCompetitionButton } from "@/components/bets/JoinCompetitionButton";
import { formatMoney, formatRoi, nettoColor } from "@/lib/utils";
import type { Competition, LeaderboardRow } from "@/lib/types";
import Link from "next/link";

export default async function TavlingarPage() {
  await requireUser();
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: competitions } = await supabase
    .from("competitions")
    .select("*")
    .eq("active", true)
    .order("starts_at", { ascending: false });

  const comps = (competitions || []) as Competition[];

  const entriesByComp: Record<string, boolean> = {};
  if (profile && comps.length) {
    const { data: entries } = await supabase
      .from("competition_entries")
      .select("competition_id")
      .eq("user_id", profile.id)
      .in(
        "competition_id",
        comps.map((c) => c.id)
      );
    for (const e of entries || []) entriesByComp[e.competition_id] = true;
  }

  const boards: Record<string, LeaderboardRow[]> = {};
  for (const c of comps) {
    const { data } = await supabase
      .from("leaderboard")
      .select("*")
      .eq("competition_id", c.id)
      .order("roi", { ascending: false })
      .limit(10);
    boards[c.id] = (data || []) as LeaderboardRow[];
  }

  return (
    <div className="animate-sbfade space-y-5">
      <div>
        <h1 className="font-display text-[28px] font-semibold lg:text-[32px]">
          Tävlingar
        </h1>
        <p className="text-muted">
          Anmäl dig och tävla på ROI under tävlingsperioden.
        </p>
      </div>

      <div className="mb-1 flex gap-3 lg:hidden">
        <Link
          href="/topplista"
          className="rounded-full border border-line bg-panel px-3.5 py-1.5 text-sm font-semibold text-muted no-underline"
        >
          Topplista
        </Link>
        <Link
          href="/tavlingar"
          className="rounded-full border border-win bg-win/10 px-3.5 py-1.5 text-sm font-semibold text-win no-underline"
        >
          Tävlingar
        </Link>
      </div>

      {!comps.length ? (
        <EmptyState>
          Inga aktiva tävlingar. En admin kan skapa dem under Admin → Tävlingar.
        </EmptyState>
      ) : (
        comps.map((c) => {
          const joined = !!entriesByComp[c.id];
          const board = boards[c.id] || [];
          const now = Date.now();
          const ongoing =
            +new Date(c.starts_at) <= now && now <= +new Date(c.ends_at);
          const selfIdx = profile
            ? board.findIndex((r) => r.user_id === profile.id)
            : -1;
          const top3 = board.slice(0, 3);

          return (
            <Panel key={c.id} className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 lg:px-5">
                <div className="w-full lg:w-auto">
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="font-display text-xl font-semibold">
                      {c.name}
                    </h2>
                    <Badge tone={ongoing ? "cyan" : "muted"}>
                      {ongoing ? "Pågår" : "Planerad"}
                    </Badge>
                  </div>
                  <p className="mb-2 max-w-xl text-sm text-muted">
                    {c.description}
                  </p>
                  <div className="font-mono-num text-[12.5px] text-faint">
                    {new Date(c.starts_at).toLocaleDateString("sv-SE")} –{" "}
                    {new Date(c.ends_at).toLocaleDateString("sv-SE")} ·{" "}
                    {board.length} deltagare
                  </div>
                </div>
                {profile ? (
                  <div className="hidden lg:block">
                    <JoinCompetitionButton
                      competitionId={c.id}
                      joined={joined}
                    />
                  </div>
                ) : null}
              </div>

              {/* Mobile mini leaderboard */}
              <div className="lg:hidden">
                {top3.map((row, i) => (
                  <div
                    key={row.user_id}
                    className={`flex items-center gap-3 border-b border-[#171E2C] px-4 py-3 ${
                      profile && row.user_id === profile.id ? "bg-win/10" : ""
                    }`}
                  >
                    <span className="font-display w-6 text-muted">{i + 1}</span>
                    <span className="flex-1 font-semibold">{row.username}</span>
                    <span
                      className={`font-mono-num font-semibold ${nettoColor(Number(row.netto))}`}
                    >
                      {formatMoney(Number(row.netto))}
                    </span>
                  </div>
                ))}
                {selfIdx >= 3 ? (
                  <div className="border-b border-[#171E2C] bg-win/10 px-4 py-3 text-sm font-semibold text-win">
                    Du: plats {selfIdx + 1}
                  </div>
                ) : null}
                {!board.length ? (
                  <div className="px-4 py-8 text-center text-muted">
                    Inga deltagare ännu.
                  </div>
                ) : null}
                {profile ? (
                  <div className="p-4">
                    <JoinCompetitionButton
                      competitionId={c.id}
                      joined={joined}
                      fullWidth
                    />
                  </div>
                ) : null}
              </div>

              {/* Desktop board */}
              <div className="hidden lg:block">
                {board.map((row, i) => (
                  <div
                    key={row.user_id}
                    className="flex items-center gap-3 border-b border-[#171E2C] px-5 py-3"
                  >
                    <span className="font-display w-6 text-muted">{i + 1}</span>
                    <span className="flex-1 font-semibold">{row.username}</span>
                    <span className="text-[12px] text-muted">
                      {row.bets_count} spel
                    </span>
                    <span
                      className={`font-mono-num font-semibold ${nettoColor(Number(row.roi))}`}
                    >
                      {formatRoi(Number(row.roi))}
                    </span>
                    <span
                      className={`min-w-[96px] text-right font-mono-num font-semibold ${nettoColor(Number(row.netto))}`}
                    >
                      {formatMoney(Number(row.netto))}
                    </span>
                  </div>
                ))}
                {!board.length ? (
                  <div className="px-5 py-8 text-center text-muted">
                    Inga deltagare ännu.
                  </div>
                ) : null}
              </div>
            </Panel>
          );
        })
      )}
    </div>
  );
}
