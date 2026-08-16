"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAdmin } from "@/lib/admin/log";
import { createClient } from "@/lib/supabase/server";
import {
  competitionStatus,
  daysLeft,
  formatCountdown,
  formatPeriod,
  rankBoard,
  type BoardEntry,
  type CompetitionStatus,
  type CompetitionVisibility,
} from "@/lib/competitions";
import type { Competition, LeaderboardRow } from "@/lib/types";

export type CompetitionRow = Competition & {
  status: CompetitionStatus;
  entries: number;
  /** Total stake placed inside the period by entrants (settled bets, same basis as netto). */
  turnover: number;
  days_left: number;
  /** Rendered server-side so tabs and cards agree on "now". */
  countdown: string;
  period: string;
  top3: BoardEntry[];
};

export type CompetitionDraft = {
  id?: string;
  name: string;
  description: string;
  starts_at: string;
  ends_at: string;
  min_bets: number;
  min_total_stake: number;
  prize: string;
  visibility: CompetitionVisibility;
};

/** The board shows up on both public surfaces, so purge them together. */
function revalidateCompetitions() {
  revalidatePath("/admin/tavlingar");
  revalidatePath("/tavlingar");
  revalidatePath("/topplista");
}

export async function listCompetitions(): Promise<CompetitionRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);

  const competitions = (data ?? []) as Competition[];
  if (!competitions.length) return [];

  const ids = competitions.map((c) => c.id);
  const [{ data: entries }, { data: board }] = await Promise.all([
    supabase
      .from("competition_entries")
      .select("competition_id")
      .in("competition_id", ids),
    supabase.from("leaderboard").select("*").in("competition_id", ids),
  ]);

  const entryCount = new Map<string, number>();
  for (const entry of entries ?? []) {
    entryCount.set(
      entry.competition_id,
      (entryCount.get(entry.competition_id) ?? 0) + 1
    );
  }

  const boardByComp = new Map<string, LeaderboardRow[]>();
  for (const row of (board ?? []) as LeaderboardRow[]) {
    if (!row.competition_id) continue;
    const rows = boardByComp.get(row.competition_id) ?? [];
    rows.push(row);
    boardByComp.set(row.competition_id, rows);
  }

  const now = Date.now();
  return competitions.map((competition) => {
    const rows = boardByComp.get(competition.id) ?? [];
    return {
      ...competition,
      status: competitionStatus(competition, now),
      entries: entryCount.get(competition.id) ?? rows.length,
      turnover: rows.reduce((sum, row) => sum + Number(row.total_stake ?? 0), 0),
      days_left: daysLeft(competition.ends_at, now),
      countdown: formatCountdown(competition, now),
      period: formatPeriod(competition.starts_at, competition.ends_at),
      top3: rankBoard(rows, competition).slice(0, 3),
    };
  });
}

export async function saveCompetition(draft: CompetitionDraft) {
  await requireAdmin();
  const supabase = await createClient();

  const name = draft.name.trim();
  if (!name) throw new Error("Namn krävs");
  if (!draft.starts_at || !draft.ends_at) throw new Error("Period krävs");
  if (+new Date(draft.ends_at) <= +new Date(draft.starts_at)) {
    throw new Error("Slutdatum måste ligga efter startdatum");
  }

  const payload = {
    name,
    description: draft.description.trim() || null,
    starts_at: draft.starts_at,
    ends_at: draft.ends_at,
    min_bets: Math.max(0, Math.round(Number(draft.min_bets) || 0)),
    min_total_stake: Math.max(0, Number(draft.min_total_stake) || 0),
    prize: draft.prize.trim() || null,
    visibility: draft.visibility === "invite" ? "invite" : "public",
  };

  if (draft.id) {
    const { error } = await supabase
      .from("competitions")
      .update(payload)
      .eq("id", draft.id);
    if (error) throw new Error(error.message);

    await logAdmin("competition.updated", `tävling ${name}`, {
      id: draft.id,
      visibility: payload.visibility,
      min_bets: payload.min_bets,
      min_total_stake: payload.min_total_stake,
    });
    revalidateCompetitions();
    return { id: draft.id };
  }

  const { data, error } = await supabase
    .from("competitions")
    .insert({ ...payload, active: true })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logAdmin("competition.created", `tävling ${name}`, {
    id: data.id,
    visibility: payload.visibility,
    starts_at: payload.starts_at,
    ends_at: payload.ends_at,
  });
  revalidateCompetitions();
  return { id: data.id };
}

/** Closes the period now — the leaderboard freezes on bets already placed. */
export async function endCompetitionEarly(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: competition } = await supabase
    .from("competitions")
    .select("name, starts_at, ends_at")
    .eq("id", id)
    .maybeSingle();
  if (!competition) throw new Error("Tävlingen finns inte");

  const endsAt = new Date().toISOString();
  const { error } = await supabase
    .from("competitions")
    .update({ ends_at: endsAt })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logAdmin("competition.ended", `tävling ${competition.name}`, {
    id,
    previous_ends_at: competition.ends_at,
    ends_at: endsAt,
  });
  revalidateCompetitions();
  return { ends_at: endsAt };
}
