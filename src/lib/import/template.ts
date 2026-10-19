import { createT, type TFunction } from "@/lib/texts";

/**
 * Mallfilen genereras i webbläsaren — ingen statisk fil i repot som kan
 * hamna ur synk med synonymlistan i detect-columns.ts.
 */
function templateHeaders(t: TFunction): string[] {
  return [
    t("import.template.header.date"),
    t("import.template.header.sport"),
    t("import.template.header.league"),
    t("import.template.header.match"),
    t("import.template.header.pick"),
    t("import.template.header.odds"),
    t("import.template.header.stake"),
    t("import.template.header.bookmaker"),
    t("import.template.header.result"),
    t("import.template.header.payout"),
  ];
}

/** Exempelraderna är data som normalize.ts ska kunna tolka — inte texter. */
const TEMPLATE_EXAMPLE_ROWS: string[][] = [
  [
    "2026-01-15",
    "Fotboll",
    "Premier League",
    "Liverpool – Arsenal",
    "1",
    "1.95",
    "200",
    "Bet365",
    "Vunnet",
    "390",
  ],
  [
    "2026-01-16",
    "Ishockey",
    "SHL",
    "Frölunda – Skellefteå",
    "Över 5.5",
    "2.10",
    "150",
    "Unibet",
    "Förlorat",
    "0",
  ],
];

export async function downloadImportTemplate(t: TFunction = createT({})) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([
    templateHeaders(t),
    ...TEMPLATE_EXAMPLE_ROWS,
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, t("import.template.sheetName"));
  XLSX.writeFile(book, t("import.template.filename"));
}
