"use client";

import { useEffect, useId, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Switch } from "@/components/ui/Switch";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { BookmakerCard } from "@/components/bets/BookmakerCard";
import {
  getClicksSeries,
  reorderBookmakers,
  saveBookmaker,
  toggleBookmakerActive,
  type BookmakerRow,
  type ClickPoint,
} from "@/lib/admin/bookmakers";
import { cn, slugify } from "@/lib/utils";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";

const PAYMENT_OPTIONS = ["Swish", "Trustly", "Bankkort", "Apple Pay", "Klarna"];

const inputClass =
  "w-full rounded-[9px] border border-line bg-bg-soft px-3 py-[11px] text-[14px] text-text outline-none placeholder:text-dim focus:border-line-hover";
const monoInputClass =
  "w-full rounded-[9px] border border-line bg-bg-soft px-3 py-[11px] font-mono-num text-[13.5px] text-text-soft outline-none placeholder:text-dim focus:border-line-hover";

type Draft = {
  id: string | null;
  name: string;
  slug: string;
  logo_url: string;
  rating: string;
  rank: string;
  bonus: string;
  bonus_value: string;
  terms: string;
  usp: string;
  review: string;
  plus: string[];
  minus: string[];
  payments: string[];
  fast_payout: boolean;
  tracking_url: string;
  active: boolean;
};

type Status = { tone: "ok" | "error"; text: string } | null;

function toDraft(b: BookmakerRow): Draft {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo_url: b.logo_url ?? "",
    rating: b.rating != null ? String(b.rating).replace(".", ",") : "",
    rank: String(b.rank),
    bonus: b.bonus ?? "",
    bonus_value: b.bonus_value != null ? String(b.bonus_value) : "",
    terms: b.terms ?? "",
    usp: b.usp ?? "",
    review: b.review ?? "",
    plus: b.plus ?? [],
    minus: b.minus ?? [],
    payments: b.payments ?? [],
    fast_payout: b.fast_payout,
    tracking_url: b.tracking_url ?? "",
    active: b.active,
  };
}

function newDraft(rank: number): Draft {
  return {
    id: null,
    name: "",
    slug: "",
    logo_url: "",
    rating: "",
    rank: String(rank),
    bonus: "",
    bonus_value: "",
    terms: "",
    usp: "",
    review: "",
    plus: [],
    minus: [],
    payments: [],
    fast_payout: false,
    tracking_url: "",
    active: true,
  };
}

function parseNum(value: string) {
  const n = Number(value.replace(",", ".").trim());
  return value.trim() && Number.isFinite(n) ? n : null;
}

function rankColor(rank: number) {
  if (rank === 1) return "var(--amber)";
  if (rank === 2) return "#C9D1DE";
  if (rank === 3) return "#D08A55";
  return "var(--muted)";
}

export function BookmakersAdmin({ items }: { items: BookmakerRow[] }) {
  const [seed, setSeed] = useState(items);
  const [list, setList] = useState(items);
  const [draft, setDraft] = useState<Draft>(() =>
    items[0] ? toDraft(items[0]) : newDraft(1)
  );
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [clicks, setClicks] = useState<{ id: string; points: ClickPoint[] } | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  if (seed !== items) {
    setSeed(items);
    setList(items);
    if (!dirty) {
      const current = draft.id ? items.find((i) => i.id === draft.id) : null;
      setDraft(
        current ? toDraft(current) : items[0] ? toDraft(items[0]) : newDraft(1)
      );
    }
  }

  const selectedId = draft.id;
  const series = clicks?.id === selectedId ? clicks.points : [];

  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    getClicksSeries(selectedId).then((points) => {
      if (alive) setClicks({ id: selectedId, points });
    });
    return () => {
      alive = false;
    };
  }, [selectedId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const clicks30 =
    list.find((b) => b.id === selectedId)?.clicks30 ??
    series.reduce((sum, p) => sum + p.count, 0);

  function patch(next: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...next }));
    setDirty(true);
    setStatus(null);
  }

  function confirmLeave() {
    return (
      !dirty ||
      window.confirm("Du har osparade ändringar. Vill du lämna dem ändå?")
    );
  }

  function select(b: BookmakerRow) {
    if (b.id === draft.id || !confirmLeave()) return;
    setDraft(toDraft(b));
    setDirty(false);
    setStatus(null);
  }

  function startNew() {
    if (!confirmLeave()) return;
    setDraft(newDraft(list.length + 1));
    setDirty(true);
    setStatus(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = list.findIndex((b) => b.id === active.id);
    const to = list.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;

    const next = arrayMove(list, from, to).map((b, i) => ({
      ...b,
      rank: i + 1,
    }));
    setList(next);
    if (!dirty) {
      const own = next.find((b) => b.id === draft.id);
      if (own) setDraft((d) => ({ ...d, rank: String(own.rank) }));
    }

    startTransition(async () => {
      await reorderBookmakers(next.map((b) => b.id));
    });
  }

  function toggleActive(b: BookmakerRow) {
    const next = !b.active;
    setList((l) => l.map((x) => (x.id === b.id ? { ...x, active: next } : x)));
    if (b.id === draft.id && !dirty) {
      setDraft((d) => ({ ...d, active: next }));
    }
    startTransition(async () => {
      await toggleBookmakerActive(b.id, next);
    });
  }

  function setPublished(next: boolean) {
    if (!draft.id) {
      patch({ active: next });
      return;
    }
    const id = draft.id;
    setDraft((d) => ({ ...d, active: next }));
    setList((l) => l.map((x) => (x.id === id ? { ...x, active: next } : x)));
    startTransition(async () => {
      await toggleBookmakerActive(id, next);
      setStatus({
        tone: "ok",
        text: next ? "Spelbolaget är publicerat." : "Spelbolaget är avpublicerat.",
      });
    });
  }

  function save() {
    if (!draft.name.trim()) {
      setStatus({ tone: "error", text: "Namn krävs." });
      return;
    }
    if (!draft.logo_url.trim()) {
      setStatus({ tone: "error", text: "Logotyp krävs." });
      return;
    }
    startTransition(async () => {
      const result = await saveBookmaker({
        id: draft.id,
        name: draft.name,
        slug: draft.slug,
        logo_url: draft.logo_url,
        rating: parseNum(draft.rating),
        rank: parseNum(draft.rank),
        bonus: draft.bonus,
        bonus_value: parseNum(draft.bonus_value) ?? 0,
        terms: draft.terms,
        usp: draft.usp,
        review: draft.review,
        plus: draft.plus,
        minus: draft.minus,
        payments: draft.payments,
        fast_payout: draft.fast_payout,
        tracking_url: draft.tracking_url,
        active: draft.active,
      });

      if (!result.ok) {
        setStatus({ tone: "error", text: result.error });
        return;
      }
      setDirty(false);
      setDraft((d) => ({ ...d, id: result.id }));
      setStatus({ tone: "ok", text: "Ändringarna är sparade." });
    });
  }

  const paymentChips = [
    ...PAYMENT_OPTIONS,
    ...draft.payments.filter((p) => !PAYMENT_OPTIONS.includes(p)),
  ];

  return (
    <div className="grid animate-[admfade_.22s_ease] items-start gap-[18px] xl:grid-cols-2">
      <div className="min-w-0 overflow-hidden rounded-[14px] border border-line bg-panel">
        <div className="flex items-center justify-between gap-3 border-b border-line-row px-4 py-3.5">
          <div className="font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
            Rankordning
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[12.5px] text-dim sm:inline">
              Dra för att sortera om
            </span>
            <button
              type="button"
              onClick={startNew}
              className="rounded-[9px] border border-line-strong bg-panel-2 px-3 py-1.5 text-[13px] font-semibold text-text-soft hover:border-line-hover"
            >
              + Nytt spelbolag
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={list.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {list.map((b) => (
              <SortableBookmakerRow
                key={b.id}
                bookmaker={b}
                selected={b.id === draft.id}
                onSelect={() => select(b)}
                onToggleActive={() => toggleActive(b)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {!list.length ? (
          <div className="px-4 py-10 text-center text-muted">
            Inga spelbolag ännu.
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-3.5">
        <Section title="Grunduppgifter">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Namn">
              <input
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value;
                  patch(
                    draft.id || draft.slug
                      ? { name }
                      : { name, slug: slugify(name) }
                  );
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Slug">
              <input
                value={draft.slug}
                onChange={(e) => patch({ slug: e.target.value })}
                onBlur={(e) => patch({ slug: slugify(e.target.value) })}
                placeholder="betsson"
                className={monoInputClass}
              />
            </Field>
            <Field label="Betyg (0–5)">
              <input
                value={draft.rating}
                onChange={(e) => patch({ rating: e.target.value })}
                inputMode="decimal"
                placeholder="4,7"
                className={cn(monoInputClass, "text-text")}
              />
            </Field>
            <Field label="Rank">
              <input
                value={draft.rank}
                onChange={(e) => patch({ rank: e.target.value })}
                inputMode="numeric"
                className={cn(monoInputClass, "text-text")}
              />
            </Field>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.12em] text-dim">
              Logotyp
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-line-soft bg-panel-2">
                {draft.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getBookmakerLogoUrl(draft.logo_url) ?? draft.logo_url}
                    alt=""
                    className="max-h-9 max-w-[80%] object-contain"
                  />
                ) : (
                  <span className="text-[11px] text-dim">Ingen logga</span>
                )}
              </span>
              <div className="flex-1 rounded-[10px] border border-dashed border-line-strong p-3">
                <ImageUpload
                  bucket="bookmaker-logos"
                  label="Logotyp"
                  value={draft.logo_url}
                  onChange={(url) => patch({ logo_url: url })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2.5 text-[13.5px] text-text-soft">
            <Switch
              size="sm"
              checked={draft.fast_payout}
              onChange={(next) => patch({ fast_payout: next })}
              label="Snabba uttag"
            />
            Snabba uttag
          </div>
        </Section>

        <Section title="Erbjudande">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <Field label="Bonustext">
              <input
                value={draft.bonus}
                onChange={(e) => patch({ bonus: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Värde (kr)">
              <input
                value={draft.bonus_value}
                onChange={(e) => patch({ bonus_value: e.target.value })}
                inputMode="numeric"
                className={cn(monoInputClass, "text-text")}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Villkorstext">
                <input
                  value={draft.terms}
                  onChange={(e) => patch({ terms: e.target.value })}
                  className={cn(inputClass, "text-[13.5px] text-text-soft")}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="USP-rad">
                <input
                  value={draft.usp}
                  onChange={(e) => patch({ usp: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Recension">
          <textarea
            value={draft.review}
            onChange={(e) => patch({ review: e.target.value })}
            rows={3}
            className="w-full resize-y rounded-[9px] border border-line bg-bg-soft p-3 text-[14px] leading-[1.55] text-text outline-none focus:border-line-hover"
          />
          <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
            <ListEditor
              tone="plus"
              label="Plus"
              values={draft.plus}
              onChange={(plus) => patch({ plus })}
            />
            <ListEditor
              tone="minus"
              label="Minus"
              values={draft.minus}
              onChange={(minus) => patch({ minus })}
            />
          </div>
        </Section>

        <Section title="Betalmetoder">
          <div className="flex flex-wrap gap-2">
            {paymentChips.map((p) => {
              const on = draft.payments.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    patch({
                      payments: on
                        ? draft.payments.filter((x) => x !== p)
                        : [...draft.payments, p],
                    })
                  }
                  className={cn(
                    "rounded-full border px-3.5 py-2.5 text-[13.5px] font-semibold transition",
                    on
                      ? "border-[rgba(102,227,138,.45)] bg-win/15 text-win"
                      : "border-line bg-bg-soft text-text-soft hover:border-line-hover"
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Affiliate">
          <Field label="Tracking-URL">
            <div className="flex gap-2.5">
              <input
                value={draft.tracking_url}
                onChange={(e) => patch({ tracking_url: e.target.value })}
                placeholder="https://…"
                className={cn(monoInputClass, "min-w-0 flex-1 text-[12.5px]")}
              />
              <a
                href={draft.tracking_url || "#"}
                target="_blank"
                rel="noopener nofollow noreferrer"
                aria-disabled={!draft.tracking_url}
                onClick={(e) => {
                  if (!draft.tracking_url) e.preventDefault();
                }}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-[9px] border border-line-strong bg-panel-2 px-4 py-[11px] text-[14px] font-semibold text-text no-underline hover:text-text hover:no-underline",
                  !draft.tracking_url && "pointer-events-none opacity-40"
                )}
              >
                Testa länk
              </a>
            </div>
          </Field>

          <div className="mt-3.5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10.5px] uppercase tracking-[0.12em] text-dim">
                Klick 30 dagar
              </span>
              <span className="font-mono-num text-[13px] text-win">
                {clicks30.toLocaleString("sv-SE")} klick
              </span>
            </div>
            {selectedId ? (
              <ClicksChart data={series} />
            ) : (
              <div className="rounded-[10px] border border-dashed border-line-strong px-3 py-6 text-center text-[13px] text-dim">
                Klickstatistik visas när spelbolaget är sparat.
              </div>
            )}
          </div>
        </Section>

        <Section title="Förhandsvisning">
          <BookmakerCard
            preview
            className="max-w-[300px]"
            data={{
              name: draft.name || "Nytt spelbolag",
              slug: draft.slug,
              logo_url: draft.logo_url || null,
              rank: parseNum(draft.rank) ?? 0,
              rating: parseNum(draft.rating),
              bonus: draft.bonus || null,
              bonus_value: parseNum(draft.bonus_value) ?? 0,
              usp: draft.usp || null,
              terms: draft.terms || null,
              review: draft.review || null,
              plus: draft.plus,
              minus: draft.minus,
              tracking_url: draft.tracking_url || null,
            }}
          />
        </Section>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-2.5 bg-bg-soft py-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex-1 rounded-[11px] bg-win px-4 py-3.5 text-[15px] font-bold text-win-ink transition hover:brightness-105 disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Spara ändringar"}
          </button>
          <button
            type="button"
            onClick={() => setPublished(!draft.active)}
            disabled={pending}
            className="rounded-[11px] border border-line-strong bg-panel-2 px-5 py-3.5 font-semibold text-text-soft disabled:opacity-50"
          >
            {draft.active ? "Avpublicera" : "Publicera"}
          </button>
          {status ? (
            <span
              className={cn(
                "w-full text-[13px]",
                status.tone === "ok" ? "text-win" : "text-loss"
              )}
            >
              {status.text}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SortableBookmakerRow({
  bookmaker,
  selected,
  onSelect,
  onToggleActive,
}: {
  bookmaker: BookmakerRow;
  selected: boolean;
  onSelect: () => void;
  onToggleActive: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bookmaker.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex cursor-pointer items-center gap-3 border-b border-rowline border-l-[3px] px-4 py-3 transition hover:bg-hover",
        selected ? "border-l-win bg-hover" : "border-l-transparent",
        isDragging && "relative z-10 bg-hover2 opacity-90"
      )}
    >
      <button
        type="button"
        aria-label={`Sortera ${bookmaker.name}`}
        onClick={(e) => e.stopPropagation()}
        className="flex shrink-0 cursor-grab flex-col gap-[2.5px] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <span className="block h-0.5 w-3 rounded-[2px] bg-line-hover" />
        <span className="block h-0.5 w-3 rounded-[2px] bg-line-hover" />
        <span className="block h-0.5 w-3 rounded-[2px] bg-line-hover" />
      </button>

      <span
        className="font-mono-num w-5 shrink-0 text-[14px] font-semibold"
        style={{ color: rankColor(bookmaker.rank) }}
      >
        {bookmaker.rank}
      </span>

      <span className="flex h-[30px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-panel-2">
        {bookmaker.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getBookmakerLogoUrl(bookmaker.logo_url) ?? bookmaker.logo_url}
            alt=""
            className="max-h-[22px] max-w-[78%] object-contain"
          />
        ) : (
          <span className="font-display text-[11px] text-muted">
            {bookmaker.name.slice(0, 3).toUpperCase()}
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">
          {bookmaker.name}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-[7px]">
          <StarRow rating={bookmaker.rating} />
          <span className="font-mono-num shrink-0 text-[11.5px] text-amber">
            {bookmaker.rating != null
              ? String(bookmaker.rating.toFixed(1)).replace(".", ",")
              : "–"}
          </span>
          {bookmaker.fast_payout ? (
            <span className="shrink-0 rounded-[5px] bg-cyan/15 px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.08em] text-cyan">
              SNABBA UTTAG
            </span>
          ) : null}
        </div>
      </div>

      {/* Klicksiffran är sekundär — den viker undan först när raden blir
          trång, så namn och toggle aldrig kapas. */}
      <span className="font-mono-num hidden shrink-0 whitespace-nowrap text-[12.5px] text-text-soft sm:inline">
        {bookmaker.clicks30.toLocaleString("sv-SE")} klick
      </span>

      <div onClick={(e) => e.stopPropagation()}>
        <Switch
          size="sm"
          checked={bookmaker.active}
          onChange={onToggleActive}
          label={`${bookmaker.active ? "Avpublicera" : "Publicera"} ${bookmaker.name}`}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-panel p-[18px]">
      <div className="font-display mb-3.5 text-[16px] font-semibold uppercase tracking-[0.05em]">
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.12em] text-dim">
        {label}
      </div>
      {children}
    </div>
  );
}

function ListEditor({
  tone,
  label,
  values,
  onChange,
}: {
  tone: "plus" | "minus";
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const accent = tone === "plus" ? "text-win" : "text-loss";
  const symbol = tone === "plus" ? "+" : "−";

  return (
    <div>
      <div
        className={cn(
          "mb-2 text-[10.5px] uppercase tracking-[0.12em] font-semibold",
          accent
        )}
      >
        {label}
      </div>
      {values.map((value, index) => (
        <div key={index} className="mb-[7px] flex items-center gap-2">
          <span className={cn("font-bold", accent)}>{symbol}</span>
          <input
            value={value}
            onChange={(e) => {
              const next = values.slice();
              next[index] = e.target.value;
              onChange(next);
            }}
            className="min-w-0 flex-1 rounded-lg border border-line bg-bg-soft px-2.5 py-2 text-[13px] text-text-soft outline-none focus:border-line-hover"
          />
          <button
            type="button"
            aria-label="Ta bort rad"
            onClick={() => onChange(values.filter((_, i) => i !== index))}
            className="size-7 shrink-0 rounded-[7px] border border-line text-dim hover:text-text"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className={cn(
          "w-full rounded-lg border border-dashed border-line-strong py-2 text-[13px] font-semibold",
          accent
        )}
      >
        + Lägg till rad
      </button>
    </div>
  );
}

function StarRow({ rating }: { rating: number | null }) {
  const rawId = useId();
  const maskId = `stars-${rawId.replace(/:/g, "")}`;
  const points =
    "10,1.6 12.4,7 18.3,7.6 13.9,11.6 15.1,17.4 10,14.4 4.9,17.4 6.1,11.6 1.7,7.6 7.6,7";
  const stars = [0, 1, 2, 3, 4];
  const width = Math.max(0, Math.min(1, (rating ?? 0) / 5)) * 104;

  return (
    <svg
      viewBox="0 0 104 20"
      aria-hidden="true"
      className="block h-3 w-[66px] shrink-0"
    >
      {stars.map((i) => (
        <polygon
          key={i}
          points={points}
          transform={`translate(${i * 21},0)`}
          fill="var(--line-strong)"
        />
      ))}
      <mask id={maskId}>
        <rect x="0" y="0" width={width} height="20" fill="white" />
      </mask>
      <g mask={`url(#${maskId})`}>
        {stars.map((i) => (
          <polygon
            key={i}
            points={points}
            transform={`translate(${i * 21},0)`}
            fill="var(--amber)"
          />
        ))}
      </g>
    </svg>
  );
}

function ClicksChart({ data }: { data: ClickPoint[] }) {
  const formatted = data.map((d) => ({ ...d, label: shortDay(d.date) }));

  return (
    <div className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formatted}
          margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--line-soft)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{
              fill: "var(--dim)",
              fontSize: 10,
              fontFamily: "var(--font-plex)",
            }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            allowDecimals={false}
            width={34}
            tick={{
              fill: "var(--dim)",
              fontSize: 10,
              fontFamily: "var(--font-plex)",
            }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--hover2)" }}
            contentStyle={{
              background: "var(--panel-elevated)",
              border: "1px solid var(--line-strong)",
              borderRadius: 10,
              fontSize: 12.5,
            }}
            labelStyle={{ color: "var(--muted)" }}
            itemStyle={{ color: "var(--win)" }}
          />
          <Bar
            dataKey="count"
            name="Klick"
            fill="#2E7A4C"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortDay(isoDay: string) {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
