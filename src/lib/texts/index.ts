import { TEXT_DEFAULTS, type TextKey } from "./registry";

export type { TextKey } from "./registry";

/** Värden till `{namn}` i en text. */
export type TextVars = Record<string, string | number | null | undefined>;

export type TFunction = (key: TextKey, vars?: TextVars) => string;

/** Överskrivningar från admin, nyckel → text. */
export type TextOverrides = Record<string, string>;

/** app_settings-nyckeln som håller överskrivningarna. */
export const TEXTS_SETTINGS_KEY = "texts";

/** Cache-taggen admin invaliderar när en text sparas. */
export const TEXTS_CACHE_TAG = "site-texts";

export function formatText(template: string, vars?: TextVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/** Rensar bort allt som inte är en känd nyckel med strängvärde. */
export function parseTextOverrides(value: unknown): TextOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: TextOverrides = {};
  for (const [key, text] of Object.entries(value as Record<string, unknown>)) {
    if (typeof text === "string" && key in TEXT_DEFAULTS) out[key] = text;
  }
  return out;
}

export function createT(overrides: TextOverrides): TFunction {
  return (key, vars) => {
    const template = overrides[key] ?? TEXT_DEFAULTS[key] ?? key;
    return formatText(template, vars);
  };
}
