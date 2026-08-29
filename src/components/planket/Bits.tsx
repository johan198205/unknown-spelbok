"use client";

import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { TeamLogo } from "@/components/bets/TeamPair";
import { planketRoi, showRoiBadge } from "@/lib/planket";
import { teamLogoUrl } from "@/lib/logos";
import { cn, initialOf } from "@/lib/utils";

/**
 * Små delar som Planket-korten delar. Egen fil så inläggskortet slipper
 * bära dem och så mobil- och desktopvarianten garanterat ser likadana ut.
 */

/** Ligalogga i rundad platta — samma behandling som i dashboardens listor. */
export function LeagueCrest({
  logo,
  leagueId,
  sport,
  name,
  size = 22,
}: {
  logo?: string | null;
  leagueId?: number | null;
  sport?: string | null;
  name?: string | null;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[rgba(230,234,242,0.07)] p-[2px]"
      style={{ width: size, height: size }}
    >
      <LeagueLogo
        src={logo}
        leagueId={leagueId}
        sport={sport}
        name={name}
        size={size - 4}
      />
    </span>
  );
}

/** Lagrad med logga: [logga] Lagnamn, med ellips på namnet. */
export function TeamRow({
  name,
  logo,
  teamId,
  sport,
  size = 24,
  textClass = "text-[15px]",
}: {
  name: string;
  logo?: string | null;
  teamId?: number | null;
  sport?: string | null;
  size?: number;
  textClass?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-[9px]">
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-[rgba(230,234,242,0.07)] p-[2px]"
        style={{ width: size, height: size }}
      >
        <TeamLogo
          src={teamLogoUrl(logo, teamId, sport)}
          size={size - 4}
          initial={name}
        />
      </span>
      <span className={cn("min-w-0 truncate", textClass)}>{name}</span>
    </div>
  );
}

/**
 * Bocken ritas som background-image, aldrig som <img src>. En literal src
 * mot en data-URI är fine, men bakgrundsbilden gör att ikonen inte kan
 * starta en nätverkshämtning ens om värdet skulle bli tomt.
 */
const CHECK =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
      'stroke="#66E38A" stroke-width="2.6" stroke-linecap="round" ' +
      'stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"/></svg>'
  );

/**
 * VERIFIERAD.
 *
 * Kommer alltid från serverns jämförelse bets.placed_at < fixtures.kickoff
 * (vyn planket_posts). Komponenten räknar ingenting — den får ett booleskt
 * värde och ritar det. Finns ingen avspark finns ingen badge.
 *
 * På mobil krymper den till bara bocken, utan text.
 */
export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        title="Loggat i spelboken före avspark"
        aria-label="Verifierad — loggat i spelboken före avspark"
        className="block shrink-0 bg-center bg-no-repeat"
        style={{
          width: 13,
          height: 13,
          backgroundImage: `url("${CHECK}")`,
          backgroundSize: "contain",
        }}
      />
    );
  }

  return (
    <span
      title="Loggat i spelboken före avspark"
      className="inline-flex shrink-0 items-center gap-[5px] rounded-[6px] bg-[rgba(102,227,138,.14)] px-2 py-[3px] text-[11px] font-semibold tracking-[0.04em] text-win"
    >
      <span
        aria-hidden
        className="block bg-center bg-no-repeat"
        style={{
          width: 11,
          height: 11,
          backgroundImage: `url("${CHECK}")`,
          backgroundSize: "contain",
        }}
      />
      Verifierad
    </span>
  );
}

/**
 * ROI-badgen hör till FÖRFATTARENS SPELBOK, aldrig till inlägget.
 *
 * Under 20 rättade spel renderas ingenting alls: en ROI på fem spel säger
 * inget om träffsäkerhet, och en siffra som inte betyder något är sämre än
 * ingen siffra.
 */
export function RoiBadge({
  roi,
  settledBets,
  compact = false,
}: {
  roi: number | null;
  settledBets: number | null;
  compact?: boolean;
}) {
  if (roi == null || !showRoiBadge(settledBets)) return null;
  const up = roi >= 0;

  return (
    <span
      title="ROI i spelboken"
      className={cn(
        "shrink-0 rounded-[6px] font-mono-num font-semibold",
        compact ? "px-[6px] py-[2px] text-[11.5px]" : "px-[7px] py-[3px] text-[12px]"
      )}
      style={{
        background: up ? "rgba(102,227,138,.14)" : "rgba(232,105,122,.14)",
        color: up ? "#66E38A" : "#E8697A",
      }}
    >
      {planketRoi(roi)}
    </span>
  );
}

/** Rund initialbricka. Samma behandling som avatarerna i headern. */
export function Avatar({
  username,
  size = 38,
  className,
}: {
  username: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-panel-2 font-display font-semibold text-text",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initialOf(username)}
    </span>
  );
}

/** Etikett i versaler över ett värde: ODDS, MARKNAD, INSATS. */
export function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-[3px] text-[10px] uppercase tracking-[0.13em] text-[#5D6883]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Spelbolagets logotyp på varumärkesfärgad platta, med namnet som title. */
export function BookmakerPlate({
  name,
  logoUrl,
  width = 76,
  height = 32,
}: {
  name: string | null;
  logoUrl: string | null;
  width?: number;
  height?: number;
}) {
  if (!name && !logoUrl) return null;

  return (
    <span
      title={name || undefined}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-line-strong bg-[#0F1420]"
      style={{ width, height }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name || ""}
          className="max-h-full max-w-full object-contain p-1"
        />
      ) : (
        <span className="truncate px-1 text-[10.5px] font-semibold text-muted">
          {name}
        </span>
      )}
    </span>
  );
}
