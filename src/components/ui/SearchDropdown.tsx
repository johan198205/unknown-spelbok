"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type DropdownOption = {
  value: string;
  label: string;
  /** Valfri bild-URL (t.ex. spelbolagslogo) — 18×18 i listan och valt värde */
  iconUrl?: string | null;
  /** Custom ikon (t.ex. LeagueLogo med fallback) — prioriteras framför iconUrl */
  icon?: ReactNode;
};

export type DropdownGroup = {
  label: string;
  options: DropdownOption[];
};

type SearchDropdownProps = {
  label: string;
  value: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options?: DropdownOption[];
  groups?: DropdownGroup[];
  onChange: (value: string) => void;
  /** Visar "+ Annat – skriv själv" och låter användaren skriva eget värde */
  allowCustom?: boolean;
  customPlaceholder?: string;
  boldValue?: boolean;
  disabled?: boolean;
  className?: string;
};

export function SearchDropdown({
  label,
  value,
  placeholder = "Välj …",
  searchPlaceholder = "Sök …",
  options,
  groups,
  onChange,
  allowCustom = false,
  customPlaceholder = "Skriv själv …",
  boldValue = false,
  disabled = false,
  className,
}: SearchDropdownProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState(false);

  const allGroups = useMemo((): DropdownGroup[] => {
    if (groups?.length) return groups;
    if (options?.length) return [{ label: "", options }];
    return [];
  }, [groups, options]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return allGroups;
    return allGroups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) =>
            o.label.toLowerCase().includes(needle) ||
            o.value.toLowerCase().includes(needle)
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [allGroups, q]);

  const empty = filtered.every((g) => g.options.length === 0);
  const selected = useMemo(() => {
    for (const g of allGroups) {
      const match = g.options.find((o) => o.value === value);
      if (match) return match;
    }
    return value ? ({ value, label: value } as DropdownOption) : null;
  }, [allGroups, value]);
  const display = selected?.label || placeholder;
  const isPlaceholder = !value;

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = requestAnimationFrame(() => searchRef.current?.focus());
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: string) {
    setCustom(false);
    onChange(next);
    setOpen(false);
  }

  function startCustom() {
    setCustom(true);
    onChange("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {label ? (
        <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
          {label}
        </div>
      ) : null}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[9px] border bg-bg-soft px-3 py-2.5 text-left text-[14px] transition",
          open ? "border-blue" : "border-line hover:border-line-hover",
          isPlaceholder ? "text-faint" : "text-text",
          boldValue && !isPlaceholder && "font-bold",
          disabled && "cursor-not-allowed opacity-45 hover:border-line"
        )}
      >
        {!isPlaceholder && (selected?.icon || selected?.iconUrl) ? (
          selected.icon ? (
            <span className="inline-flex shrink-0">{selected.icon}</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.iconUrl!}
              alt=""
              width={18}
              height={18}
              loading="lazy"
              className="h-[18px] w-[18px] shrink-0 object-contain"
            />
          )
        ) : null}
        <span className="min-w-0 flex-1 truncate">{display}</span>
        <span className="text-[11px] font-normal text-faint">▾</span>
      </button>

      {open && !disabled ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 flex max-h-80 flex-col rounded-[11px] border border-line-strong bg-panel-elevated shadow-[0_18px_50px_rgba(0,0,0,.6)]"
        >
          <div className="border-b border-line p-2">
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-line bg-bg-soft px-2.5 py-2 text-[13px] text-text outline-none placeholder:text-faint focus:border-blue"
            />
          </div>
          <div className="overflow-auto p-1.5">
            {filtered.map((g, groupIndex) => (
              <div
                key={g.label || `group-${groupIndex}`}
                className={cn(
                  groupIndex > 0 && "mt-1 border-t border-line-soft pt-1"
                )}
              >
                {g.label ? (
                  <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                    {g.label}
                  </div>
                ) : null}
                {g.options.map((o) => {
                  const active = o.value === value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pick(o.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[13.5px] font-semibold transition hover:bg-[#1F293C]",
                        active ? "bg-[#1F293C] text-win" : "text-text"
                      )}
                    >
                      {o.icon ? (
                        <span className="inline-flex shrink-0">{o.icon}</span>
                      ) : o.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={o.iconUrl}
                          alt=""
                          width={18}
                          height={18}
                          loading="lazy"
                          className="h-[18px] w-[18px] shrink-0 object-contain"
                        />
                      ) : null}
                      <span className="min-w-0 truncate">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {empty ? (
              <div className="px-2.5 py-3 text-[13px] text-faint">
                Inget matchar sökningen.
              </div>
            ) : null}
          </div>
          {allowCustom ? (
            <button
              type="button"
              onClick={startCustom}
              className="border-t border-line px-4 py-2.5 text-left text-[13.5px] font-semibold text-blue hover:text-[#7FB0FF]"
            >
              + Annat – skriv själv
            </button>
          ) : null}
        </div>
      ) : null}

      {custom || (allowCustom && value && !isKnownValue(value, allGroups)) ? (
        <input
          value={value}
          onChange={(e) => {
            setCustom(true);
            onChange(e.target.value);
          }}
          placeholder={customPlaceholder}
          className="mt-2 w-full rounded-[9px] border border-line bg-bg-soft px-3 py-2.5 text-[14px] font-bold text-text outline-none placeholder:font-normal placeholder:text-faint focus:border-blue"
        />
      ) : null}
    </div>
  );
}

function isKnownValue(value: string, groups: DropdownGroup[]) {
  return groups.some((g) => g.options.some((o) => o.value === value));
}
