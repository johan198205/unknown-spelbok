import { defineTextArea } from "../define";

export default defineTextArea({
  id: "delad",
  label: "Publikt spreadsheet",
  description:
    "Ett delat spreadsheet som andra kan se. Rubriker, tabell, filter och statistik delas med spelboksområdet.",
  paths: ["/topplista"],
  texts: {
    "delad.page.loading": "Laddar…",
  },
  hints: {
    "delad.page.loading": "Visas kort medan det delade spreadsheetet laddas",
  },
});
