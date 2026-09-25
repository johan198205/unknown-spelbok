import { SectionCard } from "@/components/ui/SectionCard";
import {
  bestGroup,
  leagueKey,
  MIN_BEST_BETS,
  sportKey,
  type BestGroup,
} from "@/lib/breakdowns";
import { formatAmount, type DisplayPrefs } from "@/lib/display";
import type { Bet } from "@/lib/types";
import { cn, formatRoi } from "@/lib/utils";

const SPORT_ICONS: Record<string, string> = {
  Fotboll: "⚽",
  Ishockey: "🏒",
};

/** Räknas fram ur spelen — visas bara när sport eller liga har nått minimikravet. */
export function BestSport({
  bets,
  prefs,
}: {
  bets: Bet[];
  prefs: DisplayPrefs;
}) {
  const sport = bestGroup(bets, sportKey);
  const league = bestGroup(bets, leagueKey);
  if (!sport && !league) return null;

  const leagueLogo = league
    ? bets
        .filter((b) => leagueKey(b) === league.name)
        .map((b) => b.league_logo || b.fixtures?.league_logo)
        .find(Boolean) ?? null
    : null;

  return (
    <SectionCard
      className="mb-8"
      title="Bästa sport"
      action={
        <span className="text-[12px] text-dim">
          Minst {MIN_BEST_BETS} spel · rankas på ROI
        </span>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {sport ? (
          <BestRow
            label="Sport"
            group={sport}
            prefs={prefs}
            icon={
              <span className="text-2xl" aria-hidden>
                {SPORT_ICONS[sport.name] ?? sport.name.slice(0, 2).toUpperCase()}
              </span>
            }
          />
        ) : (
          <Pending label="Sport" />
        )}
        {league ? (
          <BestRow
            label="Liga"
            group={league}
            prefs={prefs}
            icon={
              leagueLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={leagueLogo} alt="" className="size-8 object-contain" />
              ) : (
                <span className="text-sm font-semibold text-cyan">
                  {league.name.slice(0, 2).toUpperCase()}
                </span>
              )
            }
          />
        ) : (
          <Pending label="Liga" />
        )}
      </div>
    </SectionCard>
  );
}

function BestRow({
  label,
  group,
  prefs,
  icon,
}: {
  label: string;
  group: BestGroup;
  prefs: DisplayPrefs;
  icon: React.ReactNode;
}) {
  const tone = group.netto > 0 ? "text-win" : group.netto < 0 ? "text-loss" : "text-text";

  return (
    <div className="flex items-center gap-3.5 rounded-[12px] border border-line bg-panel-2 p-3.5">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-line bg-panel">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] uppercase tracking-[0.13em] text-dim">
          {label}
        </div>
        <div className="font-display truncate text-xl font-semibold">
          {group.name}
        </div>
        <div className="font-mono-num text-[12.5px] text-muted">
          {group.bets} spel · hitrate {group.hitrate.toFixed(1)}%
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={cn("font-mono-num text-xl font-semibold", tone)}>
          {formatRoi(group.roi)}
        </div>
        <div className={cn("font-mono-num text-[12.5px]", tone)}>
          {formatAmount(group.netto, prefs)}
        </div>
      </div>
    </div>
  );
}

function Pending({ label }: { label: string }) {
  return (
    <div className="flex items-center rounded-[12px] border border-dashed border-line p-3.5 text-[13px] text-muted">
      {label}: kvalificeras vid {MIN_BEST_BETS} satta spel
    </div>
  );
}
