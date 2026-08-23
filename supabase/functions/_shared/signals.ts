/**
 * SPELBOK — regelevaluatorn för signalmotorn, Deno-sidan.
 *
 * Spegling av src/lib/signals/evaluate.ts. Cron-jobbet kan inte importera
 * från src/ (tsconfig exkluderar supabase/functions, och Next-alias finns
 * inte i Deno), så koden står i två exemplar — samma lösning som
 * apisports.ts redan använder.
 *
 * Bara det körningen behöver dupliceras: nyckel → format, plus evaluatorn.
 * De svenska etiketterna och UI-metadatan stannar i src/lib/signals/fields.ts.
 *
 * HÅLL I SYNK. `npx tsx scripts/check-signal-parity.ts` jämför nycklar och
 * format mellan filerna och failar om de glidit isär.
 */

export type SignalFieldFormat = "percent" | "average" | "count";
export type SignalOperator = ">=" | "<=" | ">" | "<" | "==";

/** Måste innehålla exakt samma nycklar som SIGNAL_FIELDS i src/. */
export const FIELD_FORMATS: Record<string, SignalFieldFormat> = {
  "home.avg_goals_for": "average",
  "home.avg_goals_against": "average",
  "home.avg_goals_for_home": "average",
  "home.over_1_5_pct": "percent",
  "home.over_2_5_pct": "percent",
  "home.over_3_5_pct": "percent",
  "home.btts_pct": "percent",
  "home.clean_sheet_pct": "percent",
  "home.failed_to_score_pct": "percent",
  "home.form_points_last_5": "count",
  "away.avg_goals_for": "average",
  "away.avg_goals_against": "average",
  "away.avg_goals_for_away": "average",
  "away.over_1_5_pct": "percent",
  "away.over_2_5_pct": "percent",
  "away.over_3_5_pct": "percent",
  "away.btts_pct": "percent",
  "away.clean_sheet_pct": "percent",
  "away.failed_to_score_pct": "percent",
  "away.form_points_last_5": "count",
  "combined.avg_goals": "average",
  "combined.avg_total_goals": "average",
  "h2h.avg_goals_last_5": "average",
  "h2h.btts_pct_last_5": "percent",
  "h2h.home_wins_last_5": "count",
  "h2h.matches_count": "count",
};

export type SignalMetrics = Record<string, number>;

export type SignalCondition = {
  field: string;
  op: SignalOperator;
  value: number;
};

export type SignalRuleRow = {
  id: string;
  name: string;
  bet_type: string;
  sport: string;
  conditions: { all?: SignalCondition[] } | null;
  weight: number;
  label_template: string;
  min_matches_played: number;
};

export type RuleEvaluation = {
  hit: boolean;
  label?: string;
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
      return Math.abs(actual - value) < 1e-9;
  }
}

export function formatFieldValue(field: string, value: number): string {
  const format = FIELD_FORMATS[field];
  if (!format) return String(value);
  if (format === "average") return value.toFixed(1);
  return String(Math.round(value));
}

export function renderLabel(template: string, metrics: SignalMetrics): string {
  return template.replace(/\{([a-z0-9_.]+)\}/gi, (match, key: string) => {
    const value = metrics[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return match;
    return formatFieldValue(key, value);
  });
}

export function evaluateRule(
  rule: SignalRuleRow,
  metrics: SignalMetrics,
  homeMatchesPlayed: number,
  awayMatchesPlayed: number
): RuleEvaluation {
  if (
    homeMatchesPlayed < rule.min_matches_played ||
    awayMatchesPlayed < rule.min_matches_played
  ) {
    return { hit: false };
  }

  const conditions = rule.conditions?.all ?? [];
  // Villkorslös regel skulle träffa allt — nästan säkert ett misstag.
  if (!conditions.length) return { hit: false };

  for (const condition of conditions) {
    const raw = metrics[condition.field];
    // Saknat fält = villkoret faller. Inga H2H-möten är normalt.
    if (typeof raw !== "number" || !Number.isFinite(raw)) return { hit: false };
    if (!compare(raw, condition.op, condition.value)) return { hit: false };
  }

  return { hit: true, label: renderLabel(rule.label_template, metrics) };
}
