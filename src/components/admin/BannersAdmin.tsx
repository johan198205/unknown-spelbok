"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  deleteBanner,
  saveBanner,
  setBannerActive,
  type BannerDraft,
  type BannerRow,
} from "@/lib/admin/banners";
import {
  BANNER_HTML_SANDBOX,
  bannerHtmlDocument,
  describeBannerHtml,
} from "@/lib/banner-html";
import { cn } from "@/lib/utils";
import type {
  BannerCreativeType,
  BannerFormat,
  BannerPlacement,
} from "@/lib/types";

const PLACEMENTS: { value: BannerPlacement; label: string }[] = [
  { value: "home", label: "Startsida" },
  { value: "sheet", label: "Spelboken" },
  { value: "topplista", label: "Topplista" },
  { value: "spelbolag", label: "Spelbolag" },
  { value: "kuponger", label: "Kuponger" },
];

/**
 * Annonsytorna går i full bredd och beskärs av object-cover. Bilden ska därför
 * ritas i ytans bredaste läge (width×height) med allt innehåll samlat i de
 * mittersta `safe` pixlarna — kanterna kapas på smalare skärmar.
 */
const FORMATS: {
  value: BannerFormat;
  label: string;
  short: string;
  width: number;
  height: number;
  safe: number;
  where: string;
}[] = [
  {
    value: "970x90",
    label: "Leaderboard · full bredd × 90 px",
    short: "Leaderboard",
    width: 1320,
    height: 90,
    safe: 940,
    where: "Desktop, toppen av sidan",
  },
  {
    value: "320x100",
    label: "Mobil · full bredd × 100 px",
    short: "Mobil",
    width: 1040,
    height: 100,
    safe: 300,
    where: "Mobil och surfplatta, toppen av sidan",
  },
  {
    value: "300x250",
    label: "Rektangel · sidokolumn × 250 px",
    short: "Rektangel",
    width: 500,
    height: 250,
    safe: 300,
    where: "Sidokolumnen på startsidan",
  },
];

const CREATIVE_TYPES: {
  value: BannerCreativeType;
  label: string;
  hint: string;
}[] = [
  {
    value: "image",
    label: "Bild",
    hint: "Egen kreativ: ladda upp en bild och peka den mot din spårningslänk.",
  },
  {
    value: "html",
    label: "HTML-kod",
    hint: "Kodsnutt från affiliatenätverket — klistras in som den är och kör annonsörens egen spårning.",
  },
];

/** Vilka format som faktiskt renderas per placering. */
const FORMATS_BY_PLACEMENT: Record<BannerPlacement, BannerFormat[]> = {
  home: ["970x90", "320x100", "300x250"],
  sheet: ["970x90", "320x100"],
  topplista: ["970x90", "320x100"],
  spelbolag: ["970x90"],
  kuponger: ["970x90"],
};

function placementLabel(placement: string) {
  return PLACEMENTS.find((p) => p.value === placement)?.label ?? placement;
}

function formatOf(value: string) {
  return FORMATS.find((f) => f.value === value) ?? FORMATS[0];
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
  creative_type: BannerCreativeType;
  image_url: string;
  html_code: string;
  link_url: string;
  placement: BannerPlacement;
  format: BannerFormat;
  start: string;
  end: string;
  active: boolean;
  sort: number;
};

function draftFrom(b: BannerRow): Draft {
  return {
    id: b.id,
    title: b.title,
    creative_type: b.creative_type === "html" ? "html" : "image",
    image_url: b.image_url ?? "",
    html_code: b.html_code ?? "",
    link_url: b.link_url ?? "",
    placement: b.placement as BannerPlacement,
    format: formatOf(b.format).value,
    start: toDateInput(b.starts_at),
    end: toDateInput(b.ends_at),
    active: b.active,
    sort: b.sort,
  };
}

const emptyDraft: Draft = {
  title: "",
  creative_type: "image",
  image_url: "",
  html_code: "",
  link_url: "",
  placement: "home",
  format: "970x90",
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
  const [formatFilter, setFormatFilter] = useState<BannerFormat | "all">("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BannerRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = items.filter(
    (b) =>
      (filter === "all" || b.placement === filter) &&
      (formatFilter === "all" || formatOf(b.format).value === formatFilter)
  );

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
      creative_type: draft.creative_type,
      image_url: draft.image_url,
      html_code: draft.html_code,
      link_url: draft.link_url,
      placement: draft.placement,
      format: draft.format,
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
        <Select
          label="Format"
          value={formatFilter}
          onChange={(e) =>
            setFormatFilter(e.target.value as BannerFormat | "all")
          }
          className="min-w-[200px] py-2.5"
        >
          <option value="all">Alla format</option>
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
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
                <div className="flex h-[110px] items-center justify-center overflow-hidden border-b border-line-soft bg-[repeating-linear-gradient(135deg,var(--ad-a),var(--ad-a)_9px,var(--ad-b)_9px,var(--ad-b)_18px)] p-2">
                  {b.creative_type === "html" ? (
                    // Snutten körs medvetet INTE i listan: många nätverk räknar
                    // en visning redan vid inladdning, och adminsidan ska inte
                    // blåsa upp annonsörens siffror. Koden visas i stället.
                    <pre className="max-h-full w-full overflow-hidden whitespace-pre-wrap break-all rounded-[7px] bg-bg/70 px-2 py-1.5 font-mono-num text-[10.5px] leading-[1.45] text-dim">
                      {(b.html_code ?? "").slice(0, 220)}
                    </pre>
                  ) : (
                    // Hela kreativen ska synas i listan — 300×250 får inte
                    // beskäras till en remsa.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.image_url ?? ""}
                      alt={b.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>

                <div className="p-3.5">
                  <div className="mb-2 flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{b.title}</div>
                      <div className="truncate font-mono-num text-[11.5px] text-dim">
                        {b.creative_type === "html"
                          ? `${describeBannerHtml(b.html_code ?? "") ?? "HTML"} · annonsörens egen länk`
                          : b.link_url || "Ingen länk"}
                      </div>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>

                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-[var(--radius-badge)] bg-panel-2 px-2 py-[3px] text-[11px] text-text-soft">
                      {placementLabel(b.placement)}
                    </span>
                    <span className="rounded-[var(--radius-badge)] bg-panel-2 px-2 py-[3px] text-[11px] text-text-soft">
                      {formatOf(b.format).short}
                    </span>
                    {b.creative_type === "html" ? (
                      <span className="rounded-[var(--radius-badge)] bg-cyan/15 px-2 py-[3px] text-[11px] text-cyan">
                        HTML
                      </span>
                    ) : null}
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

            <div className="mb-3.5">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
                Kreativ
              </span>
              <div className="flex gap-1.5 rounded-[10px] border border-line bg-bg-soft p-1">
                {CREATIVE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={draft.creative_type === t.value}
                    onClick={() =>
                      setDraft({ ...draft, creative_type: t.value })
                    }
                    className={cn(
                      "flex-1 rounded-[7px] px-3 py-2 text-[13.5px] transition",
                      draft.creative_type === t.value
                        ? "bg-panel-2 font-semibold text-text"
                        : "text-muted hover:text-text-soft"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[12.5px] text-muted">
                {
                  CREATIVE_TYPES.find((t) => t.value === draft.creative_type)
                    ?.hint
                }
              </p>
            </div>

            {draft.creative_type === "html" ? (
              <>
                <Textarea
                  label="HTML-kod från annonsören"
                  value={draft.html_code}
                  onChange={(e) =>
                    setDraft({ ...draft, html_code: e.target.value })
                  }
                  rows={7}
                  spellCheck={false}
                  placeholder={'<a href="https://record.affiliate.se/…" target="_blank">\n  <img src="https://media.affiliate.se/970x90.jpg" width="970" height="90">\n</a>'}
                  className="font-mono-num text-[12.5px] leading-[1.5] text-text-soft"
                />
                <p className="mt-1.5 text-[12.5px] text-muted">
                  Klistra in snutten precis som du fick den — {"<script>"},{" "}
                  {"<iframe>"} och länkad bild fungerar alla. Koden körs i en
                  sandlåda utan åtkomst till sajtens inloggning, och länkar
                  öppnas automatiskt i ny flik.
                </p>
              </>
            ) : (
              <ImageUpload
                bucket="banners"
                label="Bild-URL"
                value={draft.image_url}
                onChange={(url) => setDraft({ ...draft, image_url: url })}
                hint={`${formatOf(draft.format).width}×${
                  formatOf(draft.format).height
                } px · innehållet i mitten (${
                  formatOf(draft.format).safe
                } px) · kanterna beskärs på smala skärmar`}
              />
            )}

            <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Titel"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Unibet höstkampanj"
                />
              </div>
              {draft.creative_type === "html" ? (
                <div className="rounded-[var(--radius-card)] border border-line-soft bg-bg px-3 py-2 text-[12.5px] text-muted sm:col-span-2">
                  Mål-URL används inte för HTML-kreativ — snutten bär
                  annonsörens egen länk och spårning. Titeln syns bara i admin.
                </div>
              ) : (
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
              )}
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
              <Select
                label="Format"
                value={draft.format}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    format: e.target.value as BannerFormat,
                  })
                }
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
              {!FORMATS_BY_PLACEMENT[draft.placement].includes(draft.format) ? (
                <div className="rounded-[var(--radius-card)] border border-yellow/40 bg-yellow/10 px-3 py-2 text-[12.5px] text-yellow sm:col-span-2">
                  {placementLabel(draft.placement)} har ingen{" "}
                  {formatOf(draft.format).short.toLowerCase()}-yta — bannern
                  sparas men visas inte någonstans.
                </div>
              ) : (
                <div className="text-[12.5px] text-muted sm:col-span-2">
                  Visas på {placementLabel(draft.placement).toLowerCase()} ·{" "}
                  {formatOf(draft.format).where.toLowerCase()}.
                </div>
              )}
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
              {/* Rutan har ytans bredaste proportioner och markerar den säkra
                  zonen — allt utanför strecken kapas på smalare skärmar. */}
              <div
                className="relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-[var(--radius-ad)] border border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--ad-a),var(--ad-a)_9px,var(--ad-b)_9px,var(--ad-b)_18px)] font-mono-num text-[12px] tracking-[0.13em] text-dim"
                style={{
                  maxWidth: formatOf(draft.format).width,
                  aspectRatio: `${formatOf(draft.format).width} / ${
                    formatOf(draft.format).height
                  }`,
                }}
              >
                {draft.creative_type === "html" && draft.html_code.trim() ? (
                  // Samma sandlåda som skarpt läge — en snutt som inte
                  // fungerar här fungerar inte på sajten heller.
                  <iframe
                    key={draft.html_code}
                    title="Förhandsvisning"
                    srcDoc={bannerHtmlDocument(draft.html_code)}
                    sandbox={BANNER_HTML_SANDBOX}
                    scrolling="no"
                    className="h-full w-full border-0"
                  />
                ) : draft.creative_type === "image" && draft.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  `${formatOf(draft.format).width}×${
                    formatOf(draft.format).height
                  } · ${draft.title || "Namnlös banner"}`
                )}
                <span
                  aria-hidden
                  hidden={draft.creative_type === "html"}
                  className="pointer-events-none absolute inset-y-0 border-x border-dashed border-cyan/45"
                  style={{
                    left: `${
                      (50 *
                        (formatOf(draft.format).width -
                          formatOf(draft.format).safe)) /
                      formatOf(draft.format).width
                    }%`,
                    right: `${
                      (50 *
                        (formatOf(draft.format).width -
                          formatOf(draft.format).safe)) /
                      formatOf(draft.format).width
                    }%`,
                  }}
                />
              </div>
              <div className="mt-2 text-center text-[11.5px] text-dim">
                {draft.creative_type === "html"
                  ? "Snutten körs på riktigt här — annonsören kan räkna en visning redan av förhandsvisningen."
                  : "Streckad zon = alltid synlig. Utanför den beskärs bilden på smalare skärmar."}
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
