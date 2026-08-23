/**
 * Vaktar dupliceringen mellan fältbiblioteket i src/ och Deno-kopian.
 *
 * Evaluatorn finns i två exemplar av nödvändighet (tsconfig exkluderar
 * supabase/functions). Glider de isär blir admins förhandsgranskning en
 * lögn: den skulle visa träffar som cron-jobbet aldrig gör, eller tvärtom.
 * Den här kontrollen gör den risken synlig i stället för tyst.
 *
 * Kör: npx tsx scripts/check-signal-parity.ts
 */

import { SIGNAL_FIELDS } from "../src/lib/signals/fields";
import { FIELD_FORMATS } from "../supabase/functions/_shared/signals";
import {
  evaluateRule as evaluateNext,
  type SignalMetrics,
} from "../src/lib/signals/evaluate";
import { evaluateRule as evaluateDeno } from "../supabase/functions/_shared/signals";

const problems: string[] = [];

// 1. Samma nycklar på båda sidor
const srcKeys = new Set(SIGNAL_FIELDS.map((f) => f.key));
const denoKeys = new Set(Object.keys(FIELD_FORMATS));

for (const key of srcKeys) {
  if (!denoKeys.has(key)) problems.push(`saknas i Deno-kopian: ${key}`);
}
for (const key of denoKeys) {
  if (!srcKeys.has(key)) problems.push(`finns bara i Deno-kopian: ${key}`);
}

// 2. Samma format per nyckel — styr avrundningen i renderade labels
for (const field of SIGNAL_FIELDS) {
  const denoFormat = FIELD_FORMATS[field.key];
  if (denoFormat && denoFormat !== field.format) {
    problems.push(
      `format skiljer för ${field.key}: src=${field.format}, deno=${denoFormat}`
    );
  }
}

// 3. Samma utfall på samma indata — den kontroll som faktiskt betyder något
const metrics: SignalMetrics = {
  "home.over_2_5_pct": 62,
  "away.over_2_5_pct": 71,
  "combined.avg_goals": 3.24,
  "h2h.avg_goals_last_5": 2.8,
  "home.clean_sheet_pct": 20,
};

const cases = [
  {
    name: "alla villkor träffar",
    rule: {
      conditions: {
        all: [
          { field: "home.over_2_5_pct", op: ">=" as const, value: 60 },
          { field: "away.over_2_5_pct", op: ">=" as const, value: 60 },
          { field: "combined.avg_goals", op: ">=" as const, value: 3.0 },
        ],
      },
      label_template: "Målrikt – {combined.avg_goals} mål/match, {home.over_2_5_pct} %",
      min_matches_played: 8,
    },
    home: 12,
    away: 14,
  },
  {
    name: "ett villkor missar",
    rule: {
      conditions: {
        all: [{ field: "home.over_2_5_pct", op: ">=" as const, value: 90 }],
      },
      label_template: "x",
      min_matches_played: 8,
    },
    home: 12,
    away: 14,
  },
  {
    name: "för få spelade matcher",
    rule: {
      conditions: {
        all: [{ field: "home.over_2_5_pct", op: ">=" as const, value: 10 }],
      },
      label_template: "x",
      min_matches_played: 8,
    },
    home: 3,
    away: 14,
  },
  {
    name: "fält saknas i metrics",
    rule: {
      conditions: {
        all: [{ field: "h2h.btts_pct_last_5", op: ">=" as const, value: 50 }],
      },
      label_template: "x",
      min_matches_played: 8,
    },
    home: 12,
    away: 14,
  },
  {
    name: "gränsvärde med flyttal (==)",
    rule: {
      conditions: {
        all: [{ field: "h2h.avg_goals_last_5", op: "==" as const, value: 2.8 }],
      },
      label_template: "{h2h.avg_goals_last_5}",
      min_matches_played: 8,
    },
    home: 12,
    away: 14,
  },
  {
    name: "villkorslös regel träffar inget",
    rule: {
      conditions: { all: [] },
      label_template: "x",
      min_matches_played: 8,
    },
    home: 12,
    away: 14,
  },
];

for (const testCase of cases) {
  const next = evaluateNext(testCase.rule, metrics, testCase.home, testCase.away);
  const deno = evaluateDeno(
    { ...testCase.rule, id: "r", name: "r", bet_type: "over_2_5", sport: "football", weight: 25 },
    metrics,
    testCase.home,
    testCase.away
  );
  if (next.hit !== deno.hit) {
    problems.push(
      `"${testCase.name}": hit skiljer — src=${next.hit}, deno=${deno.hit}`
    );
  }
  if (next.label !== deno.label) {
    problems.push(
      `"${testCase.name}": label skiljer — src=${JSON.stringify(next.label)}, deno=${JSON.stringify(deno.label)}`
    );
  }
}

if (problems.length) {
  console.error("Signalparitet BRUTEN:\n" + problems.map((p) => `  · ${p}`).join("\n"));
  process.exit(1);
}

console.log(
  `✓ Signalparitet OK — ${srcKeys.size} fält, ${cases.length} evalueringsfall identiska i båda kopiorna`
);
