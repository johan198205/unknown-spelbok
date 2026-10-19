/**
 * Ett textområde är en grupp redigerbara texter, oftast en sida eller en
 * återkommande del av gränssnittet (header, formulär, notiser). Texterna i
 * koden är standardvärden; admin → Texter sparar överskrivningar i
 * app_settings ('texts') och de vinner över standardvärdet.
 *
 * Nycklar skrivs `<områdes-id>.<del>.<namn>`, t.ex. `hem.kpi.netto`.
 * Variabler i texten skrivs `{namn}` och fylls i av t(key, { namn }).
 */
export type TextArea<T extends Record<string, string>> = {
  id: string;
  /** Namnet i admin → Texter. */
  label: string;
  /** Kort förklaring i admin: var texterna syns. */
  description?: string;
  /** Sidor där området syns, för länken "Visa sidan" i admin. */
  paths?: string[];
  texts: T;
  /** Förklaring per nyckel i admin, när nyckeln inte säger nog själv. */
  hints?: Partial<Record<keyof T, string>>;
};

export function defineTextArea<const T extends Record<string, string>>(
  area: TextArea<T>
): TextArea<T> {
  return area;
}
