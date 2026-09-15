"use client";

import { useState } from "react";
import {
  FixturePicker,
  type PickerFixture,
} from "@/components/bets/FixturePicker";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { MatchStack } from "@/components/bets/TeamPair";
import { useAmount, useDisplayPrefs } from "@/components/DisplayPrefsProvider";
import { track } from "@/lib/analytics";
import {
  placedAtForPastBet,
  settlementForFinishedPick,
} from "@/lib/bet-settlement";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import {
  amountUnitLabel,
  fromUnits,
  stakeError,
} from "@/lib/display";
import { isFinishedStatus } from "@/lib/live-fixture";
import type { AttachableBet } from "@/lib/planket-server";
import { PICKS, STAKE_PRESETS } from "@/lib/picks";
import { stockholmYmd } from "@/lib/stockholm";
import { createClient } from "@/lib/supabase/client";
import type { Bookmaker, Sheet } from "@/lib/types";
import { cn, formatOdds } from "@/lib/utils";

/**
 * Skapa ett nytt spel via samma kaskad som spelboken (datum → sport → liga →
 * match → pick/odds/insats), sedan bifoga det till Planket-inlägget.
 *
 * Spelet landar i spelboken — posts.bet_id kräver en riktig bets-rad, och
 * Verifierad/Rygga bygger på samma modell.
 */
export function AttachNewBet({
  sheets,
  bookmakers,
  onPick,
}: {
  sheets: Sheet[];
  bookmakers: Bookmaker[];
  onPick: (bet: AttachableBet) => void;
}) {
  const amount = useAmount();
  const prefs = useDisplayPrefs();
  const [step, setStep] = useState<1 | 2>(1);
  const [ymd, setYmd] = useState(stockholmYmd());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheetId, setSheetId] = useState(sheets[0]?.id || "");
  const [match, setMatch] = useState("");
  const [pick, setPick] = useState("");
  const [league, setLeague] = useState("");
  const [leagueId, setLeagueId] = useState<number | null>(null);
  const [leagueLogo, setLeagueLogo] = useState<string | null>(null);
  const [sport, setSport] = useState("Fotboll");
  const [odds, setOdds] = useState("1.85");
  const [stake, setStake] = useState(() =>
    prefs.mode === "units" ? "1" : String(prefs.unitSize)
  );
  const [bookmakerId, setBookmakerId] = useState(bookmakers[0]?.id || "");
  const [fixtureId, setFixtureId] = useState<number | null>(null);
  const [chosenFixture, setChosenFixture] = useState<PickerFixture | null>(
    null
  );

  const typedStake = Number(String(stake).replace(",", ".")) || 0;
  const stakeValue =
    prefs.mode === "units" ? fromUnits(typedStake, prefs) : typedStake;
  const potential = stakeValue * (Number(odds || 0) - 1);
  const stakePresets =
    prefs.mode === "units" ? [0.5, 1, 2, 5] : STAKE_PRESETS;
  const pickOptions = PICKS[sport] || PICKS.Fotboll;
  const sheet = sheets.find((s) => s.id === sheetId) ?? sheets[0];

  if (!sheets.length) {
    return (
      <div className="px-3 py-6 text-center text-[13.5px] text-[#5D6883]">
        Skapa en spelbok först under Spelbok — spelet sparas där när du
        bifogar det.
      </div>
    );
  }

  function selectFixture(f: PickerFixture) {
    setFixtureId(f.fixture_id);
    setChosenFixture(f);
    setMatch(`${f.home_name} – ${f.away_name}`);
    setLeague(f.league_name || "");
    setLeagueId(f.league_id ?? null);
    setLeagueLogo(f.league_logo ?? null);
    setSport(f.sport || "Fotboll");
    setPick("");
    setError(null);
    setStep(2);
  }

  async function save() {
    if (!match.trim() || !pick.trim()) {
      setError("Välj match och speltyp.");
      return;
    }
    const stakeProblem = stakeError(stakeValue, prefs);
    if (stakeProblem) {
      setError(stakeProblem);
      return;
    }
    const oddsValue = Number(String(odds).replace(",", "."));
    if (!Number.isFinite(oddsValue) || oddsValue < 1.01) {
      setError("Ange giltiga odds.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Du måste vara inloggad.");
      return;
    }

    const settled = settlementForFinishedPick({
      pick: pick.trim(),
      stake: stakeValue,
      odds: oddsValue,
      status: chosenFixture?.status,
      kickoff: chosenFixture?.kickoff,
      homeScore: chosenFixture?.home_score,
      awayScore: chosenFixture?.away_score,
    });
    const placedAt = placedAtForPastBet(ymd, chosenFixture?.kickoff);
    const kickoff = chosenFixture?.kickoff ?? null;

    const { data, error: insertError } = await supabase
      .from("bets")
      .insert({
        sheet_id: sheetId,
        user_id: user.id,
        match: match.trim(),
        pick: pick.trim(),
        league: league || null,
        league_id: leagueId,
        league_logo: leagueLogo,
        sport,
        odds: oddsValue,
        stake: stakeValue,
        bookmaker_id: bookmakerId || null,
        fixture_id: fixtureId,
        result: settled.result,
        settled_at: settled.settled_at,
        settled_by: settled.settled_by,
        ...(placedAt ? { placed_at: placedAt } : {}),
      })
      .select("id")
      .maybeSingle();

    setLoading(false);

    if (insertError || !data) {
      setError(insertError?.message || "Kunde inte spara spelet.");
      return;
    }

    track({
      event: "create_bet",
      sport,
      liga: league || "Okänd liga",
      odds: oddsValue,
      insats: stakeValue,
    });

    const now = Date.now();
    onPick({
      id: data.id,
      match: match.trim(),
      pick: pick.trim(),
      odds: oddsValue,
      stake: stakeValue,
      league: league || null,
      league_id: leagueId,
      league_logo: leagueLogo,
      sport,
      kickoff,
      sheet_id: sheetId,
      sheet_name: sheet?.name ?? "Spelbok",
      sheet_private: sheet ? !sheet.is_public : false,
      posted: false,
      verified: !!kickoff && now < new Date(kickoff).getTime(),
    });
  }

  if (step === 1) {
    return (
      <div className="space-y-3 p-3">
        <FixturePicker
          active
          ymd={ymd}
          onYmdChange={setYmd}
          onMetaChange={({
            sport: nextSport,
            league: nextLeague,
            leagueId: nextLeagueId,
            leagueLogo: nextLeagueLogo,
          }) => {
            if (nextSport) setSport(nextSport);
            if (nextLeague) setLeague(nextLeague);
            if (nextLeagueId != null) setLeagueId(nextLeagueId);
            if (nextLeagueLogo != null) setLeagueLogo(nextLeagueLogo);
          }}
          onSelect={selectFixture}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3.5 p-3">
      <div className="rounded-[10px] border border-line bg-[#151B2B] p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px] text-[#8A94AB]">
            {league ? (
              <>
                <LeagueLogo
                  src={leagueLogo}
                  leagueId={leagueId}
                  sport={sport}
                  name={league}
                  size={14}
                />
                <span className="min-w-0 truncate">{league}</span>
              </>
            ) : (
              "Match"
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setError(null);
            }}
            className="shrink-0 cursor-pointer text-[12.5px] font-semibold text-blue hover:text-[#7FB0FF]"
          >
            Ändra match
          </button>
        </div>
        {chosenFixture ? (
          <MatchStack
            homeName={chosenFixture.home_name || ""}
            awayName={chosenFixture.away_name || ""}
            homeLogo={chosenFixture.home_logo}
            awayLogo={chosenFixture.away_logo}
            homeTeamId={chosenFixture.home_team_id}
            awayTeamId={chosenFixture.away_team_id}
            sport={chosenFixture.sport}
            size={18}
            homeScore={chosenFixture.home_score}
            awayScore={chosenFixture.away_score}
            showScore={
              isFinishedStatus(chosenFixture.status) &&
              chosenFixture.home_score != null &&
              chosenFixture.away_score != null
            }
          />
        ) : (
          <div className="text-[14.5px] font-semibold">{match}</div>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5D6883]">
          Speltyp
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pickOptions.slice(0, 12).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPick(p)}
              className={cn(
                "cursor-pointer rounded-[8px] border px-2.5 py-1.5 text-[12.5px] font-semibold",
                pick === p
                  ? "border-[rgba(102,227,138,.4)] bg-[rgba(102,227,138,.12)] text-win"
                  : "border-line-strong bg-[#1B2233] text-[#C3CBDB] hover:border-[#3A4560]"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          placeholder="Eget tipp…"
          className="mt-2 w-full rounded-[9px] border border-line-strong bg-[#1B2233] px-3 py-2.5 text-[14px] text-text outline-none focus:border-[#3A4560]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5D6883]">
            Odds
          </label>
          <input
            inputMode="decimal"
            value={odds}
            onChange={(e) => setOdds(e.target.value)}
            className="w-full rounded-[9px] border border-line-strong bg-[#1B2233] px-3 py-2.5 font-mono-num text-[16px] font-semibold outline-none focus:border-[#3A4560]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5D6883]">
            Insats ({amountUnitLabel(prefs)})
          </label>
          <input
            inputMode="decimal"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="w-full rounded-[9px] border border-line-strong bg-[#1B2233] px-3 py-2.5 font-mono-num text-[16px] font-semibold outline-none focus:border-[#3A4560]"
          />
        </div>
      </div>

      <div className="flex gap-1.5">
        {stakePresets.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStake(String(n))}
            className="flex-1 cursor-pointer rounded-[8px] border border-line-strong bg-[#1B2233] py-1.5 font-mono-num text-[12px] font-semibold text-[#8A94AB] hover:border-[#3A4560] hover:text-text"
          >
            {n}
          </button>
        ))}
      </div>

      {bookmakers.length > 0 ? (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5D6883]">
            Bolag
          </div>
          <div className="flex gap-1.5 overflow-x-auto sb-scroll pb-0.5">
            {bookmakers.map((b) => {
              const logo = getBookmakerLogoUrl(b.logo_url);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBookmakerId(b.id)}
                  className={cn(
                    "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12.5px] font-semibold",
                    bookmakerId === b.id
                      ? "border-[rgba(102,227,138,.4)] bg-[rgba(102,227,138,.12)] text-win"
                      : "border-line-strong bg-[#1B2233] text-[#8A94AB]"
                  )}
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4 object-contain"
                    />
                  ) : null}
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {sheets.length > 1 ? (
        <select
          value={sheetId}
          onChange={(e) => setSheetId(e.target.value)}
          className="w-full rounded-[9px] border border-line-strong bg-[#1B2233] px-3 py-2.5 text-[14px] text-text"
        >
          {sheets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : null}

      <div className="rounded-[9px] border border-line-soft bg-[#151B2B] px-3 py-2.5">
        <div className="text-[11.5px] text-[#5D6883]">Möjlig vinst</div>
        <div className="font-mono-num text-[17px] font-semibold text-win">
          {amount(potential)}{" "}
          <span className="text-[12px] text-[#5D6883]">
            @ {formatOdds(Number(String(odds).replace(",", ".")) || 0)}
          </span>
        </div>
      </div>

      <p className="text-[11.5px] leading-[1.45] text-[#5D6883]">
        Spelet sparas i {sheet?.name ?? "spelboken"} och syns på Planket när
        du postar.
        {sheet && !sheet.is_public
          ? " Resten av boken förblir privat."
          : null}
      </p>

      {error ? (
        <div className="rounded-[8px] border border-loss/40 bg-loss/10 px-3 py-2 text-[13px] text-loss">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        disabled={loading || !pick.trim()}
        onClick={() => void save()}
        className={cn(
          "w-full rounded-[9px] px-4 py-2.5 text-[14px] font-bold",
          loading || !pick.trim()
            ? "cursor-not-allowed border border-line-strong bg-[#1B2233] text-[#5D6883]"
            : "cursor-pointer border border-win bg-win text-win-ink hover:brightness-105"
        )}
      >
        {loading ? "Sparar…" : "Bifoga spel"}
      </button>
    </div>
  );
}
