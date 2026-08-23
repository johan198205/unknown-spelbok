"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  MAX_CONDITIONS_PER_RULE,
  SIGNAL_BET_TYPES,
  SIGNAL_FIELDS,
  SIGNAL_FIELD_GROUPS,
  SIGNAL_OPERATORS,
  SIGNAL_SPORTS,
  signalField,
  type SignalFieldGroup,
} from "@/lib/signals/fields";
import { formatFieldValue } from "@/lib/signals/evaluate";
import type { SignalConditions } from "@/lib/signals/evaluate";
import type { SignalRule } from "@/lib/types";
import { cn } from "@/lib/utils";

type ConditionDraft = { field: string; op: string; value: string };

type PreviewCondition = {
  field: string;
  op: string;
  value: number;
  actual: number | null;
  hit: boolean;
};

type PreviewMatch = {
  fixture_id: number;
  match: string;
  league: string | null;
  hit: boolean;
  skipped: string | null;
  label: string | null;
  home_matches_played: number;
  away_matches_played: number;
  conditions: PreviewCondition[];
};

type PreviewResult = {
  total: number;
  hits: number;
  matches: PreviewMatch[];
  empty?: boolean;
  truncated?: boolean;
};

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-bg-soft px-3 py-2.5 text-[14px] text-text outline-none focus:border-blue";
const labelClass =
  "mb-1.5 block text-[11px] uppercase tracking-[0.1em] text-muted";

function emptyCondition(): ConditionDraft {
  return { field: SIGNAL_FIELDS[0].key, op: ">=", value: "0" };
}

function toDrafts(conditions: SignalRule["conditions"]): ConditionDraft[] {
  const all = (conditions as SignalConditions | null)?.all;
  if (!Array.isArray(all) || !all.length) return [emptyCondition()];
  return all.map((c) => ({
    field: c.field,
    op: c.op,
    value: String(c.value),
  }));
}

/** Fälten grupperade för optgroup, i bibliotekets ordning. */
function groupedFields() {
  const groups = new Map<SignalFieldGroup, typeof SIGNAL_FIELDS>();
  for (const field of SIGNAL_FIELDS) {
    const list = groups.get(field.group) ?? [];
    groups.set(field.group, [...list, field] as typeof SIGNAL_FIELDS);
  }
  return [...groups.entries()];
}

export function RuleEditor({
  rule,
  onClose,
  onSaved,
}: {
  rule: SignalRule | null;
  onClose: () => void;
  onSaved: (rule: SignalRule) => void;
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [sport, setSport] = useState(rule?.sport ?? "football");
  const [betType, setBetType] = useState(rule?.bet_type ?? "over_2_5");
  const [weight, setWeight] = useState(rule?.weight ?? 25);
  const [minMatches, setMinMatches] = useState(rule?.min_matches_played ?? 8);
  const [template, setTemplate] = useState(rule?.label_template ?? "");
  const [conditions, setConditions] = useState<ConditionDraft[]>(
    toDrafts(rule?.conditions ?? null)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  const groups = useMemo(() => groupedFields(), []);

  /**
   * En förhandsgranskning gäller den regel som testades. Så fort något som
   * påverkar utfallet ändras kastas den — annars står gamla träffsiffror
   * kvar bredvid nya villkor och ser ut att bekräfta dem.
   *
   * Nollställs i setterna, inte i en effekt: effekten hade kört efter
   * renderingen och visat det gamla resultatet ett ögonblick för länge.
   */
  const invalidate = useCallback(() => setPreview(null), []);

  const changeSport = (value: string) => {
    setSport(value);
    invalidate();
  };
  const changeMinMatches = (value: number) => {
    setMinMatches(value);
    invalidate();
  };
  const changeTemplate = (value: string) => {
    setTemplate(value);
    invalidate();
  };
  const changeConditions = (
    next: ConditionDraft[] | ((prev: ConditionDraft[]) => ConditionDraft[])
  ) => {
    setConditions(next);
    invalidate();
  };

  function payload() {
    return {
      name: name.trim(),
      sport,
      bet_type: betType,
      weight,
      min_matches_played: minMatches,
      label_template: template.trim(),
      conditions: {
        all: conditions.map((c) => ({
          field: c.field,
          op: c.op,
          value: Number(c.value),
        })),
      },
    };
  }

  function patchCondition(index: number, patch: Partial<ConditionDraft>) {
    changeConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  }

  async function runPreview() {
    setPreviewing(true);
    setError(null);
    setFieldErrors({});
    try {
      const body = payload();
      const res = await fetch("/api/admin/rules/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: body.sport,
          min_matches_played: body.min_matches_played,
          label_template: body.label_template,
          conditions: body.conditions,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFieldErrors(json.fields ?? {});
        setError(json.error ?? "Kunde inte förhandsgranska");
        return;
      }
      setPreview(json as PreviewResult);
    } catch {
      setError("Kunde inte förhandsgranska");
    } finally {
      setPreviewing(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch(
        rule ? `/api/admin/rules/${rule.id}` : "/api/admin/rules",
        {
          method: rule ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setFieldErrors(json.fields ?? {});
        setError(json.error ?? "Kunde inte spara");
        return;
      }
      onSaved(json.rule as SignalRule);
    } catch {
      setError("Kunde inte spara");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" />
        Tillbaka till listan
      </button>

      <div className="rounded-[var(--radius-panel)] border border-line bg-panel p-5">
        <h2 className="font-display mb-4 text-[20px] font-semibold">
          {rule ? rule.name : "Ny regel"}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="rule-name">
              Namn
            </label>
            <input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Målrik matchbild"
              className={inputClass}
            />
            {fieldErrors.name ? (
              <p className="mt-1 text-[12px] text-loss">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="rule-sport">
              Sport
            </label>
            <select
              id="rule-sport"
              value={sport}
              onChange={(e) => changeSport(e.target.value)}
              className={inputClass}
            >
              {SIGNAL_SPORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="rule-bettype">
              Spelform
            </label>
            <select
              id="rule-bettype"
              value={betType}
              onChange={(e) => setBetType(e.target.value)}
              className={inputClass}
            >
              {SIGNAL_BET_TYPES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11.5px] leading-snug text-faint">
              Regeln appliceras bara på användare som har historik i den här
              spelformen.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="rule-weight">
              Vikt: <span className="font-mono-num text-text">{weight}</span>
            </label>
            <input
              id="rule-weight"
              type="range"
              min={1}
              max={50}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full accent-[var(--win)]"
            />
            <p className="mt-1 text-[11.5px] leading-snug text-faint">
              Poäng som läggs till matchpoängen vid träff. Taket är 100.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="rule-minmatches">
              Minsta antal spelade matcher
            </label>
            <input
              id="rule-minmatches"
              type="number"
              min={0}
              max={60}
              value={minMatches}
              onChange={(e) => changeMinMatches(Number(e.target.value) || 0)}
              className={cn(inputClass, "font-mono-num")}
            />
            <p className="mt-1 text-[11.5px] leading-snug text-faint">
              Båda lagen. Under den här gränsen träffar regeln aldrig.
            </p>
          </div>
        </div>
      </div>

      <ConditionsCard
        conditions={conditions}
        groups={groups}
        errors={fieldErrors}
        onAdd={() =>
          changeConditions((prev) =>
            prev.length >= MAX_CONDITIONS_PER_RULE
              ? prev
              : [...prev, emptyCondition()]
          )
        }
        onRemove={(index) =>
          changeConditions((prev) =>
            prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
          )
        }
        onPatch={patchCondition}
      />

      <TemplateCard
        template={template}
        onChange={changeTemplate}
        error={fieldErrors.label_template}
        conditions={conditions}
      />

      {error ? (
        <div className="rounded-[var(--radius-panel)] border border-loss/35 bg-loss/10 px-4 py-3 text-sm text-loss">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <Button onClick={save} disabled={saving}>
          {saving ? "Sparar…" : rule ? "Spara ändringar" : "Skapa regel"}
        </Button>
        <button
          type="button"
          onClick={runPreview}
          disabled={previewing}
          className="rounded-[var(--radius-btn)] border border-cyan/40 px-4 py-2.5 text-[14px] font-semibold text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
        >
          {previewing ? "Testar…" : "Testa mot dagens matcher"}
        </button>
      </div>

      {!rule ? (
        <p className="px-1 text-[12px] text-faint">
          Nya regler sparas inaktiva. Förhandsgranska först, aktivera sedan i
          listan.
        </p>
      ) : null}

      {preview ? <PreviewPanel preview={preview} /> : null}
    </div>
  );
}

function ConditionsCard({
  conditions,
  groups,
  errors,
  onAdd,
  onRemove,
  onPatch,
}: {
  conditions: ConditionDraft[];
  groups: [SignalFieldGroup, typeof SIGNAL_FIELDS][];
  errors: Record<string, string>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onPatch: (index: number, patch: Partial<ConditionDraft>) => void;
}) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-line bg-panel p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-[17px] font-semibold">Villkor</h3>
        <span className="font-mono-num text-[12px] text-faint">
          {conditions.length}/{MAX_CONDITIONS_PER_RULE}
        </span>
      </div>
      <p className="mb-4 text-[12.5px] text-muted">
        Alla villkor måste uppfyllas för att regeln ska träffa. Saknas ett fält
        för en match räknas villkoret som missat.
      </p>

      <div className="space-y-2">
        {conditions.map((condition, index) => {
          const meta = signalField(condition.field);
          const conditionError =
            errors[`conditions.all.${index}.field`] ??
            errors[`conditions.all.${index}.value`];
          return (
            <div key={index} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Fält för villkor ${index + 1}`}
                  value={condition.field}
                  onChange={(e) => onPatch(index, { field: e.target.value })}
                  className={cn(inputClass, "min-w-[240px] flex-1")}
                >
                  {groups.map(([group, fields]) => (
                    <optgroup key={group} label={SIGNAL_FIELD_GROUPS[group]}>
                      {fields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <select
                  aria-label={`Operator för villkor ${index + 1}`}
                  value={condition.op}
                  onChange={(e) => onPatch(index, { op: e.target.value })}
                  className={cn(inputClass, "w-[72px] font-mono-num")}
                >
                  {SIGNAL_OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>

                <input
                  aria-label={`Värde för villkor ${index + 1}`}
                  type="number"
                  step="0.1"
                  value={condition.value}
                  onChange={(e) => onPatch(index, { value: e.target.value })}
                  className={cn(inputClass, "w-[110px] font-mono-num")}
                />

                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={conditions.length === 1}
                  aria-label={`Ta bort villkor ${index + 1}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-btn-sm)] border border-line text-faint hover:border-loss/40 hover:text-loss disabled:opacity-30"
                >
                  <X className="size-4" />
                </button>
              </div>
              {meta ? (
                <p className="text-[11.5px] text-faint">
                  {meta.format === "percent"
                    ? "Procent 0–100"
                    : meta.format === "average"
                      ? "Snittvärde"
                      : "Antal"}{" "}
                  · rimligt spann {meta.min}–{meta.max}
                </p>
              ) : null}
              {conditionError ? (
                <p className="text-[12px] text-loss">{conditionError}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={conditions.length >= MAX_CONDITIONS_PER_RULE}
        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-cyan hover:text-cyan-hover disabled:opacity-40"
      >
        <Plus className="size-4" />
        Lägg till villkor
      </button>
    </div>
  );
}

function TemplateCard({
  template,
  onChange,
  error,
  conditions,
}: {
  template: string;
  onChange: (value: string) => void;
  error?: string;
  conditions: ConditionDraft[];
}) {
  // Fälten som redan används i villkoren först — det är nästan alltid dem
  // man vill visa i texten.
  const suggested = [...new Set(conditions.map((c) => c.field))];

  return (
    <div className="rounded-[var(--radius-panel)] border border-line bg-panel p-5">
      <h3 className="font-display mb-1 text-[17px] font-semibold">
        Text på kortet
      </h3>
      <p className="mb-3 text-[12.5px] leading-snug text-muted">
        Skriv <code className="font-mono-num text-cyan">{"{fält.nyckel}"}</code>{" "}
        för att få in ett värde. Beskriv matchbilden — texten får inte uppmana
        till spel eller förutsäga utfallet.
      </p>

      <input
        value={template}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Målrik matchbild – {combined.avg_total_goals} mål/match i snitt"
        className={inputClass}
      />
      {error ? <p className="mt-1 text-[12px] text-loss">{error}</p> : null}

      {suggested.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11.5px] text-faint">Infoga:</span>
          {suggested.map((field) => (
            <button
              key={field}
              type="button"
              onClick={() => onChange(`${template}{${field}}`)}
              className="rounded-[var(--radius-badge)] bg-panel-2 px-2 py-1 font-mono-num text-[11px] text-muted hover:text-cyan"
            >
              {field}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-[11.5px] leading-snug text-faint">
        Villkoret och texten bör peka på samma fält. Gör de inte det motiverar
        badgen träffen med en siffra som inte klarade kravet.
      </p>
    </div>
  );
}

function PreviewPanel({ preview }: { preview: PreviewResult }) {
  if (preview.empty) {
    return (
      <div className="rounded-[var(--radius-panel)] border border-line bg-panel px-5 py-6 text-center text-muted">
        Inga signaler beräknade för idag ännu. Cron-jobbet kör 05:00, och
        signaler räknas bara för ligor där någon har etablerad historik.
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-panel)] border border-line bg-panel p-5">
      <h3 className="font-display mb-3 text-[17px] font-semibold">
        Regeln träffar{" "}
        <span className="font-mono-num text-win">{preview.hits}</span> av{" "}
        <span className="font-mono-num">{preview.total}</span> matcher idag
      </h3>

      <div className="space-y-2">
        {preview.matches.map((match) => (
          <div
            key={match.fixture_id}
            className={cn(
              "rounded-[var(--radius-btn-sm)] border px-3.5 py-3",
              match.hit
                ? "border-win/40 bg-win/[0.06]"
                : "border-line bg-bg-soft"
            )}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">{match.match}</span>
              <span className="text-[12px] text-faint">
                {match.league} · {match.home_matches_played}/
                {match.away_matches_played} spelade
              </span>
            </div>

            {match.label ? (
              <p className="mt-1.5 rounded-[var(--radius-badge)] border border-[var(--yellow-border)] bg-yellow/10 px-2 py-1 text-[12px] text-yellow">
                {match.label}
              </p>
            ) : null}

            {match.skipped === "min_matches" ? (
              <p className="mt-1.5 text-[12px] text-loss">
                För få spelade matcher — villkoren prövades aldrig.
              </p>
            ) : null}

            <div className="mt-2 space-y-1">
              {match.conditions.map((condition, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]"
                >
                  <span
                    className={cn(
                      "font-mono-num",
                      condition.hit ? "text-win" : "text-loss"
                    )}
                  >
                    {condition.hit ? "✓" : "✗"}
                  </span>
                  <span className="text-muted">
                    {signalField(condition.field)?.label ?? condition.field}
                  </span>
                  <span className="font-mono-num text-faint">
                    {condition.op} {condition.value}
                  </span>
                  <span
                    className={cn(
                      "font-mono-num font-semibold",
                      condition.hit ? "text-win" : "text-loss"
                    )}
                  >
                    {condition.actual === null
                      ? "saknas"
                      : formatFieldValue(condition.field, condition.actual)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {preview.truncated ? (
        <p className="mt-3 text-[12px] text-faint">
          Visar de {preview.matches.length} närmaste träffarna av{" "}
          {preview.total}.
        </p>
      ) : null}
    </div>
  );
}
