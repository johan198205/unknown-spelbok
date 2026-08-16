"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  endCompetitionEarly,
  saveCompetition,
  type CompetitionDraft,
  type CompetitionRow,
} from "@/lib/admin/competitions";
import {
  formatStake,
  medalColor,
  visibilityLabel,
  type CompetitionStatus,
  type CompetitionVisibility,
} from "@/lib/competitions";
import { cn, formatMoney, initialOf, nettoColor } from "@/lib/utils";

const TABS: { value: CompetitionStatus; label: string }[] = [
  { value: "live", label: "Pågående" },
  { value: "upcoming", label: "Kommande" },
  { value: "done", label: "Avslutade" },
];

const VISIBILITIES: { value: CompetitionVisibility; label: string }[] = [
  { value: "public", label: "Publik" },
  { value: "invite", label: "Endast inbjudna" },
];

type Draft = {
  id?: string;
  name: string;
  description: string;
  start: string;
  end: string;
  min_bets: string;
  min_total_stake: string;
  prize: string;
  visibility: CompetitionVisibility;
};

/** <input type="datetime-local"> speaks local time, the column is timestamptz. */
function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function fromLocalInput(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function emptyDraft(): Draft {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setMinutes(end.getMinutes() - 1);

  return {
    name: "",
    description: "",
    start: toLocalInput(start.toISOString()),
    end: toLocalInput(end.toISOString()),
    min_bets: "0",
    min_total_stake: "0",
    prize: "",
    visibility: "public",
  };
}

function draftFrom(competition: CompetitionRow): Draft {
  return {
    id: competition.id,
    name: competition.name,
    description: competition.description ?? "",
    start: toLocalInput(competition.starts_at),
    end: toLocalInput(competition.ends_at),
    min_bets: String(competition.min_bets ?? 0),
    min_total_stake: String(Number(competition.min_total_stake ?? 0)),
    prize: competition.prize ?? "",
    visibility: competition.visibility === "invite" ? "invite" : "public",
  };
}

export function CompetitionsAdmin({ items }: { items: CompetitionRow[] }) {
  const [tab, setTab] = useState<CompetitionStatus>("live");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<CompetitionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = items.filter((c) => c.status === tab);

  function run(fn: () => Promise<unknown>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        onDone?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Något gick fel");
      }
    });
  }

  function submit() {
    if (!draft) return;
    const payload: CompetitionDraft = {
      id: draft.id,
      name: draft.name,
      description: draft.description,
      starts_at: fromLocalInput(draft.start),
      ends_at: fromLocalInput(draft.end),
      min_bets: Number(draft.min_bets) || 0,
      min_total_stake: Number(draft.min_total_stake) || 0,
      prize: draft.prize,
      visibility: draft.visibility,
    };
    run(
      () => saveCompetition(payload),
      () => setDraft(null)
    );
  }

  return (
    <div className="animate-sbfade space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-[3px] rounded-[11px] border border-line bg-panel p-1">
          {TABS.map((t) => {
            const count = items.filter((c) => c.status === t.value).length;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-[14px] font-semibold transition",
                  tab === t.value
                    ? "bg-panel-2 text-text"
                    : "text-muted hover:text-text"
                )}
              >
                {t.label}
                <span className="ml-1.5 font-mono-num text-[12px] text-dim">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <Button
          className="ml-auto rounded-[11px]"
          onClick={() => setDraft(emptyDraft())}
        >
          + Ny tävling
        </Button>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-card)] border border-loss/40 bg-loss/10 px-4 py-3 text-[14px] text-loss">
          {error}
        </div>
      ) : null}

      {!visible.length ? (
        <div className="rounded-[var(--radius-card-lg)] border border-line bg-panel px-6 py-12 text-center text-muted">
          {tab === "live"
            ? "Inga pågående tävlingar."
            : tab === "upcoming"
              ? "Inga kommande tävlingar."
              : "Inga avslutade tävlingar."}
        </div>
      ) : tab === "done" ? (
        <div className="overflow-hidden rounded-[var(--radius-card-lg)] border border-line bg-panel">
          <div className="flex gap-3 border-b border-line bg-bg px-[18px] py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span className="flex-[1.4]">Tävling</span>
            <span className="w-[190px]">Period</span>
            <span className="flex-1">Vinnare</span>
            <span className="w-[130px]" />
          </div>
          {visible.map((competition) => {
            const winner = competition.top3[0];
            return (
              <div
                key={competition.id}
                className="flex flex-wrap items-center gap-3 border-b border-rowline px-[18px] py-3.5 transition-colors hover:bg-hover"
              >
                <span className="flex-[1.4] font-semibold">
                  {competition.name}
                </span>
                <span className="w-[190px] font-mono-num text-[12.5px] text-muted">
                  {competition.period}
                </span>
                <span className="flex flex-1 items-center gap-2">
                  {winner ? (
                    <>
                      <span className="font-display flex size-[22px] items-center justify-center rounded-[var(--radius-pill)] bg-yellow/15 text-[11px] font-bold text-yellow">
                        1
                      </span>
                      <span className="text-[13.5px] font-semibold text-yellow">
                        {winner.username}
                      </span>
                      <span
                        className={cn(
                          "font-mono-num text-[12.5px]",
                          nettoColor(winner.netto)
                        )}
                      >
                        {formatMoney(winner.netto)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[13.5px] text-dim">
                      Ingen kvalificerad vinnare
                    </span>
                  )}
                </span>
                <span className="flex w-[130px] justify-end gap-3 text-[13.5px]">
                  <button
                    type="button"
                    onClick={() => setDraft(draftFrom(competition))}
                    className="text-muted transition hover:text-text"
                  >
                    Redigera
                  </button>
                  <Link href="/topplista">Visa resultat</Link>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(360px,1fr))]">
          {visible.map((competition) => (
            <div
              key={competition.id}
              className="rounded-[var(--radius-card-lg)] border border-line bg-panel p-[18px]"
            >
              <div className="mb-1.5 flex items-start gap-2.5">
                <h2 className="font-display flex-1 text-[19px] font-semibold">
                  {competition.name}
                </h2>
                <span className="shrink-0 rounded-[var(--radius-badge)] bg-amber/15 px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-amber">
                  {competition.countdown}
                </span>
              </div>
              <div className="mb-1.5 font-mono-num text-[12.5px] text-dim">
                {competition.period}
              </div>
              <div className="mb-3.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <span className="rounded-[var(--radius-badge)] bg-panel-2 px-2 py-[3px]">
                  {visibilityLabel(competition.visibility)}
                </span>
                <span className="font-mono-num">
                  Minst {competition.min_bets} spel ·{" "}
                  {formatStake(Number(competition.min_total_stake))}
                </span>
              </div>

              <div className="mb-3.5 flex gap-[18px]">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-dim">
                    Deltagare
                  </div>
                  <div className="font-mono-num text-[19px] font-semibold">
                    {competition.entries}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-dim">
                    Omsättning
                  </div>
                  <div className="font-mono-num text-[19px] font-semibold">
                    {formatStake(competition.turnover)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-dim">
                    Dagar kvar
                  </div>
                  <div className="font-mono-num text-[19px] font-semibold">
                    {competition.days_left}
                  </div>
                </div>
              </div>

              <div className="mb-3.5 overflow-hidden rounded-[11px] border border-line-soft bg-bg">
                {competition.top3.length ? (
                  competition.top3.map((entry, i) => (
                    <div
                      key={entry.user_id}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5",
                        i < competition.top3.length - 1 &&
                          "border-b border-rowline",
                        !entry.qualified && "opacity-55"
                      )}
                    >
                      <span
                        className={cn(
                          "font-display w-[18px] text-[17px] font-semibold",
                          entry.rank ? medalColor(entry.rank) : "text-dim"
                        )}
                      >
                        {entry.rank ?? "–"}
                      </span>
                      <span className="font-display flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border border-line-strong bg-panel-2 text-[13px] font-semibold">
                        {initialOf(entry.username)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">
                        {entry.username}
                        {entry.qualified ? null : (
                          <span className="text-dim"> · Ej kvalificerad</span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "font-mono-num text-[13.5px] font-semibold",
                          entry.qualified ? nettoColor(entry.netto) : "text-muted"
                        )}
                      >
                        {formatMoney(entry.netto)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-[13px] text-dim">
                    Inga deltagare ännu.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Button
                  variant="secondary"
                  className="flex-1 rounded-[9px]"
                  onClick={() => setDraft(draftFrom(competition))}
                >
                  Redigera
                </Button>
                <ButtonLink
                  href="/tavlingar"
                  variant="secondary"
                  className="flex-1 rounded-[9px]"
                >
                  Visa full topplista
                </ButtonLink>
                {competition.status === "live" ? (
                  <Button
                    variant="danger"
                    className="rounded-[9px] bg-transparent"
                    onClick={() => setConfirmEnd(competition)}
                  >
                    Avsluta i förtid
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-auto bg-[rgba(5,7,12,.7)] p-4 backdrop-blur-[4px] sm:p-11">
          <div className="animate-sbfade w-full max-w-[580px] rounded-[var(--radius-sheet)] border border-line-strong bg-panel p-[22px] shadow-[var(--shadow-modal)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[21px] font-semibold uppercase tracking-[0.04em]">
                {draft.id ? "Redigera tävling" : "Skapa tävling"}
              </h2>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Stäng"
                className="size-[33px] rounded-[9px] border border-line-strong text-muted transition hover:text-text"
              >
                ×
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Namn"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Allsvenskan-racet · September"
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Beskrivning"
                  rows={2}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  placeholder="ROI-race över hela månaden. Fri insats."
                />
              </div>
              <Input
                label="Start"
                type="datetime-local"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                className="font-mono-num text-[13.5px]"
              />
              <Input
                label="Slut"
                type="datetime-local"
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                className="font-mono-num text-[13.5px]"
              />

              <div className="border-t border-line-soft pt-3 sm:col-span-2">
                <div className="mb-2.5 text-[10.5px] uppercase tracking-[0.12em] text-dim">
                  Regler
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Minsta antal spel"
                    type="number"
                    min={0}
                    step={1}
                    value={draft.min_bets}
                    onChange={(e) =>
                      setDraft({ ...draft, min_bets: e.target.value })
                    }
                    className="font-mono-num"
                  />
                  <Input
                    label="Minsta totalinsats (kr)"
                    type="number"
                    min={0}
                    step={100}
                    value={draft.min_total_stake}
                    onChange={(e) =>
                      setDraft({ ...draft, min_total_stake: e.target.value })
                    }
                    className="font-mono-num"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Pris"
                  value={draft.prize}
                  onChange={(e) => setDraft({ ...draft, prize: e.target.value })}
                  placeholder="Presentkort 2 000 kr + trofé på profilen"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3.5 rounded-[11px] border border-line-soft bg-bg p-3.5 sm:col-span-2">
                <div className="flex-1">
                  <div className="text-[14px] font-semibold">Synlighet</div>
                  <div className="text-[12.5px] text-muted">
                    Publika tävlingar syns i appens tävlingslista
                  </div>
                </div>
                <div className="flex gap-[3px] rounded-[9px] border border-line bg-panel p-[3px]">
                  {VISIBILITIES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setDraft({ ...draft, visibility: option.value })
                      }
                      className={cn(
                        "rounded-[7px] px-3.5 py-2 text-[12.5px] font-semibold transition",
                        draft.visibility === option.value
                          ? "bg-panel-2 text-text"
                          : "text-muted hover:text-text"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-3 text-[14px] text-loss">{error}</div>
            ) : null}

            <div className="mt-4 flex gap-2.5">
              <Button
                className="flex-1 rounded-[11px]"
                disabled={pending}
                onClick={submit}
              >
                {pending
                  ? "Sparar…"
                  : draft.id
                    ? "Spara tävling"
                    : "Skapa tävling"}
              </Button>
              <Button
                variant="secondary"
                className="rounded-[11px]"
                disabled={pending}
                onClick={() => setDraft(null)}
              >
                Avbryt
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmEnd ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(5,7,12,.7)] p-4">
          <div className="w-full max-w-md rounded-[var(--radius-card-lg)] border border-line bg-panel p-5 shadow-[var(--shadow-modal)]">
            <h2 className="font-display text-[18px] font-semibold uppercase tracking-[0.05em]">
              Avsluta i förtid?
            </h2>
            <p className="mt-2 text-[14px] text-muted">
              {confirmEnd.name} avslutas nu i stället för{" "}
              {new Date(confirmEnd.ends_at).toLocaleString("sv-SE")}. Topplistan
              låses på de spel som redan är lagda i perioden.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  run(
                    () => endCompetitionEarly(confirmEnd.id),
                    () => setConfirmEnd(null)
                  )
                }
              >
                {pending ? "Avslutar…" : "Avsluta tävlingen"}
              </Button>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirmEnd(null)}
              >
                Avbryt
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
