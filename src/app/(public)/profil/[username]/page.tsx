import { notFound } from "next/navigation";
import Link from "next/link";
import { formatAmount } from "@/lib/display";
import { getDisplayPrefs } from "@/lib/display-prefs";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeStats, formatRoi, initialOf } from "@/lib/utils";
import type { Bet } from "@/lib/types";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  // Betraktarens läge och unit-storlek — samma val som på publika spelböcker.
  const prefs = await getDisplayPrefs();
  const viewer = await getProfile();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile || profile.banned) notFound();

  const isOwn = viewer?.id === profile.id;
  const bio = profile.bio?.trim() || "";

  const { data: sheets } = await supabase
    .from("sheets")
    .select("*")
    .eq("user_id", profile.id)
    .eq("is_public", true);

  const sheetIds = (sheets ?? []).map((s) => s.id);
  let bets: Bet[] = [];
  if (sheetIds.length) {
    const { data } = await supabase
      .from("bets")
      .select("*")
      .in("sheet_id", sheetIds)
      .order("placed_at", { ascending: false });
    bets = (data ?? []) as Bet[];
  }

  const stats = computeStats(bets);

  return (
    <div className="mx-auto max-w-[800px] px-5 py-10">
      <div className="mb-8 flex items-start gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="size-20 shrink-0 rounded-full border border-line-strong object-cover"
          />
        ) : (
          <span className="font-display flex size-20 shrink-0 items-center justify-center rounded-full border border-line-strong bg-panel-2 text-2xl font-semibold">
            {initialOf(profile.username)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold uppercase tracking-[0.05em]">
            {profile.username}
          </h1>
          <p className="text-muted">Publik profil</p>
          {isOwn ? (
            <Link
              href="/installningar"
              className="mt-2 inline-block text-[13.5px] font-semibold text-cyan no-underline hover:underline"
            >
              Redigera profilbild och bio
            </Link>
          ) : null}
        </div>
      </div>

      {bio ? (
        <div className="mb-8">
          <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-dim">
            Om mig
          </div>
          <p className="max-w-[52ch] text-[15px] leading-relaxed text-text-soft whitespace-pre-wrap">
            {bio}
          </p>
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Spel", value: String(stats.bets) },
          { label: "Netto", value: formatAmount(stats.netto, prefs) },
          { label: "ROI", value: formatRoi(stats.roi) },
          { label: "Hitrate", value: `${stats.hitrate.toFixed(0)}%` },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-[13px] border border-line bg-panel p-4"
          >
            <div className="text-[10.5px] uppercase tracking-[0.13em] text-dim">
              {k.label}
            </div>
            <div className="font-mono-num mt-1 text-xl font-semibold">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {!sheets?.length ? (
        <p className="text-muted">Inga publika spelböcker.</p>
      ) : (
        <div className="space-y-2">
          {sheets.map((s) => (
            <Link
              key={s.id}
              href={s.slug ? `/s/${encodeURIComponent(s.slug)}` : "#"}
              className="block rounded-[12px] border border-line bg-panel px-4 py-3 font-semibold text-text no-underline hover:border-win/40 hover:no-underline"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
