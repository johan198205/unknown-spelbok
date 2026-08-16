"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/client";
import type { Bet, BetResult, Bookmaker, Sheet } from "@/lib/types";
import {
  formatMoney,
  formatOdds,
  nettoColor,
  resultLabel,
  resultTone,
  betNetto,
} from "@/lib/utils";
import { MatchSelector } from "@/components/bets/MatchSelector";

const RESULTS: BetResult[] = ["open", "win", "loss", "void", "halfwin", "halfloss"];

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
  const [match, setMatch] = useState("");
  const [pick, setPick] = useState("");
  const [league, setLeague] = useState("");
  const [sport, setSport] = useState("Fotboll");
  const [odds, setOdds] = useState("1.90");
  const [stake, setStake] = useState("100");
  const [bookmakerId, setBookmakerId] = useState("");
  const [fixtureId, setFixtureId] = useState<number | null>(null);

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

    setMatch("");
    setPick("");
    setFixtureId(null);
    setOpen(false);
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

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>+ Lägg nytt spel</Button>
    );
  }

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Nytt spel</h3>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Stäng
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="Spreadsheet"
          value={sheetId}
          onChange={(e) => setSheetId(e.target.value)}
        >
          {sheets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          label="Spelbolag"
          value={bookmakerId}
          onChange={(e) => setBookmakerId(e.target.value)}
        >
          <option value="">—</option>
          {bookmakers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <div className="md:col-span-2">
          <MatchSelector
            onSelect={(f) => {
              setFixtureId(f.fixture_id);
              setMatch(`${f.home_name} – ${f.away_name}`);
              setLeague(f.league_name || "");
              setSport(f.sport || "Fotboll");
            }}
          />
        </div>
        <Input
          label="Match"
          value={match}
          onChange={(e) => setMatch(e.target.value)}
          placeholder="Liverpool – Arsenal"
          required
        />
        <Input
          label="Tipp"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          placeholder="1 / Över 2.5"
          required
        />
        <Input
          label="Liga"
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          placeholder="Premier League"
        />
        <Input
          label="Sport"
          value={sport}
          onChange={(e) => setSport(e.target.value)}
        />
        <Input
          label="Odds"
          type="number"
          step="0.01"
          min="1"
          value={odds}
          onChange={(e) => setOdds(e.target.value)}
        />
        <Input
          label="Insats"
          type="number"
          step="1"
          min="1"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
        />
      </div>
      {error ? (
        <div className="mt-3 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {error}
        </div>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Avbryt
        </Button>
        <Button onClick={submit} disabled={loading || !match || !pick}>
          {loading ? "Sparar…" : "Spara spel"}
        </Button>
      </div>
    </Panel>
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
      <td className="px-2.5 py-3">{bet.match}</td>
      <td className="whitespace-nowrap px-2.5 py-3 font-bold">{bet.pick}</td>
      <td className="whitespace-nowrap px-2.5 py-3 text-[12.5px] text-muted">
        {bet.bookmakers?.name || "—"}
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
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => {
    if (filter === "all") return bets;
    return bets.filter((b) => b.result === filter);
  }, [bets, filter]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {["all", ...RESULTS].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
              filter === f
                ? "border-win bg-win/10 text-win"
                : "border-line bg-panel text-muted"
            }`}
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
              <BetRow key={bet.id} bet={bet} canEdit={canEdit} />
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
