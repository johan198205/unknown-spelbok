/**
 * Mallfilen genereras i webbläsaren — ingen statisk fil i repot som kan
 * hamna ur synk med synonymlistan i detect-columns.ts.
 */
const TEMPLATE_ROWS: string[][] = [
  [
    "Datum",
    "Sport",
    "Liga",
    "Match",
    "Spel",
    "Odds",
    "Insats",
    "Spelbolag",
    "Resultat",
    "Vinst",
  ],
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

export async function downloadImportTemplate() {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Spel");
  XLSX.writeFile(book, "spelbok-importmall.xlsx");
}
