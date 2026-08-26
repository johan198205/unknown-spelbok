import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchSiteSettings } from "@/lib/site-settings";
import { Badge, EmptyState, Panel } from "@/components/ui/Panel";
import { JoinCompetitionButton } from "@/components/bets/JoinCompetitionButton";
import { CompetitionBoard } from "@/components/competitions/CompetitionBoard";
import {
  competitionStatus,
  formatCountdown,
  formatPeriod,
  rankBoard,
  rulesSummary,
} from "@/lib/competitions";
import type { Competition, LeaderboardRow } from "@/lib/types";

export default async function TavlingarPage() {
  await requireUser();
  const profile = await getProfile();
  const supabase = await createClient();

  // Middleware fångar det normalt — det här skyddar direktrender och cache.
  const site = await fetchSiteSettings(supabase);
  if (!site.competitions_enabled) redirect("/topplista");

  const { data: competitions } = await supabase
    .from("competitions")
    .select("*")
    .eq("active", true)
    .order("starts_at", { ascending: false });

  const all = (competitions || []) as Competition[];

  const joinedIds = new Set<string>();
  if (profile && all.length) {
    const { data: entries } = await supabase
      .from("competition_entries")
      .select("competition_id")
      .eq("user_id", profile.id)
      .in(
        "competition_id",
        all.map((c) => c.id)
      );
    for (const entry of entries || []) joinedIds.add(entry.competition_id);
  }

  // Invite-only competitions stay hidden unless you are already entered.
  const comps = all.filter(
    (c) => c.visibility !== "invite" || joinedIds.has(c.id)
  );

  const boards: Record<string, LeaderboardRow[]> = {};
  if (comps.length) {
    const { data } = await supabase
      .from("leaderboard")
      .select("*")
      .in(
        "competition_id",
        comps.map((c) => c.id)
      );
    for (const row of (data || []) as LeaderboardRow[]) {
      if (!row.competition_id) continue;
      boards[row.competition_id] = [
        ...(boards[row.competition_id] || []),
        row,
      ];
    }
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
          const joined = joinedIds.has(c.id);
          const entries = rankBoard(boards[c.id] || [], c);
          const status = competitionStatus(c);
          const rules = rulesSummary(c);
          const self = profile
            ? entries.find((e) => e.user_id === profile.id)
            : undefined;

          return (
            /* id:t är målet för notiser om tävlingsplacering. */
            <Panel key={c.id} id={`tavling-${c.id}`} className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 lg:px-5">
                <div className="w-full lg:w-auto">
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="font-display text-xl font-semibold">
                      {c.name}
                    </h2>
                    <Badge
                      tone={
                        status === "live"
                          ? "cyan"
                          : status === "upcoming"
                            ? "muted"
                            : "yellow"
                      }
                    >
                      {status === "live"
                        ? "Pågår"
                        : status === "upcoming"
                          ? "Planerad"
                          : "Avslutad"}
                    </Badge>
                  </div>
                  {c.description ? (
                    <p className="mb-2 max-w-xl text-sm text-muted">
                      {c.description}
                    </p>
                  ) : null}
                  <div className="font-mono-num text-[12.5px] text-faint">
                    {formatPeriod(c.starts_at, c.ends_at)} · {entries.length}{" "}
                    deltagare · {formatCountdown(c)}
                  </div>
                  {rules ? (
                    <div className="mt-1 text-[12.5px] text-muted">{rules}</div>
                  ) : null}
                  {c.prize ? (
                    <div className="mt-1 text-[12.5px] text-yellow">
                      Pris: {c.prize}
                    </div>
                  ) : null}
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
                <CompetitionBoard
                  entries={entries.slice(0, 3)}
                  rules={c}
                  selfId={profile?.id}
                  dense
                />
                {self && (self.rank === null || self.rank > 3) ? (
                  <div className="border-b border-rowline bg-win/10 px-4 py-3 text-sm font-semibold text-win">
                    {self.qualified
                      ? `Du: plats ${self.rank}`
                      : "Du: ej kvalificerad ännu"}
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
              <CompetitionBoard
                entries={entries}
                rules={c}
                selfId={profile?.id}
                className="hidden lg:block"
              />
            </Panel>
          );
        })
      )}
    </div>
  );
}
