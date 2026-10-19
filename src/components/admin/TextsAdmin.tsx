"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveTextOverrides } from "@/lib/admin/texts";
import type { TextOverrides } from "@/lib/texts";
import { cn } from "@/lib/utils";

export type TextAreaView = {
  id: string;
  label: string;
  description: string;
  paths: string[];
  cmsPages: { id: string; title: string }[];
  texts: { key: string; defaultValue: string; hint: string }[];
};

/** Utkast: string = nytt värde, null = återställ till standardtexten. */
type Draft = Record<string, string | null>;

const ALL = "__alla";

function varsOf(text: string) {
  return Array.from(new Set(text.match(/\{\w+\}/g) ?? []));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function TextsAdmin({
  areas,
  overrides: initialOverrides,
  initialArea,
  initialQuery,
}: {
  areas: TextAreaView[];
  overrides: TextOverrides;
  initialArea: string | null;
  initialQuery: string;
}) {
  const [overrides, setOverrides] = useState(initialOverrides);
  const [draft, setDraft] = useState<Draft>({});
  const [areaId, setAreaId] = useState(
    areas.some((a) => a.id === initialArea) ? initialArea! : areas[0]?.id ?? ALL
  );
  const [query, setQuery] = useState(initialQuery);
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirtyCount = Object.keys(draft).length;
  const total = areas.reduce((n, a) => n + a.texts.length, 0);

  const currentOf = (key: string, fallback: string) =>
    key in draft
      ? draft[key] ?? fallback
      : overrides[key] ?? fallback;

  const isOverridden = (key: string) =>
    key in draft ? draft[key] !== null : key in overrides;

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    const searching = term.length > 0;
    return areas
      .filter((a) => searching || areaId === ALL || a.id === areaId)
      .map((a) => ({
        ...a,
        texts: a.texts.filter((t) => {
          if (onlyChanged && !(t.key in overrides) && !(t.key in draft)) {
            return false;
          }
          if (!searching) return true;
          const value = t.key in draft ? draft[t.key] ?? "" : overrides[t.key] ?? "";
          return [t.key, t.defaultValue, t.hint, value].some((s) =>
            normalize(s).includes(term)
          );
        }),
      }))
      .filter((a) => a.texts.length > 0 || (!searching && !onlyChanged));
  }, [areas, areaId, query, onlyChanged, overrides, draft]);

  function change(key: string, defaultValue: string, value: string) {
    setSaved(false);
    setDraft((d) => {
      const next = { ...d };
      const stored = overrides[key];
      // Tillbaka till det som redan är sparat = ingen ändring.
      if (value === (stored ?? defaultValue)) delete next[key];
      else next[key] = value === defaultValue ? null : value;
      return next;
    });
  }

  function reset(key: string) {
    setSaved(false);
    setDraft((d) => {
      const next = { ...d };
      if (key in overrides) next[key] = null;
      else delete next[key];
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await saveTextOverrides(draft);
        setOverrides(next);
        setDraft({});
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kunde inte spara texterna.");
      }
    });
  }

  return (
    <div className="grid animate-[admfade_.22s_ease] grid-cols-1 items-start gap-5 lg:grid-cols-[240px_1fr]">
      <div className="rounded-[14px] border border-line bg-panel p-2 lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto">
        <div className="flex gap-1 overflow-x-auto lg:block">
          <AreaButton
            on={areaId === ALL}
            label="Alla texter"
            count={total}
            changed={Object.keys(overrides).length}
            onClick={() => setAreaId(ALL)}
          />
          {areas.map((a) => (
            <AreaButton
              key={a.id}
              on={areaId === a.id}
              label={a.label}
              count={a.texts.length}
              changed={a.texts.filter((t) => t.key in overrides).length}
              onClick={() => setAreaId(a.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="rounded-[14px] border border-line bg-panel p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök bland alla texter, t.ex. ”Logga in” eller hem.kpi"
              className="min-w-[220px] flex-1 rounded-[9px] border border-line bg-bg px-3 py-[10px] text-[14px] text-text outline-none focus:border-line-strong"
            />
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-text-soft">
              <input
                type="checkbox"
                checked={onlyChanged}
                onChange={(e) => setOnlyChanged(e.target.checked)}
              />
              Bara ändrade
            </label>
          </div>
          <p className="mt-2.5 text-[12.5px] text-dim">
            Texterna i koden är standard. Det du sparar här ersätter
            standardtexten på sajten direkt. Ord inom klammer, som{" "}
            <code className="font-mono-num text-text-soft">{"{antal}"}</code>,
            fylls i automatiskt och ska stå kvar.
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-[14px] border border-line bg-panel px-5 py-10 text-center text-[13.5px] text-dim">
            Inga texter matchar.
          </div>
        ) : null}

        {visible.map((area) => (
          <section
            key={area.id}
            className="overflow-hidden rounded-[14px] border border-line bg-panel"
          >
            <div className="border-b border-line-soft px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
                  {area.label}
                </span>
                <span className="font-mono-num text-[12px] text-dim">
                  {area.texts.length} texter
                </span>
                <span className="ml-auto flex flex-wrap gap-2">
                  {area.paths.map((path) => (
                    <a
                      key={path}
                      href={path}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[8px] border border-line px-2.5 py-1 text-[12px] text-text-soft no-underline hover:bg-hover hover:no-underline"
                    >
                      {path} ↗
                    </a>
                  ))}
                  {area.cmsPages.map((page) => (
                    <Link
                      key={page.id}
                      href={`/admin/sidor/${page.id}`}
                      className="rounded-[8px] border border-win/40 px-2.5 py-1 text-[12px] text-win no-underline hover:bg-hover hover:no-underline"
                    >
                      Innehåll i Sidor →
                    </Link>
                  ))}
                </span>
              </div>
              {area.description ? (
                <p className="mt-1 text-[13px] text-muted">
                  {area.description}
                </p>
              ) : null}
            </div>

            {area.texts.length === 0 ? (
              <div className="px-5 py-6 text-[13px] text-dim">
                Inga redigerbara texter i det här området.
              </div>
            ) : null}

            {area.texts.map((t) => {
              const value = currentOf(t.key, t.defaultValue);
              const overridden = isOverridden(t.key);
              const dirty = t.key in draft;
              const needed = varsOf(t.defaultValue);
              const missing = needed.filter((v) => !value.includes(v));
              const multiline =
                t.defaultValue.length > 70 || t.defaultValue.includes("\n");
              return (
                <div
                  key={t.key}
                  className={cn(
                    "border-b border-rowline px-5 py-3.5 last:border-b-0",
                    dirty && "bg-yellow/[0.04]"
                  )}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    {t.hint ? (
                      <span className="text-[13px] font-semibold text-text-soft">
                        {t.hint}
                      </span>
                    ) : null}
                    <code className="font-mono-num text-[11.5px] text-dim">
                      {t.key}
                    </code>
                    {overridden ? (
                      <span className="rounded-[5px] bg-win/15 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-win">
                        ÄNDRAD
                      </span>
                    ) : null}
                    {dirty ? (
                      <span className="rounded-[5px] bg-yellow/15 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-yellow">
                        EJ SPARAD
                      </span>
                    ) : null}
                    {overridden ? (
                      <button
                        type="button"
                        onClick={() => reset(t.key)}
                        className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-[12px] text-muted underline hover:text-text"
                      >
                        Återställ standard
                      </button>
                    ) : null}
                  </div>
                  {multiline ? (
                    <textarea
                      value={value}
                      rows={Math.min(8, Math.max(2, Math.ceil(value.length / 90)))}
                      onChange={(e) =>
                        change(t.key, t.defaultValue, e.target.value)
                      }
                      className="block w-full resize-y rounded-[9px] border border-line bg-bg px-3 py-2.5 text-[14px] leading-[1.5] text-text outline-none focus:border-line-strong"
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        change(t.key, t.defaultValue, e.target.value)
                      }
                      className="block w-full rounded-[9px] border border-line bg-bg px-3 py-[9px] text-[14px] text-text outline-none focus:border-line-strong"
                    />
                  )}
                  {overridden ? (
                    <div className="mt-1.5 text-[12px] text-dim">
                      Standard: {t.defaultValue || "(tom)"}
                    </div>
                  ) : null}
                  {missing.length ? (
                    <div className="mt-1.5 text-[12px] text-loss-text">
                      Saknar {missing.join(", ")} — värdet visas inte på sidan
                      utan dem.
                    </div>
                  ) : null}
                  {value.trim() === "" && t.defaultValue.trim() !== "" ? (
                    <div className="mt-1.5 text-[12px] text-yellow">
                      Tom text — inget visas på sidan.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        ))}

        <div className="sticky bottom-4 flex items-center justify-end gap-3">
          {error ? (
            <span className="rounded-[9px] border border-loss/40 bg-loss/10 px-3 py-2 text-[13px] text-loss-text">
              {error}
            </span>
          ) : null}
          {saved && !dirtyCount ? (
            <span className="font-mono-num text-[12.5px] text-win">
              Sparat ✓
            </span>
          ) : null}
          {dirtyCount ? (
            <button
              type="button"
              onClick={() => setDraft({})}
              disabled={pending}
              className="cursor-pointer rounded-[11px] border border-line bg-panel px-4 py-[13px] text-[14px] font-semibold text-text-soft"
            >
              Ångra
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending || !dirtyCount}
            onClick={save}
            className="cursor-pointer rounded-[11px] bg-win px-[26px] py-[13px] text-[15px] font-bold text-win-ink shadow-[0_10px_28px_rgba(0,0,0,.45)] transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending
              ? "Sparar…"
              : dirtyCount
                ? `Spara ${dirtyCount} ${dirtyCount === 1 ? "ändring" : "ändringar"}`
                : "Spara"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AreaButton({
  on,
  label,
  count,
  changed,
  onClick,
}: {
  on: boolean;
  label: string;
  count: number;
  changed: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-0.5 flex w-full shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[9px] border-0 px-[13px] py-[10px] text-left text-[14px] font-semibold transition-colors lg:whitespace-normal",
        on
          ? "bg-hover2 text-text"
          : "bg-transparent text-muted hover:bg-hover hover:text-text"
      )}
    >
      <span className="flex-1">{label}</span>
      {changed ? (
        <span className="font-mono-num text-[11px] text-win">{changed}</span>
      ) : null}
      <span className="font-mono-num text-[11px] text-dim">{count}</span>
    </button>
  );
}
