import { z } from "zod";
import {
  MAX_CONDITIONS_PER_RULE,
  SIGNAL_OPERATORS,
  isSignalBetType,
  isSignalField,
  isSignalSport,
} from "@/lib/signals/fields";

/**
 * Validering av adminregler.
 *
 * Reglerna är data som körs mot alla användares förslag, så gränsen mellan
 * "vad admin får skriva" och "vad evaluatorn kan hantera" måste vara exakt.
 * Ett fältnamn som inte finns i fältbiblioteket får aldrig sparas — annars
 * blir det ett villkor som tyst evaluerar till falskt för alltid.
 */

/** Ord som gör en label till ett speltips i stället för en beskrivning. */
const FORBIDDEN_LABEL_WORDS = [
  /\bspela(r|t|de|s)?\b/i,
  /\bsatsa(r|t|de|s)?\b/i,
  /\btips\w*\b/i,
  /\bvinnare\b/i,
  /\bbör\b/i,
  /\brekommendera(r|t|s|de)?\b/i,
  /\bsäkert?\b/i,
];

const conditionSchema = z.object({
  field: z
    .string()
    .refine(isSignalField, { message: "Okänt fält" }),
  op: z.enum(SIGNAL_OPERATORS),
  value: z
    .number()
    .finite()
    .refine((v) => Math.abs(v) < 1e6, { message: "Orimligt värde" }),
});

const conditionsSchema = z.object({
  all: z
    .array(conditionSchema)
    .min(1, "Minst ett villkor krävs")
    .max(MAX_CONDITIONS_PER_RULE, `Max ${MAX_CONDITIONS_PER_RULE} villkor`),
});

/**
 * Label-mallen skrivs fritt av admin, så ordfiltret ligger här och inte
 * bara som hjälptext i formuläret. Copyn ska beskriva matchbilden, aldrig
 * uppmana till spel — samma gräns som resten av förslagsfunktionen.
 */
const labelTemplateSchema = z
  .string()
  .trim()
  .min(3, "Label-mall krävs")
  .max(200, "Max 200 tecken")
  .refine(
    (value) => !FORBIDDEN_LABEL_WORDS.some((pattern) => pattern.test(value)),
    {
      message:
        "Label-mallen får inte uppmana till spel. Beskriv matchbilden i stället.",
    }
  )
  .refine(
    (value) => {
      // Varje {platshållare} måste finnas i fältbiblioteket, annars renderas
      // den som rå text på kortet.
      const placeholders = value.match(/\{([a-z0-9_.]+)\}/gi) ?? [];
      return placeholders.every((p) => isSignalField(p.slice(1, -1)));
    },
    { message: "Label-mallen refererar ett fält som inte finns" }
  );

const ruleBodySchema = z.object({
  name: z.string().trim().min(2, "Namn krävs").max(80, "Max 80 tecken"),
  bet_type: z.string().refine(isSignalBetType, { message: "Okänd spelform" }),
  sport: z.string().refine(isSignalSport, { message: "Okänd sport" }),
  weight: z.number().int().min(1, "Minst 1").max(50, "Max 50"),
  min_matches_played: z.number().int().min(0).max(60),
  label_template: labelTemplateSchema,
  conditions: conditionsSchema,
});

/** Nya regler skapas alltid inaktiva — active går inte att sätta här. */
export const createRuleSchema = ruleBodySchema;

/** Uppdatering: allt utom active är valfritt, active får bytas. */
export const updateRuleSchema = ruleBodySchema.partial().extend({
  active: z.boolean().optional(),
});

/** Förhandsgranskning tillåter osparade regler. */
export const previewRuleSchema = z.object({
  sport: z.string().refine(isSignalSport, { message: "Okänd sport" }),
  min_matches_played: z.number().int().min(0).max(60),
  label_template: labelTemplateSchema,
  conditions: conditionsSchema,
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
export type PreviewRuleInput = z.infer<typeof previewRuleSchema>;

/** Fältspecifika fel i det format admin-formuläret kan rendera. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}
