"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  deleteBanner,
  saveBanner,
  setBannerActive,
  type BannerDraft,
  type BannerRow,
} from "@/lib/admin/banners";
import { cn } from "@/lib/utils";
import type { BannerPlacement } from "@/lib/types";

const PLACEMENTS: { value: BannerPlacement; label: string }[] = [
  { value: "home", label: "Startsida" },
  { value: "sheet", label: "Spelboken" },
  { value: "topplista", label: "Topplista" },
  { value: "spelbolag", label: "Spelbolag" },
];

function placementLabel(placement: string) {
  return PLACEMENTS.find((p) => p.value === placement)?.label ?? placement;
}

function statusOf(b: BannerRow): { label: string; tone: BadgeTone } {
  if (!b.active) return { label: "Pausad", tone: "muted" };
  const now = Date.now();
  if (b.starts_at && new Date(b.starts_at).getTime() > now) {
    return { label: "Schemalagd", tone: "yellow" };
  }
  if (b.ends_at && new Date(b.ends_at).getTime() < now) {
    return { label: "Utgången", tone: "muted" };
  }
  return { label: "Aktiv", tone: "win" };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

function periodOf(b: BannerRow) {
  if (!b.starts_at && !b.ends_at) return "Tillsvidare";
  if (b.starts_at && !b.ends_at) return `${fmtDate(b.starts_at)} → tillsvidare`;
  if (!b.starts_at && b.ends_at) return `→ ${fmtDate(b.ends_at)}`;
  return `${fmtDate(b.starts_at!)} → ${fmtDate(b.ends_at!)}`;
}

/** <input type="date"> speaks local YYYY-MM-DD, the column is timestamptz. */
function toDateInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function fromDateInput(value: string, endOfDay: boolean) {
  if (!value) return null;
  const d = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type Draft = {
  id?: string;
  title: string;
  image_url: string;
  link_url: string;
  placement: BannerPlacement;
  start: string;
  end: string;
  active: boolean;
  sort: number;
};

function draftFrom(b: BannerRow): Draft {
  return {
    id: b.id,
    title: b.title,
    image_url: b.image_url,
    link_url: b.link_url ?? "",
    placement: b.placement as BannerPlacement,
    start: toDateInput(b.starts_at),
    end: toDateInput(b.ends_at),
    active: b.active,
    sort: b.sort,
  };
}

const emptyDraft: Draft = {
  title: "",
  image_url: "",
  link_url: "",
  placement: "home",
  start: "",
  end: "",
  active: true,
  sort: 0,
};

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-[var(--radius-pill)] border transition disabled:opacity-50",
        checked ? "border-win/40 bg-win/25" : "border-line bg-panel-2"
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] size-[14px] rounded-[var(--radius-pill)] transition-[left]",
          checked ? "left-[20px] bg-win" : "left-[2px] bg-faint"
        )}
      />
    </button>
  );
}

export function BannersAdmin({ items }: { items: BannerRow[] }) {
  const [filter, setFilter] = useState<BannerPlacement | "all">("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BannerRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible =
    filter === "all" ? items : items.filter((b) => b.placement === filter);

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
    const payload: BannerDraft = {
      id: draft.id,
      title: draft.title,
      image_url: draft.image_url,
      link_url: draft.link_url,
      placement: draft.placement,
      starts_at: fromDateInput(draft.start, false),
      ends_at: fromDateInput(draft.end, true),
      active: draft.active,
      sort: draft.sort,
    };
    run(() => saveBanner(payload), () => setDraft(null));
  }

  return (
    <div className="animate-sbfade space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Placering"
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as BannerPlacement | "all")
          }
          className="min-w-[180px] py-2.5"
        >
          <option value="all">Alla placeringar</option>
          {PLACEMENTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <Button className="ml-auto" onClick={() => setDraft({ ...emptyDraft })}>
          + Ny banner
        </Button>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-card)] border border-loss/40 bg-loss/10 px-4 py-3 text-[14px] text-loss">
          {error}
        </div>
      ) : null}

      {!visible.length ? (
        <div className="rounded-[var(--radius-card-lg)] border border-line bg-panel px-6 py-12 text-center text-muted">
          Inga banners för den här placeringen ännu.
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
          {visible.map((b) => {
            const status = statusOf(b);
            return (
              <div
                key={b.id}
                className={cn(
                  "overflow-hidden rounded-[var(--radius-card-lg)] border border-line bg-panel transition-colors hover:border-line-hover",
                  !b.active && "opacity-60"
                )}
              >
                <div className="flex h-[90px] items-center justify-center border-b border-line-soft bg-[repeating-linear-gradient(135deg,var(--ad-a),var(--ad-a)_9px,var(--ad-b)_9px,var(--ad-b)_18px)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.image_url}
                    alt={b.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-3.5">
                  <div className="mb-2 flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{b.title}</div>
                      <div className="truncate font-mono-num text-[11.5px] text-dim">
                        {b.link_url || "Ingen länk"}
                      </div>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>

                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-[var(--radius-badge)] bg-panel-2 px-2 py-[3px] text-[11px] text-text-soft">
                      {placementLabel(b.placement)}
                    </span>
                    <span className="font-mono-num text-[11.5px] text-muted">
                      {periodOf(b)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 border-t border-line-soft pt-2.5 font-mono-num text-[12.5px]">
                    <span className="text-text-soft">
                      {b.views} <span className="text-dim">visn.</span>
                    </span>
                    <span className="text-text-soft">
                      {b.clicks} <span className="text-dim">klick</span>
                    </span>
                    <span className="text-win">{b.ctr.toFixed(2)}%</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDraft(draftFrom(b))}
                        className="rounded-[7px] border border-line px-2 py-1 text-[11.5px] text-text-soft transition hover:border-line-hover"
                      >
                        Redigera
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(b)}
                        className="rounded-[7px] border border-line px-2 py-1 text-[11.5px] text-loss transition hover:border-loss/40"
                      >
                        Radera
                      </button>
                      <Toggle
                        checked={b.active}
                        disabled={pending}
                        label={`Aktivera ${b.title}`}
                        onChange={(next) =>
                          run(() => setBannerActive(b.id, next))
                        }
                      />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {draft ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-auto bg-[rgba(5,7,12,.7)] p-4 backdrop-blur-[4px] sm:p-11">
          <div className="animate-sbfade w-full max-w-[620px] rounded-[var(--radius-sheet)] border border-line-strong bg-panel p-5 shadow-[var(--shadow-modal)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[21px] font-semibold uppercase tracking-[0.04em]">
                {draft.id ? "Redigera banner" : "Ny banner"}
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

            <ImageUpload
              bucket="banners"
              label="Bild-URL"
              value={draft.image_url}
              onChange={(url) => setDraft({ ...draft, image_url: url })}
              hint="Rekommenderat: 970×90 px · JPG, PNG eller WebP · max 300 kB"
            />

            <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Titel"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Unibet höstkampanj"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Mål-URL"
                  value={draft.link_url}
                  onChange={(e) =>
                    setDraft({ ...draft, link_url: e.target.value })
                  }
                  placeholder="https://track.spelbok.se/…"
                  className="font-mono-num text-[12.5px] text-text-soft"
                />
              </div>
              <Select
                label="Placering"
                value={draft.placement}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    placement: e.target.value as BannerPlacement,
                  })
                }
              >
                {PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <div>
                <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
                  Aktiv
                </span>
                <div className="flex h-[50px] items-center">
                  <Toggle
                    checked={draft.active}
                    label="Aktiv"
                    onChange={(next) => setDraft({ ...draft, active: next })}
                  />
                </div>
              </div>
              <Input
                label="Startdatum"
                type="date"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                className="font-mono-num text-[13.5px]"
              />
              <Input
                label="Slutdatum"
                type="date"
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                className="font-mono-num text-[13.5px]"
              />
            </div>

            <div className="mt-4 rounded-[var(--radius-card)] border border-line-soft bg-bg p-3.5">
              <div className="mb-2.5 text-[10.5px] uppercase tracking-[0.12em] text-dim">
                Förhandsvisning i AdSlot
              </div>
              <div className="flex h-[90px] items-center justify-center overflow-hidden rounded-[var(--radius-ad)] border border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--ad-a),var(--ad-a)_9px,var(--ad-b)_9px,var(--ad-b)_18px)] font-mono-num text-[12px] tracking-[0.13em] text-dim">
                {draft.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  `970×90 · ${draft.title || "Namnlös banner"}`
                )}
              </div>
            </div>

            {error ? (
              <div className="mt-3 text-[14px] text-loss">{error}</div>
            ) : null}

            <div className="mt-4 flex gap-2.5">
              <Button className="flex-1" disabled={pending} onClick={submit}>
                {pending ? "Sparar…" : "Spara banner"}
              </Button>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => setDraft(null)}
              >
                Avbryt
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(5,7,12,.7)] p-4">
          <div className="w-full max-w-md rounded-[var(--radius-card-lg)] border border-line bg-panel p-5 shadow-[var(--shadow-modal)]">
            <h2 className="font-display text-[18px] font-semibold uppercase tracking-[0.05em]">
              Radera banner?
            </h2>
            <p className="mt-2 text-[14px] text-muted">
              {confirmDelete.title} · {placementLabel(confirmDelete.placement)}.
              Bilden tas bort permanent och statistiken försvinner.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  run(
                    () => deleteBanner(confirmDelete.id),
                    () => setConfirmDelete(null)
                  )
                }
              >
                {pending ? "Raderar…" : "Radera"}
              </Button>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => setConfirmDelete(null)}
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
