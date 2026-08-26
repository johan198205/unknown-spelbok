"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { FixturePicker, type PickerFixture } from "@/components/bets/FixturePicker";
import {
  deleteCoupon,
  saveCoupon,
  setCouponLegResult,
  type CouponDraft,
  type CouponLegDraft,
} from "@/lib/admin/coupons";
import {
  COUPON_STATUS_LABEL,
  COUPON_STATUS_TONE,
  couponPath,
  formatCouponOdds,
  legWhen,
  type Coupon,
} from "@/lib/coupons";
import type { Bookmaker, CouponLegResult } from "@/lib/types";
import { cn, formatMoney, slugify } from "@/lib/utils";

const LEG_RESULTS: (CouponLegResult | null)[] = [null, "WIN", "LOSS", "PUSH", "VOID"];

type LegDraft = CouponLegDraft & {
  /** Bara för formuläret — servern läser alltid fixtures-tabellen. */
  label: string;
  when: string;
};

type Draft = Omit<CouponDraft, "legs"> & { legs: LegDraft[] };

function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function fromLocalInput(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function emptyDraft(): Draft {
  return {
    slug: "",
    title: "",
    kicker: "",
    body: "",
    stake: 200,
    bookmaker_id: null,
    bookmaker_reason: "",
    proof_url: "",
    published_at: new Date().toISOString(),
    legs: [],
  };
}

function draftFrom(coupon: Coupon): Draft {
  return {
    id: coupon.id,
    slug: coupon.slug,
    title: coupon.title,
    kicker: coupon.kicker,
    body: coupon.body,
    stake: Number(coupon.stake),
    bookmaker_id: coupon.bookmaker_id,
    bookmaker_reason: coupon.bookmaker_reason,
    proof_url: coupon.proof_url ?? "",
    published_at: coupon.published_at,
    legs: coupon.legs.map((leg) => ({
      id: leg.id,
      fixture_id: leg.fixture_id,
      pick: leg.pick,
      odds: Number(leg.odds),
      result: leg.result,
      label: leg.fixtures
        ? `${leg.fixtures.home_name} – ${leg.fixtures.away_name}`
        : "Okänd match",
      when: legWhen(leg.fixtures?.kickoff),
    })),
  };
}

export function CouponsAdmin({
  coupons,
  bookmakers,
}: {
  coupons: Coupon[];
  bookmakers: Bookmaker[];
}) {
  const [draft, setDraft] = useState<Draft | null>(null);

  return (
    <div className="space-y-4">
      {draft ? (
        <CouponForm
          draft={draft}
          setDraft={setDraft}
          bookmakers={bookmakers}
          onClose={() => setDraft(null)}
        />
      ) : (
        <Button onClick={() => setDraft(emptyDraft())}>Ny kupong</Button>
      )}

      <div className="space-y-3">
        {coupons.map((coupon) => (
          <CouponRow
            key={coupon.id}
            coupon={coupon}
            onEdit={() => setDraft(draftFrom(coupon))}
          />
        ))}
        {!coupons.length ? (
          <p className="rounded-[12px] border border-line bg-panel p-6 text-center text-muted">
            Inga kuponger än.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CouponRow({ coupon, onEdit }: { coupon: Coupon; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const tone = COUPON_STATUS_TONE[coupon.status];

  function grade(legId: string, result: CouponLegResult | null) {
    setError(null);
    startTransition(async () => {
      try {
        await setCouponLegResult(legId, result);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kunde inte rätta");
      }
    });
  }

  function remove() {
    if (!window.confirm(`Radera "${coupon.title}"? Går inte att ångra.`)) return;
    startTransition(async () => {
      try {
        await deleteCoupon(coupon.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kunde inte radera");
      }
    });
  }

  return (
    <section className="rounded-[12px] border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className="font-mono-num rounded-[6px] px-2.5 py-[5px] text-[11.5px] font-semibold"
          style={{ background: tone.badgeBg, color: tone.badgeFg }}
        >
          {COUPON_STATUS_LABEL[coupon.status]}
        </span>
        <span className="font-display text-[17px] font-semibold">{coupon.title}</span>
        <span className="font-mono-num text-[12.5px] text-faint">
          {formatCouponOdds(coupon.total_odds)} ·{" "}
          {formatMoney(Number(coupon.stake), "kr").replace("+", "")} ·{" "}
          {new Date(coupon.published_at).toLocaleString("sv-SE", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </span>
        <span className="ml-auto flex gap-2">
          <a
            href={couponPath(coupon.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[9px] border border-line bg-panel px-3 py-2 text-[13px] font-semibold text-text-soft no-underline hover:text-text hover:no-underline"
          >
            Visa ↗
          </a>
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Redigera
          </Button>
          <Button size="sm" variant="danger" disabled={pending} onClick={remove}>
            Radera
          </Button>
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {coupon.legs.map((leg) => (
          <div
            key={leg.id}
            className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line-soft bg-bg-soft px-3 py-2.5"
          >
            <span className="min-w-0 flex-1 truncate text-[14px]">
              {leg.fixtures
                ? `${leg.fixtures.home_name} – ${leg.fixtures.away_name}`
                : "Okänd match"}
            </span>
            <span className="font-mono-num text-[12px] text-faint">
              {legWhen(leg.fixtures?.kickoff)}
            </span>
            <span className="text-[14px] font-bold">{leg.pick}</span>
            <span className="font-mono-num w-14 text-right text-[14px] font-semibold">
              {formatCouponOdds(leg.odds)}
            </span>
            <span className="flex gap-1">
              {LEG_RESULTS.map((result) => (
                <button
                  key={result ?? "open"}
                  type="button"
                  disabled={pending}
                  onClick={() => grade(leg.id, result)}
                  className={cn(
                    "cursor-pointer rounded-[7px] border px-2.5 py-1.5 text-[12px] font-semibold",
                    leg.result === result
                      ? "border-line-hover bg-panel-2 text-text"
                      : "border-line text-muted hover:text-text"
                  )}
                >
                  {result ?? "Öppen"}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>

      {/*
        Statusen ovan är serverns. Den räknas inte om här efter ett klick —
        raden ritas om från databasen när router.refresh() är klar.
      */}
      {error ? <p className="mt-2 text-[13px] text-loss">{error}</p> : null}
    </section>
  );
}

function CouponForm({
  draft,
  setDraft,
  bookmakers,
  onClose,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  bookmakers: Bookmaker[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  function patch(next: Partial<Draft>) {
    setDraft({ ...draft, ...next });
  }

  function addLeg(fixture: PickerFixture) {
    patch({
      legs: [
        ...draft.legs,
        {
          fixture_id: fixture.fixture_id,
          pick: "",
          odds: 1.9,
          result: null,
          label: `${fixture.home_name} – ${fixture.away_name}`,
          when: legWhen(fixture.kickoff),
        },
      ],
    });
    setPicking(false);
  }

  function patchLeg(index: number, next: Partial<LegDraft>) {
    patch({
      legs: draft.legs.map((leg, i) => (i === index ? { ...leg, ...next } : leg)),
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await saveCoupon({
          ...draft,
          slug: draft.slug || slugify(draft.title),
          // label/when är formulärets egna etiketter — servern läser alltid
          // matchen ur fixtures-tabellen och ska inte ta emot dem.
          legs: draft.legs.map((leg) => ({
            id: leg.id,
            fixture_id: leg.fixture_id,
            pick: leg.pick,
            odds: leg.odds,
            result: leg.result,
          })),
        });
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kunde inte spara");
      }
    });
  }

  const totalOdds = draft.legs.reduce((product, leg) => product * (leg.odds || 1), 1);

  return (
    <section className="space-y-4 rounded-[12px] border border-line bg-panel p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Titel"
          value={draft.title}
          onChange={(e) =>
            patch({
              title: e.target.value,
              slug: draft.id ? draft.slug : slugify(e.target.value),
            })
          }
        />
        <Input
          label="Slug"
          value={draft.slug}
          onChange={(e) => patch({ slug: e.target.value })}
        />
        <Input
          label="Kicker (t.ex. DAGENS KOMBI)"
          value={draft.kicker}
          onChange={(e) => patch({ kicker: e.target.value })}
        />
        <Input
          label="Insats (kr)"
          type="number"
          min={0}
          step={10}
          value={draft.stake}
          onChange={(e) => patch({ stake: Number(e.target.value) })}
        />
        <Select
          label="Rekommenderat spelbolag"
          value={draft.bookmaker_id ?? ""}
          onChange={(e) => patch({ bookmaker_id: e.target.value || null })}
        >
          <option value="">— välj —</option>
          {bookmakers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Input
          label="Publiceras"
          type="datetime-local"
          value={toLocalInput(draft.published_at)}
          onChange={(e) => patch({ published_at: fromLocalInput(e.target.value) })}
        />
      </div>

      <Textarea
        label="Spelrekommendation"
        rows={4}
        value={draft.body}
        onChange={(e) => patch({ body: e.target.value })}
      />
      <Input
        label="Motivering till spelbolaget"
        value={draft.bookmaker_reason}
        onChange={(e) => patch({ bookmaker_reason: e.target.value })}
      />
      <Input
        label="Spelbevis (URL)"
        value={draft.proof_url}
        placeholder="Laddas normalt upp direkt på kupongsidan"
        onChange={(e) => patch({ proof_url: e.target.value })}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
            Objekt
          </span>
          <span className="font-mono-num text-[13px] text-faint">
            Totalodds {formatCouponOdds(totalOdds)} ·{" "}
            {draft.legs.length === 1 ? "Singel" : "Kombination"}
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            onClick={() => setPicking((v) => !v)}
          >
            {picking ? "Stäng matchväljaren" : "Lägg till match"}
          </Button>
        </div>

        {picking ? (
          <div className="rounded-[10px] border border-line bg-bg-soft p-3">
            <FixturePicker onSelect={addLeg} />
          </div>
        ) : null}

        {draft.legs.map((leg, index) => (
          <div
            key={leg.id ?? `new-${index}`}
            className="flex flex-wrap items-end gap-3 rounded-[10px] border border-line-soft bg-bg-soft px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold">{leg.label}</div>
              <div className="font-mono-num text-[12px] text-faint">{leg.when}</div>
            </div>
            <Input
              label="Spelval"
              className="w-[180px]"
              value={leg.pick}
              onChange={(e) => patchLeg(index, { pick: e.target.value })}
            />
            <Input
              label="Odds"
              type="number"
              min={1}
              step={0.01}
              className="w-[110px]"
              value={leg.odds}
              onChange={(e) => patchLeg(index, { odds: Number(e.target.value) })}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                patch({ legs: draft.legs.filter((_, i) => i !== index) })
              }
            >
              Ta bort
            </Button>
          </div>
        ))}
      </div>

      {error ? <p className="text-[13px] text-loss">{error}</p> : null}

      <div className="flex gap-2">
        <Button disabled={pending} onClick={submit}>
          {pending ? "Sparar…" : "Spara kupong"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Avbryt
        </Button>
      </div>
    </section>
  );
}
