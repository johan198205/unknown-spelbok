"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  deletePopup,
  savePopup,
  setPopupActive,
  type PopupDraft,
  type PopupRow,
} from "@/lib/admin/popups";
import {
  AUDIENCE_LABELS,
  describeScope,
  describeTrigger,
  FREQUENCY_LABELS,
  POPUP_AUDIENCES,
  POPUP_FREQUENCIES,
  POPUP_TRIGGERS,
  TRIGGER_HINTS,
  TRIGGER_LABELS,
  triggerUnit,
  type PopupAudience,
  type PopupFrequency,
  type PopupScope,
  type PopupTrigger,
} from "@/lib/popups";
import { cn } from "@/lib/utils";

/**
 * Vanliga mål, som förifyllda förslag i sökvägsfältet. Listan är hjälp,
 * inte en begränsning — fältet tar vilken sökväg som helst, inklusive
 * mönster som /kuponger*.
 */
const PATH_SUGGESTIONS = [
  "/",
  "/hem",
  "/spelbok",
  "/statistik",
  "/tavlingar",
  "/topplista",
  "/spelbolag",
  "/kuponger",
  "/kuponger*",
];

function statusOf(p: PopupRow): { label: string; tone: BadgeTone } {
  if (!p.active) return { label: "Pausad", tone: "muted" };
  const now = Date.now();
  if (p.starts_at && new Date(p.starts_at).getTime() > now) {
    return { label: "Schemalagd", tone: "yellow" };
  }
  if (p.ends_at && new Date(p.ends_at).getTime() < now) {
    return { label: "Utgången", tone: "muted" };
  }
  return { label: "Aktiv", tone: "win" };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

function periodOf(p: PopupRow) {
  if (!p.starts_at && !p.ends_at) return "Tillsvidare";
  if (p.starts_at && !p.ends_at) return `${fmtDate(p.starts_at)} → tillsvidare`;
  if (!p.starts_at && p.ends_at) return `→ ${fmtDate(p.ends_at)}`;
  return `${fmtDate(p.starts_at!)} → ${fmtDate(p.ends_at!)}`;
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
  body: string;
  image_url: string;
  button_label: string;
  button_url: string;
  trigger_type: PopupTrigger;
  trigger_value: number;
  target_scope: PopupScope;
  /** Rå textarea-rad per sökväg. Städas av serveråtgärden. */
  paths: string;
  audience: PopupAudience;
  frequency: PopupFrequency;
  notify: boolean;
  active: boolean;
  start: string;
  end: string;
  sort: number;
};

function draftFrom(p: PopupRow): Draft {
  return {
    id: p.id,
    title: p.title ?? "",
    body: p.body ?? "",
    image_url: p.image_url ?? "",
    button_label: p.button_label ?? "",
    button_url: p.button_url ?? "",
    trigger_type: p.trigger_type,
    trigger_value: p.trigger_value,
    target_scope: p.target_scope,
    paths: (p.target_paths ?? []).join("\n"),
    audience: p.audience,
    frequency: p.frequency,
    notify: p.notify,
    active: p.active,
    start: toDateInput(p.starts_at),
    end: toDateInput(p.ends_at),
    sort: p.sort,
  };
}

const emptyDraft: Draft = {
  title: "",
  body: "",
  image_url: "",
  button_label: "",
  button_url: "",
  trigger_type: "load",
  trigger_value: 0,
  target_scope: "all",
  paths: "",
  audience: "all",
  frequency: "once",
  notify: true,
  active: true,
  start: "",
  end: "",
  sort: 0,
};

/** Standardvärde när redaktionen byter trigger — 0 s vore ingen fördröjning. */
function defaultValueFor(trigger: PopupTrigger, current: number) {
  if (trigger === "delay") return current > 0 ? current : 5;
  if (trigger === "scroll") return current > 0 && current <= 100 ? current : 50;
  return 0;
}

export function PopupsAdmin({ items }: { items: PopupRow[] }) {
  const [triggerFilter, setTriggerFilter] = useState<PopupTrigger | "all">("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PopupRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = items.filter(
    (p) => triggerFilter === "all" || p.trigger_type === triggerFilter
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
    const payload: PopupDraft = {
      id: draft.id,
      title: draft.title,
      body: draft.body,
      image_url: draft.image_url,
      button_label: draft.button_label,
      button_url: draft.button_url,
      trigger_type: draft.trigger_type,
      trigger_value: draft.trigger_value,
      target_scope: draft.target_scope,
      target_paths: draft.paths
        .split(/[\n,]/)
        .map((p) => p.trim())
        .filter(Boolean),
      audience: draft.audience,
      frequency: draft.frequency,
      notify: draft.notify,
      active: draft.active,
      starts_at: fromDateInput(draft.start, false),
      ends_at: fromDateInput(draft.end, true),
      sort: draft.sort,
    };
    run(() => savePopup(payload), () => setDraft(null));
  }

  const unit = draft ? triggerUnit(draft.trigger_type) : null;

  return (
    <div className="animate-sbfade space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Trigger"
          value={triggerFilter}
          onChange={(e) =>
            setTriggerFilter(e.target.value as PopupTrigger | "all")
          }
          className="min-w-[220px] py-2.5"
        >
          <option value="all">Alla triggers</option>
          {POPUP_TRIGGERS.map((t) => (
            <option key={t} value={t}>
              {TRIGGER_LABELS[t]}
            </option>
          ))}
        </Select>
        <Button className="ml-auto" onClick={() => setDraft({ ...emptyDraft })}>
          + Ny popup
        </Button>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-card)] border border-loss/40 bg-loss/10 px-4 py-3 text-[14px] text-loss">
          {error}
        </div>
      ) : null}

      {!visible.length ? (
        <div className="rounded-[var(--radius-card-lg)] border border-line bg-panel px-6 py-12 text-center text-muted">
          Inga popups ännu. Skapa en och välj när och var den ska visas.
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
          {visible.map((p) => {
            const status = statusOf(p);
            return (
              <div
                key={p.id}
                className={cn(
                  "flex flex-col overflow-hidden rounded-[var(--radius-card-lg)] border border-line bg-panel transition-colors hover:border-line-hover",
                  !p.active && "opacity-60"
                )}
              >
                <div className="flex h-[110px] shrink-0 items-center justify-center overflow-hidden border-b border-line-soft bg-[repeating-linear-gradient(135deg,var(--ad-a),var(--ad-a)_9px,var(--ad-b)_9px,var(--ad-b)_18px)] p-2">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="px-3 text-center font-mono-num text-[11.5px] tracking-[0.12em] text-faint">
                      TEXTPOPUP
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col p-3.5">
                  <div className="mb-2 flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {p.title || "Namnlös popup"}
                      </div>
                      <div className="truncate font-mono-num text-[11.5px] text-dim">
                        {p.button_url || "Ingen knapp"}
                      </div>
                    </div>
                    <Badge tone={status.tone} className="shrink-0">
                      {status.label}
                    </Badge>
                  </div>

                  <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span className="rounded-[var(--radius-badge)] bg-cyan/15 px-2 py-[3px] text-[11px] text-cyan">
                      {describeTrigger(p)}
                    </span>
                    <span className="rounded-[var(--radius-badge)] bg-panel-2 px-2 py-[3px] text-[11px] text-text-soft">
                      {describeScope(p)}
                    </span>
                    {p.audience !== "all" ? (
                      <span className="rounded-[var(--radius-badge)] bg-panel-2 px-2 py-[3px] text-[11px] text-text-soft">
                        {AUDIENCE_LABELS[p.audience]}
                      </span>
                    ) : null}
                    {p.notify ? (
                      <span className="rounded-[var(--radius-badge)] bg-yellow/15 px-2 py-[3px] text-[11px] text-yellow">
                        Notis
                      </span>
                    ) : null}
                    <span className="whitespace-nowrap font-mono-num text-[11.5px] text-muted">
                      {periodOf(p)}
                    </span>
                  </div>

                  <div className="mt-auto border-t border-line-soft pt-2.5">
                    <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 font-mono-num text-[12.5px]">
                      <span className="whitespace-nowrap text-text-soft">
                        {p.views} <span className="text-dim">visn.</span>
                      </span>
                      <span className="whitespace-nowrap text-text-soft">
                        {p.clicks} <span className="text-dim">klick</span>
                      </span>
                      <span className="whitespace-nowrap text-text-soft">
                        {p.dismissals} <span className="text-dim">stängda</span>
                      </span>
                      <span className="whitespace-nowrap text-win">
                        {p.ctr.toFixed(2)}%
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDraft(draftFrom(p))}
                        className="rounded-[7px] border border-line px-2.5 py-1 text-[11.5px] text-text-soft transition hover:border-line-hover"
                      >
                        Redigera
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(p)}
                        className="rounded-[7px] border border-line px-2.5 py-1 text-[11.5px] text-loss transition hover:border-loss/40"
                      >
                        Radera
                      </button>
                      <Switch
                        size="sm"
                        className="ml-auto"
                        checked={p.active}
                        disabled={pending}
                        label={`Aktivera ${p.title || "popup"}`}
                        onChange={(next) => run(() => setPopupActive(p.id, next))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {draft ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-auto bg-[rgba(5,7,12,.7)] p-4 backdrop-blur-[4px] sm:p-11">
          <div className="animate-sbfade w-full max-w-[680px] rounded-[var(--radius-sheet)] border border-line-strong bg-panel p-5 shadow-[var(--shadow-modal)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[21px] font-semibold uppercase tracking-[0.04em]">
                {draft.id ? "Redigera popup" : "Ny popup"}
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

            {/* ---------------- Innehåll ---------------- */}
            <SectionLabel>Innehåll</SectionLabel>
            <ImageUpload
              bucket="popups"
              label="Bild-URL"
              value={draft.image_url}
              onChange={(url) => setDraft({ ...draft, image_url: url })}
              hint="Valfri · visas överst i rutan, max 440 px bred · JPG, PNG, WebP eller GIF"
            />

            <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Rubrik"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="200 % välkomstbonus"
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Beskrivning"
                  value={draft.body}
                  rows={3}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  placeholder="Sätt in 100 kr och spela för 300 kr hos Unibet. Gäller till söndag."
                />
              </div>
              <Input
                label="Knapptext"
                value={draft.button_label}
                onChange={(e) =>
                  setDraft({ ...draft, button_label: e.target.value })
                }
                placeholder="Hämta bonusen"
              />
              <Input
                label="Knapplänk"
                value={draft.button_url}
                onChange={(e) =>
                  setDraft({ ...draft, button_url: e.target.value })
                }
                placeholder="/spelbolag eller https://…"
                className="font-mono-num text-[12.5px] text-text-soft"
              />
              <p className="text-[12.5px] text-muted sm:col-span-2">
                Rubrik, text och bild är alla valfria var för sig — men rutan
                behöver minst en av dem. Lämna knappfälten tomma för en ruta utan
                knapp. Externa länkar öppnas i ny flik.
              </p>
            </div>

            {/* ---------------- Trigger ---------------- */}
            <SectionLabel className="mt-5">När ska den visas?</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Trigger"
                value={draft.trigger_type}
                onChange={(e) => {
                  const next = e.target.value as PopupTrigger;
                  setDraft({
                    ...draft,
                    trigger_type: next,
                    trigger_value: defaultValueFor(next, draft.trigger_value),
                  });
                }}
              >
                {POPUP_TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {TRIGGER_LABELS[t]}
                  </option>
                ))}
              </Select>
              {unit ? (
                <Input
                  label={unit === "s" ? "Sekunder" : "Scrolldjup (%)"}
                  type="number"
                  min={unit === "s" ? 0 : 1}
                  max={unit === "s" ? undefined : 100}
                  value={String(draft.trigger_value)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      trigger_value: Number(e.target.value) || 0,
                    })
                  }
                  className="font-mono-num text-[13.5px]"
                />
              ) : (
                <div className="hidden sm:block" />
              )}
              <p className="text-[12.5px] text-muted sm:col-span-2">
                {TRIGGER_HINTS[draft.trigger_type]}
              </p>
            </div>

            {/* ---------------- Räckvidd ---------------- */}
            <SectionLabel className="mt-5">Var ska den visas?</SectionLabel>
            <div className="mb-3 flex gap-1.5 rounded-[10px] border border-line bg-bg-soft p-1">
              {(
                [
                  { value: "all" as const, label: "Alla sidor" },
                  { value: "paths" as const, label: "Specifika sidor" },
                ]
              ).map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={draft.target_scope === s.value}
                  onClick={() => setDraft({ ...draft, target_scope: s.value })}
                  className={cn(
                    "flex-1 rounded-[7px] px-3 py-2 text-[13.5px] transition",
                    draft.target_scope === s.value
                      ? "bg-panel-2 font-semibold text-text"
                      : "text-muted hover:text-text-soft"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {draft.target_scope === "paths" ? (
              <>
                <Textarea
                  label="Sökvägar"
                  value={draft.paths}
                  rows={4}
                  spellCheck={false}
                  onChange={(e) => setDraft({ ...draft, paths: e.target.value })}
                  placeholder={"/kuponger\n/spelbolag"}
                  className="font-mono-num text-[12.5px] leading-[1.6] text-text-soft"
                />
                <p className="mt-1.5 text-[12.5px] text-muted">
                  En sökväg per rad. Avsluta med{" "}
                  <span className="font-mono-num text-text-soft">*</span> för att
                  träffa allt under en sida —{" "}
                  <span className="font-mono-num text-text-soft">/kuponger*</span>{" "}
                  gäller även enskilda kuponger.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PATH_SUGGESTIONS.map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => {
                        const rows = draft.paths
                          .split("\n")
                          .map((r) => r.trim())
                          .filter(Boolean);
                        if (rows.includes(path)) return;
                        setDraft({
                          ...draft,
                          paths: [...rows, path].join("\n"),
                        });
                      }}
                      className="rounded-[7px] border border-line bg-bg px-2 py-1 font-mono-num text-[11.5px] text-text-soft transition hover:border-line-hover"
                    >
                      + {path}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[12.5px] text-muted">
                Rutan kan trigga på alla sidor i appen. Admin, inloggning och
                registrering är alltid undantagna.
              </p>
            )}

            {/* ---------------- Publik och frekvens ---------------- */}
            <SectionLabel className="mt-5">Vem och hur ofta</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Publik"
                value={draft.audience}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    audience: e.target.value as PopupAudience,
                  })
                }
              >
                {POPUP_AUDIENCES.map((a) => (
                  <option key={a} value={a}>
                    {AUDIENCE_LABELS[a]}
                  </option>
                ))}
              </Select>
              <Select
                label="Visningsfrekvens"
                value={draft.frequency}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    frequency: e.target.value as PopupFrequency,
                  })
                }
              >
                {POPUP_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </Select>
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
              <Input
                label="Sortering"
                type="number"
                value={String(draft.sort)}
                onChange={(e) =>
                  setDraft({ ...draft, sort: Number(e.target.value) || 0 })
                }
                className="font-mono-num text-[13.5px]"
              />
              <div className="hidden sm:block" />

              <ToggleRow
                title="Skapa notis"
                hint="Visningen lägger också en notis i sidopanelen, så inloggade hittar tillbaka till erbjudandet efter att de stängt rutan."
                checked={draft.notify}
                onChange={(next) => setDraft({ ...draft, notify: next })}
              />
              <ToggleRow
                title="Aktiv"
                hint="Pausade popups sparas men visas inte på sajten."
                checked={draft.active}
                onChange={(next) => setDraft({ ...draft, active: next })}
              />
            </div>

            {/* ---------------- Förhandsvisning ---------------- */}
            <div className="mt-5 rounded-[var(--radius-card)] border border-line-soft bg-bg p-3.5">
              <div className="mb-2.5 text-[10.5px] uppercase tracking-[0.12em] text-dim">
                Förhandsvisning
              </div>
              <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[var(--radius-sheet)] border border-line-strong bg-panel shadow-[var(--shadow-modal)]">
                {draft.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.image_url}
                    alt=""
                    className="block max-h-[200px] w-full object-cover"
                  />
                ) : null}
                <div className="p-4">
                  <div className="font-display text-[19px] font-semibold uppercase leading-[1.2] tracking-[0.03em]">
                    {draft.title || "Rubrik"}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-[1.5] text-text-soft">
                    {draft.body || "Beskrivningen visas här."}
                  </p>
                  {draft.button_label.trim() ? (
                    <div className="mt-3 rounded-[10px] bg-win px-4 py-2.5 text-center text-[14px] font-bold text-win-ink">
                      {draft.button_label}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 text-center text-[11.5px] text-dim">
                {TRIGGER_LABELS[draft.trigger_type].toLowerCase()} ·{" "}
                {draft.target_scope === "all"
                  ? "alla sidor"
                  : "valda sidor"} ·{" "}
                {FREQUENCY_LABELS[draft.frequency].toLowerCase()}
              </div>
            </div>

            {error ? (
              <div className="mt-3 text-[14px] text-loss">{error}</div>
            ) : null}

            <div className="mt-4 flex gap-2.5">
              <Button className="flex-1" disabled={pending} onClick={submit}>
                {pending ? "Sparar…" : "Spara popup"}
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
              Radera popup?
            </h2>
            <p className="mt-2 text-[14px] text-muted">
              {confirmDelete.title || "Namnlös popup"} ·{" "}
              {describeTrigger(confirmDelete)}. Bilden tas bort permanent och
              statistiken försvinner. Redan skapade notiser ligger kvar hos
              användarna.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  run(
                    () => deletePopup(confirmDelete.id),
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

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-2.5 text-[11px] uppercase tracking-[0.12em] text-muted",
        className
      )}
    >
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line-soft bg-bg px-3 py-2.5 sm:col-span-2">
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold">{title}</span>
        <span className="block text-[12.5px] text-muted">{hint}</span>
      </span>
      <Switch checked={checked} label={title} onChange={onChange} />
    </div>
  );
}
