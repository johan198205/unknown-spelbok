"use client";

import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import { parseMatchSides } from "@/lib/logos";
import { formatPick } from "@/lib/picks";
import {
  betBorderColor,
  planketKickoff,
  planketKr,
  planketOdds,
  settledOutcome,
  type PlanketPost,
} from "@/lib/planket";
import {
  BookmakerPlate,
  FieldLabel,
  LeagueCrest,
  TeamRow,
  VerifiedBadge,
} from "@/components/planket/Bits";

/**
 * Spelkortet i ett inlägg — variant B.
 *
 * Desktop och mobil ritas som två block med samma data i stället för ett
 * block med tio responsiva klasser: lagen är staplade på desktop och en rad
 * på mobil, oddset 30 px mot 22 px, och Verifierad krymper till bara bocken.
 * Det är olika kort, inte samma kort i olika storlek.
 *
 * Kantlinjen bär statusen. Verifierad kommer ur vyn — aldrig ur klienten.
 */

type Sides = { home: string; away: string };

function sidesOf(post: PlanketPost): Sides {
  if (post.home_name && post.away_name) {
    return { home: post.home_name, away: post.away_name };
  }
  const parsed = post.bet_match ? parseMatchSides(post.bet_match) : null;
  return parsed ?? { home: post.bet_match ?? "", away: "" };
}

export function PostBetCard({ post }: { post: PlanketPost }) {
  const sides = sidesOf(post);
  const market = formatPick(post.bet_pick);
  const odds = planketOdds(post.bet_odds);
  const stake = planketKr(Number(post.bet_stake ?? 0));
  const kickoff = planketKickoff(post.kickoff);
  const outcome = settledOutcome(post);
  const bookLogo = getBookmakerLogoUrl(post.bet_bookmaker_logo);
  const border = betBorderColor(post.bet_result);

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <div
        className="mb-[13px] hidden overflow-hidden rounded-[12px] bg-[#1B2233] lg:block"
        style={{ border: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-[9px] border-b border-line px-[14px] py-[11px]">
          <LeagueCrest
            logo={post.bet_league_logo}
            leagueId={post.bet_league_id}
            sport={post.bet_sport}
            name={post.bet_league}
            size={22}
          />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#8A94AB]">
            {post.bet_league || "—"}
          </span>
          {kickoff ? (
            <span className="shrink-0 font-mono-num text-[12.5px] text-[#8A94AB]">
              {kickoff}
            </span>
          ) : null}
          {post.verified ? <VerifiedBadge /> : null}
        </div>

        <div className="p-[14px]">
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <TeamRow
                name={sides.home}
                logo={post.home_logo}
                teamId={post.home_team_id}
                sport={post.bet_sport}
              />
              {sides.away ? (
                <TeamRow
                  name={sides.away}
                  logo={post.away_logo}
                  teamId={post.away_team_id}
                  sport={post.bet_sport}
                />
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <FieldLabel>Odds</FieldLabel>
              <div className="font-mono-num text-[30px] font-semibold leading-none tabular-nums">
                {odds}
              </div>
            </div>
          </div>

          {/*
            flex-wrap: marknadsnamn kan bli långa ("Ö1.5 mål 1:a halvlek").
            Utan wrap trycker de ut spelbolagsplattan och ger vågrät scroll
            i en 640 px-kolumn.
          */}
          <div className="mt-[14px] flex flex-wrap items-center gap-[14px] border-t border-line pt-[13px]">
            <div className="min-w-0">
              <FieldLabel>Marknad</FieldLabel>
              <div className="text-[14.5px] font-bold">{market}</div>
            </div>
            <div className="min-w-0">
              <FieldLabel>Insats</FieldLabel>
              <div className="font-mono-num text-[14.5px] font-semibold tabular-nums">
                {stake}
              </div>
            </div>
            <span className="ml-auto">
              <BookmakerPlate
                name={post.bet_bookmaker_name}
                logoUrl={bookLogo}
                width={76}
                height={32}
              />
            </span>
          </div>

          {outcome ? (
            <div className="mt-[13px] flex items-baseline gap-[9px] border-t border-line pt-3">
              <span className="font-mono-num text-[11.5px] tracking-[0.08em] text-[#5D6883]">
                RÄTTAT
              </span>
              <span
                className="font-mono-num text-[17px] font-semibold tabular-nums"
                style={{ color: outcome.color }}
              >
                {outcome.label}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ---------- Mobil ---------- */}
      <div
        className="mb-3 rounded-[11px] bg-[#1B2233] p-3 lg:hidden"
        style={{ border: `1px solid ${border}` }}
      >
        <div className="mb-[10px] flex items-center gap-2">
          <LeagueCrest
            logo={post.bet_league_logo}
            leagueId={post.bet_league_id}
            sport={post.bet_sport}
            name={post.bet_league}
            size={20}
          />
          <span className="min-w-0 flex-1 truncate text-[12px] text-[#8A94AB]">
            {[post.bet_league, kickoff].filter(Boolean).join(" · ")}
          </span>
          {post.verified ? <VerifiedBadge compact /> : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px]">
              {sides.away ? `${sides.home} – ${sides.away}` : sides.home}
            </div>
            <div className="mt-[2px] truncate text-[13.5px] font-bold">
              {market}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono-num text-[22px] font-semibold leading-none tabular-nums">
              {odds}
            </div>
            <div className="mt-[3px] font-mono-num text-[12px] text-[#5D6883]">
              {stake}
            </div>
          </div>
        </div>

        <div className="mt-[11px] flex items-center gap-2.5 border-t border-line pt-[10px]">
          <BookmakerPlate
            name={post.bet_bookmaker_name}
            logoUrl={bookLogo}
            width={64}
            height={26}
          />
          {outcome ? (
            <span
              className="ml-auto font-mono-num text-[14.5px] font-semibold tabular-nums"
              style={{ color: outcome.color }}
            >
              {outcome.label}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}
