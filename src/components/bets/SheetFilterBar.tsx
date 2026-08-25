"use client";

import { useEffect, useRef, useState } from "react";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { Select } from "@/components/ui/Input";
import {
  DENSITY_OPTIONS,
  PERIOD_FILTER_OPTIONS,
  RESULT_FILTER_OPTIONS,
  SPORT_FILTER_OPTIONS,
  VIEW_OPTIONS,
  activeFilterChips,
  activeFilterCount,
  clearPanelFilters,
  type BookmakerOption,
  type LeagueOption,
  type SheetDensity,
  type SheetFilterState,
  type SheetPeriodFilter,
  type SheetResultFilter,
  type SheetSportFilter,
  type SheetViewMode,
} from "@/lib/sheet-filters";
import type { BetCategory } from "@/lib/bet-category";
import { cn } from "@/lib/utils";

/**
 * Pill-grupp: mörk track med en markerad knapp. Används på flera ställen.
 *
 * Valet ligger i URL:en och hinner inte uppdateras förrän navigeringen är
 * klar. Utan ett eget val däremellan står pillret kvar på det gamla värdet
 * hela vägen, och klicket ser ut att ha missat. Det egna valet markeras
 * direkt och släpps så fort propen kommer ikapp.
 */
export function PillGroup<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  const [picked, setPicked] = useState<T | null>(null);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setPicked(null);
  }

  const shown = picked ?? value;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-[3px] rounded-[9px] border border-line-soft bg-bg-soft p-[3px]",
        className
      )}
    >
      {options.map((opt) => {
        const active = shown === opt.value;
        const waiting = active && picked !== null && picked !== value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (opt.value === shown) return;
              setPicked(opt.value);
              onChange(opt.value);
            }}
            aria-pressed={active}
            aria-busy={waiting || undefined}
            className={cn(
              "cursor-pointer rounded-[7px] px-3.5 py-2 text-[14px] font-semibold transition",
              active
                ? "bg-panel-2 text-text"
                : "bg-transparent text-muted hover:text-text",
              waiting && "animate-sbshimmer"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Filterraden: två synliga kontroller i stället för sex dropdowns.
 *
 * Perioden ligger här — den styr både grafen och tabellen. Resten av
 * filtren bor i en panel bakom en knapp och syns som chips när de är på.
 */
export function SheetFilterBar({
  filters,
  leagues,
  categories,
  bookmakers,
  filteredCount,
  totalCount,
  onChange,
}: {
  filters: SheetFilterState;
  leagues: LeagueOption[];
  categories: BetCategory[];
  bookmakers: BookmakerOption[];
  filteredCount: number;
  totalCount: number;
  onChange: (patch: Partial<SheetFilterState>) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const count = activeFilterCount(filters);
  const allChips = activeFilterChips(filters, bookmakers);

  // Chipet ska försvinna på klicket, inte när servern svarat. Listan nollställs
  // så fort filtren faktiskt ändrats, så inget chip göms i onödan.
  const [removing, setRemoving] = useState<string[]>([]);
  const [seenFilters, setSeenFilters] = useState(filters);
  if (seenFilters !== filters) {
    setSeenFilters(filters);
    setRemoving([]);
  }
  const chips = allChips.filter((chip) => !removing.includes(chip.key));

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <PillGroup<SheetPeriodFilter>
        value={filters.period}
        options={PERIOD_FILTER_OPTIONS}
        onChange={(period) => onChange({ period })}
      />

      <div ref={panelRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-[9px] border bg-panel px-[15px] py-2.5 text-[14px] font-semibold text-text transition",
            open
              ? "border-line-hover"
              : count > 0
                ? "border-[var(--win-border)]"
                : "border-line hover:border-line-strong"
          )}
        >
          Filter
          {count > 0 ? (
            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-win px-1.5 font-mono-num text-[11px] font-bold text-win-ink">
              {count}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute left-0 top-full z-30 mt-2 w-[264px] rounded-[12px] border border-line-strong bg-panel-elevated p-3 shadow-[var(--shadow-dropdown)]">
            <div className="space-y-2.5">
              <Select
                label="Sport"
                value={filters.sport}
                onChange={(e) =>
                  onChange({ sport: e.target.value as SheetSportFilter })
                }
                className="py-2.5"
              >
                {SPORT_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>

              <Select
                label="Liga"
                value={filters.league}
                onChange={(e) => onChange({ league: e.target.value })}
                className="py-2.5"
              >
                <option value="">Alla ligor</option>
                {leagues.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Kategori"
                value={filters.category}
                onChange={(e) => onChange({ category: e.target.value })}
                className="py-2.5"
              >
                <option value="">Alla kategorier</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>

              <Select
                label="Spelbolag"
                value={filters.bookmaker}
                onChange={(e) => onChange({ bookmaker: e.target.value })}
                className="py-2.5"
              >
                <option value="">Alla spelbolag</option>
                {bookmakers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.count})
                  </option>
                ))}
              </Select>

              <Select
                label="Rättning"
                value={filters.result}
                onChange={(e) =>
                  onChange({ result: e.target.value as SheetResultFilter })
                }
                className="py-2.5"
              >
                {RESULT_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            <button
              type="button"
              onClick={() => onChange(clearPanelFilters(filters))}
              disabled={count === 0}
              className="mt-3 w-full cursor-pointer rounded-[8px] border border-line px-3 py-2 text-[13px] font-semibold text-muted transition hover:text-text disabled:cursor-not-allowed disabled:opacity-45"
            >
              Rensa filter
            </button>
          </div>
        ) : null}
      </div>

      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => {
            setRemoving((current) => [...current, chip.key]);
            onChange(
              chip.key === "sport"
                ? { sport: "all" }
                : chip.key === "result"
                  ? { result: "all" }
                  : { [chip.key]: "" }
            );
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--win-border)] bg-[var(--win-fill)] px-[13px] py-2 text-[13.5px] font-semibold text-win transition hover:brightness-110"
        >
          {chip.key === "league" ? (
            <LeagueLogo
              src={leagues.find((l) => l.name === chip.label)?.logo}
              leagueId={leagues.find((l) => l.name === chip.label)?.leagueId}
              sport={leagues.find((l) => l.name === chip.label)?.sport}
              name={chip.label}
              size={16}
            />
          ) : null}
          <span className="max-w-[180px] truncate">{chip.label}</span>
          <span aria-hidden className="text-[15px] leading-none">
            ×
          </span>
          <span className="sr-only">Ta bort filtret</span>
        </button>
      ))}

      <div className="ml-auto flex flex-wrap items-center gap-2.5">
        <span className="font-mono-num text-[14px] text-muted">
          {filteredCount} av {totalCount} spel
        </span>
        <PillGroup<SheetDensity>
          value={filters.density}
          options={DENSITY_OPTIONS}
          onChange={(density) => onChange({ density })}
        />
        <PillGroup<SheetViewMode>
          value={filters.view}
          options={VIEW_OPTIONS}
          onChange={(view) => onChange({ view })}
          className="max-sheet:hidden"
        />
      </div>
    </div>
  );
}
