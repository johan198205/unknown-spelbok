/**
 * Regelevaluatorn — ren funktion, inga sidoeffekter, inga anrop.
 *
 * Samma kod avgör vad cron-jobbet skriver och vad admin ser i
 * förhandsgranskningen. Skulle de två skilja sig åt vore förhandsgranskningen
 * värdelös, så evaluatorn får aldrig läsa något utanför sina argument.
 *
 * HÅLL I SYNK med supabase/functions/_shared/signal-evaluate.ts.
 */

import {
  signalField,
  type SignalOperator,
} from "@/lib/signals/fields";

/**
 * Beräknade värden för en fixture. Platt med punktnycklar
 * ("home.over_2_5_pct") — samma nycklar som fältbiblioteket, så uppslag
 * aldrig behöver gissa struktur.
 */
export type SignalMetrics = Record<string, number>;

export type SignalCondition = {
  field: string;
  op: SignalOperator;
  value: number;
};

export type SignalConditions = { all: SignalCondition[] };

export type EvaluableRule = {
  conditions: SignalConditions;
  label_template: string;
  min_matches_played: number;
};

export type ConditionResult = SignalCondition & {
  /** null = fältet saknas i metrics (t.ex. inga H2H-möten). */
  actual: number | null;
  hit: boolean;
};

export type RuleEvaluation = {
  hit: boolean;
  label?: string;
  conditions: ConditionResult[];
  /** Satt när regeln föll innan villkoren ens prövades. */
  skipped?: "min_matches" | "no_conditions";
};

function compare(actual: number, op: SignalOperator, value: number): boolean {
  switch (op) {
    case ">=":
      return actual >= value;
    case "<=":
      return actual <= value;
    case ">":
      return actual > value;
    case "<":
      return actual < value;
    case "==":
      // Flyttal: 3.0 och 2.9999999 ska räknas som lika. Marginalen är
      // mindre än minsta meningsfulla skillnad i något av fälten.
      return Math.abs(actual - value) < 1e-9;
  }
}

/** Avrundning enligt fältets format — procent utan decimal, snitt med en. */
export function formatFieldValue(field: string, value: number): string {
  const meta = signalField(field);
  if (!meta) return String(value);
  switch (meta.format) {
    case "percent":
      return String(Math.round(value));
    case "count":
      return String(Math.round(value));
    case "average":
      return value.toFixed(1);
  }
}

/**
 * Ersätter {fält.nyckel} i mallen med det faktiska värdet.
 * Platshållare för fält som saknas lämnas som de är — hellre en synlig
 * `{h2h.avg_goals_last_5}` i admins förhandsgranskning än en tyst lucka.
 */
export function renderLabel(
  template: string,
  metrics: SignalMetrics
): string {
  return template.replace(/\{([a-z0-9_.]+)\}/gi, (match, key: string) => {
    const value = metrics[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return match;
    return formatFieldValue(key, value);
  });
}

/**
 * Evaluerar en regel mot en fixtures metrics.
 *
 * `conditions` returneras alltid, även när regeln föll på antal spelade
 * matcher — förhandsgranskningen ska kunna visa varför.
 */
export function evaluateRule(
  rule: EvaluableRule,
  metrics: SignalMetrics,
  homeMatchesPlayed: number,
  awayMatchesPlayed: number
): RuleEvaluation {
  const conditions = (rule.conditions?.all ?? []).map((condition) => {
    const raw = metrics[condition.field];
    const actual =
      typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    return {
      ...condition,
      actual,
      // Saknat fält = villkoret faller. Inget fel kastas: att ett lag
      // aldrig mött motståndaren är ett normalt tillstånd, inte ett haveri.
      hit: actual !== null && compare(actual, condition.op, condition.value),
    };
  });

  if (
    homeMatchesPlayed < rule.min_matches_played ||
    awayMatchesPlayed < rule.min_matches_played
  ) {
    return { hit: false, conditions, skipped: "min_matches" };
  }

  // En regel utan villkor skulle träffa allt. Det är nästan säkert ett
  // misstag i admin-formuläret, så den träffar ingenting i stället.
  if (!conditions.length) {
    return { hit: false, conditions, skipped: "no_conditions" };
  }

  const hit = conditions.every((c) => c.hit);
  return {
    hit,
    conditions,
    ...(hit ? { label: renderLabel(rule.label_template, metrics) } : {}),
  };
}
