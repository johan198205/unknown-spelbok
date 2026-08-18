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
import { FixturePicker } from "@/components/bets/FixturePicker";
import { FixtureMatch } from "@/components/bets/FixtureMatch";
import { MatchStack } from "@/components/bets/TeamPair";
import { useLiveFixtures } from "@/hooks/useLiveFixtures";
import {
  applyLiveToBet,
  fixtureFromBet,
  needsLiveRefresh,
} from "@/lib/live-fixture";
import {
  formatMoney,
  formatOdds,
  nettoColor,
  resultLabel,
  resultTone,
  betNetto,
  cn,
} from "@/lib/utils";

const RESULTS: BetResult[] = ["open", "win", "loss", "void", "halfwin", "halfloss"];

type MatchMode = "search" | "manual" | "chosen";

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
  const [sport, setSport] = useState("Fotboll");
  const [odds, setOdds] = useState("1.85");
  const [stake, setStake] = useState("100");
  const [bookmakerId, setBookmakerId] = useState("");
  const [fixtureId, setFixtureId] = useState<number | null>(null);
  const [chosenFixture, setChosenFixture] = useState<Fixture | null>(null);
  const [chosenKickoff, setChosenKickoff] = useState<string | null>(null);

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

  const pickGroups = useMemo(() => {
    const groups = PICK_GROUPS[sport] || PICK_GROUPS.Fotboll;
    return groups.map((g) => ({
      label: g.label,
      options: g.options.map((o) => ({ value: o, label: o })),
    }));
  }, [sport]);

  const leagueOptions = useMemo(() => {
    const forSport = leaguesForSport(sport);
    const list = forSport.length ? forSport : Object.keys(LEAGUES);
    return list.map((l) => ({ value: l, label: l }));
  }, [sport]);

  const bookmakerOptions = useMemo(
    () => bookmakers.map((b) => ({ value: b.id, label: b.name })),
    [bookmakers]
  );

  function resetForm() {
    setMatchMode("search");
    setMatch("");
    setPick("");
    setLeague("");
    setSport("Fotboll");
    setOdds("1.85");
    setStake("100");
    setBookmakerId("");
    setFixtureId(null);
    setChosenFixture(null);
    setChosenKickoff(null);
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

    const { error: insertError } = await supabase.from("bets").insert({
      sheet_id: sheetId,
      user_id: user.id,
      match: match.trim(),
      pick: pick.trim(),
      league: league || null,
      sport,
      odds: Number(odds),
      stake: Number(stake),
      bookmaker_id: bookmakerId || null,
      fixture_id: fixtureId,
      result: "open",
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
                    <span className="flex-1 text-[13px] text-muted">
                      {league || "Match"}
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
                      />
                    ) : (
                      <span className="font-semibold">{match}</span>
                    )}
                  </div>
                </div>
              ) : null}

              {matchMode === "search" ? (
                <div className="sm:col-span-2">
                  <FixturePicker
                    active={open}
                    onSelect={selectFixture}
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
                      const ok = leaguesForSport(s);
                      if (league && !ok.includes(league)) setLeague("");
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
                    onChange={(l) => {
                      setLeague(l);
                      const mapped = LEAGUES[l];
                      if (mapped) {
                        setSport(mapped);
                        setPick("");
                      }
                    }}
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

export function BetRow({
  bet,
  canEdit,
}: {
  bet: Bet;
  canEdit: boolean;
}) {
  const router = useRouter();
  const tone = resultTone(bet.result);
  const netto = betNetto(bet);
  const fixture = fixtureFromBet(bet);

  async function setResult(result: BetResult) {
    const supabase = createClient();
    await supabase
      .from("bets")
      .update({
        result,
        settled_at: result === "open" ? null : new Date().toISOString(),
        settled_by: result === "open" ? null : "user",
      })
      .eq("id", bet.id);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Ta bort spelet?")) return;
    const supabase = createClient();
    await supabase.from("bets").delete().eq("id", bet.id);
    router.refresh();
  }

  return (
    <tr className="border-b border-[#171E2C] hover:bg-[#1A2233]">
      <td className="whitespace-nowrap px-2.5 py-3 font-mono-num text-[12.5px] text-[#C3CBDB]">
        {new Date(bet.placed_at).toLocaleDateString("sv-SE")}
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 text-[#C3CBDB]">
        {bet.league || "—"}
      </td>
      <td className="px-2.5 py-3">
        {fixture ? <FixtureMatch fixture={fixture} /> : bet.match}
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 font-bold">{bet.pick}</td>
      <td className="whitespace-nowrap px-2.5 py-3 text-[12.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          {bet.bookmakers?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bet.bookmakers.logo_url}
              alt=""
              className="h-4 w-4 object-contain"
            />
          ) : null}
          {bet.bookmakers?.name || "—"}
        </span>
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 text-right font-mono-num">
        {Number(bet.stake).toLocaleString("sv-SE")}
      </td>
      <td className="whitespace-nowrap px-2.5 py-3 text-right font-mono-num font-semibold">
        {formatOdds(Number(bet.odds))}
      </td>
      <td className="whitespace-nowrap px-2.5 py-3">
        {canEdit ? (
          <div className="inline-flex flex-wrap gap-1">
            {(["win", "loss", "void", "open"] as BetResult[]).map((r) => {
              const active = bet.result === r;
              const t = resultTone(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResult(r)}
                  className={`rounded border px-1.5 py-1 font-mono-num text-[10px] font-semibold ${
                    active ? `${t.bg} ${t.fg} ${t.border}` : "border-line text-faint"
                  }`}
                >
                  {r === "win" ? "W" : r === "loss" ? "L" : r === "void" ? "V" : "O"}
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
      {canEdit ? (
        <td className="px-2.5 py-3">
          <button
            type="button"
            onClick={remove}
            className="text-[12px] text-faint hover:text-loss"
          >
            Ta bort
          </button>
        </td>
      ) : null}
    </tr>
  );
}

export function BetsTable({
  bets,
  canEdit,
}: {
  bets: Bet[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => {
    if (filter === "all") return bets;
    return bets.filter((b) => b.result === filter);
  }, [bets, filter]);

  const live = useLiveFixtures(
    rows.map((b) => b.fixture_id).filter((id): id is number => id != null),
    {
      hasLive: rows.some((b) =>
        needsLiveRefresh(b.fixtures?.status, b.fixtures?.kickoff)
      ),
      onSettled: () => router.refresh(),
    }
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {["all", ...RESULTS].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-semibold",
              filter === f
                ? "border-win bg-win/10 text-win"
                : "border-line bg-panel text-muted"
            )}
          >
            {f === "all" ? "Alla" : resultLabel(f as BetResult)}
          </button>
        ))}
      </div>
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
          <thead>
            <tr>
              {[
                "Datum",
                "Liga",
                "Match",
                "Tipp",
                "Bolag",
                "Insats",
                "Odds",
                "Resultat",
                "Netto",
                ...(canEdit ? [""] : []),
              ].map((label) => (
                <th
                  key={label || "actions"}
                  className="sticky top-0 border-b border-line bg-bg-soft px-2.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((bet) => (
              <BetRow
                key={bet.id}
                bet={applyLiveToBet(bet, live)}
                canEdit={canEdit}
              />
            ))}
            {!rows.length ? (
              <tr>
                <td
                  colSpan={canEdit ? 10 : 9}
                  className="px-4 py-10 text-center text-muted"
                >
                  Inga spel ännu.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
