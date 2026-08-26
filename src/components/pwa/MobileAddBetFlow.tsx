"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Bookmaker, Sheet } from "@/lib/types";
import { PICKS, STAKE_PRESETS } from "@/lib/picks";
import { track } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { enqueuePendingBet } from "@/lib/offline-queue";
import { FixturePicker, DayStrip, type PickerFixture } from "@/components/bets/FixturePicker";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { ManualMatchLabel, MatchStack } from "@/components/bets/TeamPair";
import { useAmount, useDisplayPrefs } from "@/components/DisplayPrefsProvider";
import { amountUnitLabel, fromUnits, stakeError } from "@/lib/display";
import { cn, formatOdds } from "@/lib/utils";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import {
  placedAtForPastBet,
  settlementForFinishedPick,
} from "@/lib/bet-settlement";
import { isFinishedStatus } from "@/lib/live-fixture";
import { stockholmYmd } from "@/lib/stockholm";

export function MobileAddBetFlow({
  sheets,
  bookmakers,
  onClose,
  onSaved,
  prefillFixture,
}: {
  sheets: Sheet[];
  bookmakers: Bookmaker[];
  onClose: () => void;
  onSaved: () => void;
  /** Matchen är redan vald (förslagskort) — guiden startar på steg 2. */
  prefillFixture?: PickerFixture | null;
}) {
  const amount = useAmount();
  const prefs = useDisplayPrefs();
  const router = useRouter();
  const online = useOnlineStatus();
  // Guiden monteras om varje gång den öppnas, så förifyllningen hör hemma
  // i initialvärdena i stället för i en effekt.
  const [step, setStep] = useState(prefillFixture ? 2 : 1);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState(sheets[0]?.id || "");
  const [match, setMatch] = useState(
    prefillFixture
      ? `${prefillFixture.home_name} – ${prefillFixture.away_name}`
      : ""
  );
  const [pick, setPick] = useState("");
  const [league, setLeague] = useState(prefillFixture?.league_name || "");
  const [leagueId, setLeagueId] = useState<number | null>(
    prefillFixture?.league_id ?? null
  );
  const [leagueLogo, setLeagueLogo] = useState<string | null>(
    prefillFixture?.league_logo ?? null
  );
  const [sport, setSport] = useState(prefillFixture?.sport || "Fotboll");
  const [odds, setOdds] = useState("1.90");
  const [stake, setStake] = useState(() =>
    prefs.mode === "units" ? "1" : String(prefs.unitSize)
  );
  const [bookmakerId, setBookmakerId] = useState(bookmakers[0]?.id || "");
  const [fixtureId, setFixtureId] = useState<number | null>(
    prefillFixture?.fixture_id ?? null
  );
  const [chosenFixture, setChosenFixture] = useState<PickerFixture | null>(
    prefillFixture ?? null
  );
  const [ymd, setYmd] = useState(stockholmYmd());

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Insatsen skrivs i det läge användaren står i; allt nedanför räknar i
  // valuta så payout och validering blir jämförbara med lagrade spel.
  const typedStake = Number(String(stake).replace(",", ".")) || 0;
  const stakeValue =
    prefs.mode === "units" ? fromUnits(typedStake, prefs) : typedStake;
  const potential = stakeValue * (Number(odds || 0) - 1);
  const stakePresets =
    prefs.mode === "units" ? [0.5, 1, 2, 5] : STAKE_PRESETS;
  const pickOptions = PICKS[sport] || PICKS.Fotboll;

  async function save() {
    const stakeProblem = stakeError(stakeValue, prefs);
    if (stakeProblem) {
      setError(stakeProblem);
      return;
    }

    setLoading(true);
    setError(null);
    const oddsValue = Number(odds);
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
    const payload = {
      sheet_id: sheetId,
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
    };

    if (!online) {
      await enqueuePendingBet(payload);
      setLoading(false);
      onSaved();
      router.refresh();
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Du måste vara inloggad");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("bets").insert({
      ...payload,
      user_id: user.id,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    track({
      event: "create_bet",
      sport,
      liga: league || "Okänd liga",
      odds: oddsValue,
      insats: stakeValue,
    });

    onSaved();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg-soft lg:hidden">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
          className="text-muted"
          aria-label="Tillbaka"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="font-display text-[17px] font-semibold">
            Lägg nytt spel
          </div>
          <div className="mt-1 flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  n <= step ? "bg-win" : "bg-line"
                )}
              />
            ))}
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-muted text-xl">
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {step === 1 ? (
          <div className="space-y-3">
            {!manual ? (
              <>
                <FixturePicker
                  active={step === 1}
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
                  onSelect={(f) => {
                    setFixtureId(f.fixture_id);
                    setChosenFixture(f);
                    setMatch(`${f.home_name} – ${f.away_name}`);
                    setLeague(f.league_name || "");
                    setLeagueId(f.league_id ?? null);
                    setLeagueLogo(f.league_logo ?? null);
                    setSport(f.sport || "Fotboll");
                    setStep(2);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setManual(true);
                    setFixtureId(null);
                    setChosenFixture(null);
                    setLeagueId(null);
                    setLeagueLogo(null);
                  }}
                  className="w-full py-3 text-center text-sm font-semibold text-cyan"
                >
                  Skriv match manuellt
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
                    Datum
                  </div>
                  <DayStrip ymd={ymd} onChange={setYmd} />
                </div>
                <input
                  value={match}
                  onChange={(e) => setMatch(e.target.value)}
                  placeholder="Liverpool – Arsenal"
                  className="w-full rounded-[9px] border border-line bg-panel px-3.5 py-3 text-[15px] outline-none"
                />
                <input
                  value={league}
                  onChange={(e) => setLeague(e.target.value)}
                  placeholder="Liga"
                  className="w-full rounded-[9px] border border-line bg-panel px-3.5 py-3 text-[15px] outline-none"
                />
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full rounded-[9px] border border-line bg-panel px-3.5 py-3 text-[15px]"
                >
                  <option>Fotboll</option>
                  <option>Ishockey</option>
                </select>
                <button
                  type="button"
                  disabled={!match.trim()}
                  onClick={() => setStep(2)}
                  className="w-full rounded-[13px] bg-win py-3.5 font-bold text-win-ink disabled:opacity-40"
                >
                  Fortsätt
                </button>
              </div>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="rounded-[12px] border border-line bg-panel p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-faint">
                {league ? (
                  <>
                    <LeagueLogo
                      src={leagueLogo}
                      leagueId={leagueId}
                      sport={sport}
                      name={league}
                      size={14}
                    />
                    <span>{league}</span>
                  </>
                ) : (
                  "Match"
                )}
              </div>
              <div className="mt-1">
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
                  <ManualMatchLabel match={match} size={18} stacked />
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Snabbval
              </div>
              <div className="flex flex-wrap gap-2">
                {pickOptions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPick(p)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                      pick === p
                        ? "border-win bg-win/10 text-win"
                        : "border-line bg-panel text-muted"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              placeholder="Eget tipp…"
              className="w-full rounded-[9px] border border-line bg-panel px-3.5 py-3.5 text-[16px] outline-none"
            />
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Bolag
              </div>
              <div className="flex gap-2 overflow-x-auto sb-scroll pb-1">
                {bookmakers.map((b) => {
                  const logo = getBookmakerLogoUrl(b.logo_url);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBookmakerId(b.id)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold",
                        bookmakerId === b.id
                          ? "border-win bg-win/10 text-win"
                          : "border-line bg-panel text-muted"
                      )}
                    >
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo}
                          alt=""
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px] object-contain"
                        />
                      ) : null}
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
            {sheets.length > 1 ? (
              <select
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                className="w-full rounded-[9px] border border-line bg-panel px-3.5 py-3 text-[15px]"
              >
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              disabled={!pick.trim()}
              onClick={() => setStep(3)}
              className="w-full rounded-[13px] bg-win py-3.5 font-bold text-win-ink disabled:opacity-40"
            >
              Fortsätt
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Insats ({amountUnitLabel(prefs)})
              </label>
              <input
                inputMode="decimal"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="w-full rounded-[12px] border border-line bg-panel px-4 py-4 font-mono-num text-[28px] font-semibold outline-none focus:border-blue"
              />
              <div className="mt-2 flex gap-2">
                {stakePresets.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStake(String(n))}
                    className="flex-1 rounded-[9px] border border-line bg-panel-2 py-2 font-mono-num text-sm font-semibold text-muted"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Odds
              </label>
              <input
                inputMode="decimal"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                className="w-full rounded-[12px] border border-line bg-panel px-4 py-4 font-mono-num text-[28px] font-semibold outline-none focus:border-blue"
              />
            </div>
            <div className="rounded-[12px] border border-line bg-panel px-4 py-3">
              <div className="text-[12px] text-muted">Möjlig vinst</div>
              <div className="font-mono-num text-[22px] font-semibold text-win">
                {amount(potential)}{" "}
                <span className="text-sm text-faint">
                  @ {formatOdds(Number(odds) || 0)}
                </span>
              </div>
            </div>
            {error ? (
              <div className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
                {error}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {step === 3 ? (
        <div className="absolute inset-x-0 bottom-0 border-t border-line bg-bg-soft px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={loading || !match || !pick}
            onClick={save}
            className="w-full rounded-[13px] bg-win py-4 text-[15px] font-bold text-win-ink disabled:opacity-40"
          >
            {loading ? "Sparar…" : online ? "Spara spel" : "Spara offline"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
