"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { SearchDropdown } from "@/components/ui/SearchDropdown";
import { createClient } from "@/lib/supabase/client";
import type { Bet, BetResult, Bookmaker, Fixture, Sheet } from "@/lib/types";
import {
  LEAGUES,
  PICK_GROUPS,
  SPORTS,
  leaguesForSport,
} from "@/lib/picks";
import { FixturePicker, DayStrip } from "@/components/bets/FixturePicker";
import { FixtureMatch } from "@/components/bets/FixtureMatch";
import { BetRowActions } from "@/components/bets/BetRowActions";
import { LoggedBeforeKickoffIcon } from "@/components/bets/LoggedBeforeKickoff";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { ManualMatchLabel, MatchStack } from "@/components/bets/TeamPair";
import { useLiveFixtures } from "@/hooks/useLiveFixtures";
import {
  applyLiveToBet,
  fixtureFromBet,
  isFinishedStatus,
  isInPlayStatus,
  needsLiveRefresh,
} from "@/lib/live-fixture";
import {
  placedAtForPastBet,
  settlementForFinishedPick,
} from "@/lib/bet-settlement";
import { betLeagueLogo } from "@/lib/logos";
import { stockholmYmd } from "@/lib/stockholm";
import {
  formatMoney,
  formatOdds,
  nettoColor,
  resultLabel,
  resultTone,
  betNetto,
  cn,
} from "@/lib/utils";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import { BookmakerLogo } from "@/components/bets/BookmakerLogo";
import type { LeagueOption } from "@/app/api/leagues/route";
import type { DropdownOption } from "@/components/ui/SearchDropdown";

type MatchMode = "search" | "manual" | "chosen";

function sportToApiSlug(sport: string) {
  const s = sport.toLowerCase();
  if (s.includes("hockey")) return "hockey";
  if (s.includes("fotboll") || s.includes("football")) return "football";
  return null;
}

function leagueOptionIcon(name: string, logo: string | null, id?: number | null) {
  return (
    <LeagueLogo src={logo} leagueId={id} name={name} size={16} />
  );
}

export function BetForm({
  sheets,
  bookmakers,
  defaultSheetId,
  onDone,
}: {
  sheets: Sheet[];
  bookmakers: Bookmaker[];
  defaultSheetId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState(defaultSheetId || sheets[0]?.id || "");
  const [matchMode, setMatchMode] = useState<MatchMode>("search");
  const [match, setMatch] = useState("");
  const [pick, setPick] = useState("");
  const [league, setLeague] = useState("");
  const [leagueId, setLeagueId] = useState<number | null>(null);
  const [leagueLogo, setLeagueLogo] = useState<string | null>(null);
  const [sport, setSport] = useState("");
  const [odds, setOdds] = useState("1.85");
  const [stake, setStake] = useState("100");
  const [bookmakerId, setBookmakerId] = useState("");
  const [fixtureId, setFixtureId] = useState<number | null>(null);
  const [chosenFixture, setChosenFixture] = useState<Fixture | null>(null);
  const [chosenKickoff, setChosenKickoff] = useState<string | null>(null);
  const [ymd, setYmd] = useState(stockholmYmd());
  const [apiLeagues, setApiLeagues] = useState<LeagueOption[]>([]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const slug = sportToApiSlug(sport || "Fotboll");
    if (!slug || matchMode !== "manual") {
      setApiLeagues([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/leagues?sport=${slug}`, { cache: "force-cache" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setApiLeagues(Array.isArray(json.leagues) ? json.leagues : []);
      })
      .catch(() => {
        if (!cancelled) setApiLeagues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [sport, matchMode]);

  const pickGroups = useMemo(() => {
    const groups = PICK_GROUPS[sport] || PICK_GROUPS.Fotboll;
    return groups.map((g) => ({
      label: g.label,
      options: g.options.map((o) => ({ value: o, label: o })),
    }));
  }, [sport]);

  const leagueOptions = useMemo((): DropdownOption[] => {
    if (apiLeagues.length) {
      return apiLeagues.map((l) => ({
        value: l.name,
        label: l.country ? `${l.name} (${l.country})` : l.name,
        icon: leagueOptionIcon(l.name, l.logo, l.id),
      }));
    }
    const forSport = leaguesForSport(sport || "Fotboll");
    const list = forSport.length ? forSport : Object.keys(LEAGUES);
    return list.map((l) => ({
      value: l,
      label: l,
      icon: leagueOptionIcon(l, null),
    }));
  }, [apiLeagues, sport]);

  const bookmakerOptions = useMemo(
    () =>
      bookmakers.map((b) => ({
        value: b.id,
        label: b.name,
        iconUrl: getBookmakerLogoUrl(b.logo_url),
      })),
    [bookmakers]
  );

  function resetForm() {
    setMatchMode("search");
    setMatch("");
    setPick("");
    setLeague("");
    setLeagueId(null);
    setLeagueLogo(null);
    setSport("");
    setOdds("1.85");
    setStake("100");
    setBookmakerId("");
    setFixtureId(null);
    setChosenFixture(null);
    setChosenKickoff(null);
    setYmd(stockholmYmd());
    setError(null);
    setSheetId(defaultSheetId || sheets[0]?.id || "");
  }

  function close() {
    setOpen(false);
    resetForm();
  }

  function selectFixture(f: Fixture) {
    setFixtureId(f.fixture_id);
    setChosenFixture(f);
    setMatch(`${f.home_name} – ${f.away_name}`);
    setLeague(f.league_name || "");
    setLeagueId(f.league_id ?? null);
    setLeagueLogo(f.league_logo ?? null);
    setSport(f.sport || "Fotboll");
    setChosenKickoff(f.kickoff);
    setMatchMode("chosen");
  }

  function goManual() {
    setMatchMode("manual");
    setFixtureId(null);
    setChosenFixture(null);
    setChosenKickoff(null);
  }

  function goSearch() {
    setMatchMode("search");
    setFixtureId(null);
    setChosenFixture(null);
    setChosenKickoff(null);
    setMatch("");
  }

  function applyLeagueChoice(name: string) {
    setLeague(name);
    const fromApi = apiLeagues.find((l) => l.name === name);
    if (fromApi) {
      setLeagueId(fromApi.id);
      setLeagueLogo(fromApi.logo);
      setSport(sport || (sportToApiSlug(sport) === "hockey" ? "Ishockey" : "Fotboll"));
      setPick("");
      return;
    }
    setLeagueId(null);
    setLeagueLogo(null);
    const mapped = LEAGUES[name];
    if (mapped) {
      setSport(mapped);
      setPick("");
    }
  }

  async function submit() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Du måste vara inloggad");
      setLoading(false);
      return;
    }

    const stakeValue = Number(stake);
    const oddsValue = Number(odds);
    const settled = settlementForFinishedPick({
      pick: pick.trim(),
      stake: stakeValue,
      odds: oddsValue,
      status: chosenFixture?.status,
      kickoff: chosenFixture?.kickoff || chosenKickoff,
      homeScore: chosenFixture?.home_score,
      awayScore: chosenFixture?.away_score,
    });
    const placedAt = placedAtForPastBet(
      ymd,
      chosenFixture?.kickoff || chosenKickoff
    );

    const { error: insertError } = await supabase.from("bets").insert({
      sheet_id: sheetId,
      user_id: user.id,
      match: match.trim(),
      pick: pick.trim(),
      league: league || null,
      league_id: leagueId,
      league_logo: leagueLogo,
      sport: sport || "Fotboll",
      odds: oddsValue,
      stake: stakeValue,
      bookmaker_id: bookmakerId || null,
      fixture_id: fixtureId,
      result: settled.result,
      settled_at: settled.settled_at,
      settled_by: settled.settled_by,
      ...(placedAt ? { placed_at: placedAt } : {}),
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    close();
    onDone?.();
    router.refresh();
  }

  if (!sheets.length) {
    return (
      <Panel className="p-4 text-sm text-muted">
        Skapa ett spreadsheet först under Spelbok.
      </Panel>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Lägg nytt spel</Button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-auto bg-[rgba(5,7,12,.72)] px-4 py-10 backdrop-blur-[4px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-bet-title"
            className="animate-sbfade w-full max-w-[640px] rounded-[14px] border border-line-strong bg-panel p-[22px]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3
                id="add-bet-title"
                className="font-display text-[22px] font-semibold"
              >
                Lägg nytt spel
              </h3>
              <button
                type="button"
                onClick={close}
                aria-label="Stäng"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong text-lg text-muted hover:text-text"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sheets.length > 1 ? (
                <div className="sm:col-span-2">
                  <SearchDropdown
                    label="Spreadsheet"
                    value={sheetId}
                    placeholder="Välj spreadsheet …"
                    searchPlaceholder="Sök spreadsheet …"
                    options={sheets.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    onChange={setSheetId}
                  />
                </div>
              ) : null}

              {matchMode === "chosen" ? (
                <div className="sm:col-span-2 rounded-xl border border-blue/35 bg-bg-soft p-3.5 animate-sbfade">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] text-muted">
                      {league ? (
                        <>
                          <LeagueLogo
                            src={leagueLogo}
                            leagueId={leagueId}
                            sport={sport}
                            name={league}
                            size={16}
                          />
                          <span className="min-w-0 truncate">{league}</span>
                        </>
                      ) : (
                        "Match"
                      )}
                      {chosenKickoff
                        ? ` · ${new Date(chosenKickoff).toLocaleString("sv-SE", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </span>
                    <button
                      type="button"
                      onClick={goSearch}
                      className="text-[13px] font-semibold text-blue hover:text-[#7FB0FF]"
                    >
                      Ändra match
                    </button>
                  </div>
                  <div className="font-display text-lg">
                    {chosenFixture ? (
                      <MatchStack
                        homeName={chosenFixture.home_name || ""}
                        awayName={chosenFixture.away_name || ""}
                        homeLogo={chosenFixture.home_logo}
                        awayLogo={chosenFixture.away_logo}
                        homeTeamId={chosenFixture.home_team_id}
                        awayTeamId={chosenFixture.away_team_id}
                        sport={chosenFixture.sport}
                        size={22}
                        homeScore={chosenFixture.home_score}
                        awayScore={chosenFixture.away_score}
                        showScore={
                          isFinishedStatus(chosenFixture.status) &&
                          chosenFixture.home_score != null &&
                          chosenFixture.away_score != null
                        }
                      />
                    ) : (
                      <ManualMatchLabel match={match} size={22} stacked />
                    )}
                  </div>
                </div>
              ) : null}

              {matchMode === "search" ? (
                <div className="sm:col-span-2">
                  <FixturePicker
                    active={open}
                    ymd={ymd}
                    onYmdChange={setYmd}
                    onSelect={selectFixture}
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
                  />
                  <button
                    type="button"
                    onClick={goManual}
                    className="mt-3 text-[13px] font-semibold text-blue hover:text-[#7FB0FF]"
                  >
                    Ange match manuellt ›
                  </button>
                </div>
              ) : null}

              {matchMode === "manual" ? (
                <>
                  <div className="sm:col-span-2">
                    <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
                      Datum
                    </div>
                    <DayStrip ymd={ymd} onChange={setYmd} />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-muted">
                      Manuell match · inget fixture_id
                    </div>
                    <button
                      type="button"
                      onClick={goSearch}
                      className="text-[13px] font-semibold text-blue hover:text-[#7FB0FF]"
                    >
                      Sök match i stället
                    </button>
                  </div>
                  <SearchDropdown
                    label="Sport"
                    value={sport}
                    placeholder="Välj sport …"
                    searchPlaceholder="Sök sport …"
                    options={SPORTS.map((s) => ({ value: s, label: s }))}
                    onChange={(s) => {
                      setSport(s);
                      setLeague("");
                      setLeagueId(null);
                      setLeagueLogo(null);
                      setPick("");
                    }}
                  />
                  <SearchDropdown
                    label="Liga"
                    value={league}
                    placeholder="Välj liga …"
                    searchPlaceholder="Sök liga …"
                    options={leagueOptions}
                    allowCustom
                    customPlaceholder="t.ex. Serie A"
                    onChange={applyLeagueChoice}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Match"
                      value={match}
                      onChange={(e) => setMatch(e.target.value)}
                      placeholder="Liverpool – Arsenal"
                      required
                    />
                  </div>
                </>
              ) : null}

              <SearchDropdown
                label="Spel"
                value={pick}
                placeholder="Välj spel …"
                searchPlaceholder="Sök spel …"
                groups={pickGroups}
                allowCustom
                customPlaceholder="t.ex. Ö1.5 mål 2:a halvlek"
                boldValue
                onChange={setPick}
              />

              <SearchDropdown
                label="Spelbolag"
                value={bookmakerId}
                placeholder="Välj spelbolag …"
                searchPlaceholder="Sök spelbolag …"
                options={bookmakerOptions}
                onChange={setBookmakerId}
              />

              <Input
                label="Insats"
                type="number"
                step="1"
                min="1"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="font-mono-num"
              />
              <Input
                label="Odds"
                type="number"
                step="0.01"
                min="1"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                className="font-mono-num"
              />
            </div>

            {error ? (
              <div className="mt-3 rounded-[9px] border border-loss/35 bg-loss/10 px-3 py-2.5 text-sm text-loss">
                {error}
              </div>
            ) : null}

            <div className="mt-[18px] flex gap-2.5">
              <Button
                className="flex-1 py-[13px] text-[15px]"
                onClick={submit}
                disabled={loading || !match.trim() || !pick.trim()}
              >
                {loading ? "Sparar…" : "Spara spel"}
              </Button>
              <Button variant="secondary" className="px-5 py-[13px]" onClick={close}>
                Avbryt
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Alla rättningar en rad kan sättas till — även för orättade spel. */
const RESULT_CHOICES: Array<{ value: BetResult; short: string; label: string }> =
  [
    { value: "win", short: "W", label: "Vann" },
    { value: "loss", short: "L", label: "Förlorade" },
    { value: "void", short: "V", label: "Void" },
    { value: "open", short: "O", label: "Öppen" },
  ];

function resultChoiceTone(result: BetResult) {
  // resultTone("open") är samma grå som inaktivt läge → egen aktiv-ton.
  if (result === "open") {
    return { bg: "bg-blue/15", fg: "text-blue", border: "border-blue/45" };
  }
  return resultTone(result);
}

export function BetRow({
  bet,
  canEdit,
  canRygga = false,
  onRygga,
}: {
  bet: Bet;
  canEdit: boolean;
  canRygga?: boolean;
  onRygga?: (bet: Bet) => void;
}) {
  const router = useRouter();
  const tone = resultTone(bet.result);
  const netto = betNetto(bet);
  const fixture = fixtureFromBet(bet);
  const showActions = canEdit || canRygga;
  const isLive = isInPlayStatus(fixture?.status);
  const isPending = bet.result === "open";

  async function setResult(result: BetResult) {
    const supabase = createClient();
    const { error } = await supabase
      .from("bets")
      .update({
        result,
        settled_at: result === "open" ? null : new Date().toISOString(),
        settled_by: result === "open" ? null : "user",
      })
      .eq("id", bet.id);
    if (error) {
      alert(error.message || "Kunde inte sätta resultat");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!confirm("Ta bort spelet?")) return;
    const supabase = createClient();
    await supabase.from("bets").delete().eq("id", bet.id);
    router.refresh();
  }

  return (
    <tr
      className={cn(
        "group/row border-b border-[#171E2C] transition-colors hover:bg-[#1A2233]",
        isLive
          ? "bg-live/[0.07] hover:bg-live/[0.11]"
          : isPending
            ? "bg-[#151C2B]"
            : undefined
      )}
    >
      <td className="whitespace-nowrap px-2.5 py-3 align-middle">
        <div className="font-mono-num text-[12.5px] text-[#C3CBDB]">
          {new Date(bet.placed_at).toLocaleDateString("sv-SE")}
        </div>
        {isLive ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-badge bg-live/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-live">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
            Live
          </span>
        ) : isPending ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-badge bg-blue/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-blue">
            Orättat
          </span>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 text-[#C3CBDB]">
        {bet.league ? (
          <span className="inline-flex items-center gap-2">
            <LeagueLogo
              src={betLeagueLogo(bet)}
              leagueId={bet.league_id ?? bet.fixtures?.league_id}
              sport={bet.sport ?? bet.fixtures?.sport}
              name={bet.league}
              size={26}
            />
            <span>{bet.league}</span>
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-2.5 py-3">
        {fixture ? (
          <FixtureMatch fixture={fixture} stacked logoSize={22} />
        ) : (
          <ManualMatchLabel match={bet.match} stacked size={22} />
        )}
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 font-bold">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex w-3.5 shrink-0 justify-center">
            <LoggedBeforeKickoffIcon value={bet.logged_before_kickoff} />
          </span>
          {bet.pick}
        </span>
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 text-[12.5px] text-muted">
        <BookmakerLogo
          logoPath={bet.bookmakers?.logo_url}
          name={bet.bookmakers?.name}
          placeholder
          size={22}
          maxWidth={84}
        />
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 text-right font-mono-num">
        {Number(bet.stake).toLocaleString("sv-SE")}
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 text-right font-mono-num font-semibold">
        {formatOdds(Number(bet.odds))}
      </td>
      <td className="whitespace-nowrap px-2.5 py-3">
        {canEdit ? (
          <div
            role="group"
            aria-label="Rättning"
            className="inline-flex flex-wrap gap-1"
          >
            {RESULT_CHOICES.map(({ value, short, label }) => {
              const active = bet.result === value;
              const t = resultChoiceTone(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setResult(value)}
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  className={cn(
                    "h-[26px] w-[26px] rounded-badge border font-mono-num text-[11px] font-bold transition",
                    active
                      ? `${t.bg} ${t.fg} ${t.border}`
                      : "border-line text-faint hover:border-line-strong hover:text-muted"
                  )}
                >
                  {short}
                </button>
              );
            })}
          </div>
        ) : (
          <span
            className={`rounded px-2 py-1 font-mono-num text-[10px] font-semibold ${tone.bg} ${tone.fg}`}
          >
            {resultLabel(bet.result)}
          </span>
        )}
      </td>
      <td
        className={`whitespace-nowrap px-2.5 py-3 text-right font-mono-num font-semibold ${
          bet.result === "open" ? "text-muted" : nettoColor(netto)
        }`}
      >
        {bet.result === "open" ? "—" : formatMoney(netto)}
      </td>
      {showActions ? (
        <td className="w-[128px] min-w-[128px] px-2.5 py-3">
          <BetRowActions
            bet={bet}
            canEdit={canEdit}
            canRygga={canRygga}
            onRygga={onRygga ? () => onRygga(bet) : undefined}
            onRemove={canEdit ? () => void remove() : undefined}
          />
        </td>
      ) : null}
    </tr>
  );
}

export function BetsTable({
  bets,
  canEdit,
  canRygga = false,
  onRygga,
}: {
  bets: Bet[];
  canEdit: boolean;
  canRygga?: boolean;
  onRygga?: (bet: Bet) => void;
}) {
  const router = useRouter();
  const showActions = canEdit || canRygga;

  const live = useLiveFixtures(
    bets.map((b) => b.fixture_id).filter((id): id is number => id != null),
    {
      hasLive: bets.some((b) =>
        needsLiveRefresh(b.fixtures?.status, b.fixtures?.kickoff)
      ),
      onSettled: () => router.refresh(),
    }
  );

  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
        <thead>
          <tr>
            {[
              "Datum",
              "Liga",
              "Match",
              "Spel",
              "Bolag",
              "Insats",
              "Odds",
              "Resultat",
              "Netto",
              ...(showActions ? [""] : []),
            ].map((label) => (
              <th
                key={label || "actions"}
                className={`sticky top-0 border-b border-line bg-bg-soft px-2.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted ${
                  !label ? "w-[128px] min-w-[128px]" : ""
                }`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => (
            <BetRow
              key={bet.id}
              bet={applyLiveToBet(bet, live)}
              canEdit={canEdit}
              canRygga={canRygga}
              onRygga={onRygga}
            />
          ))}
          {!bets.length ? (
            <tr>
              <td
                colSpan={showActions ? 10 : 9}
                className="px-4 py-10 text-center text-muted"
              >
                Inga spel ännu.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Panel>
  );
}
