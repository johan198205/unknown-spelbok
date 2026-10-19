import { defineTextArea } from "../define";

export default defineTextArea({
  id: "popups",
  label: "Popups och annonsplatser",
  description: "Texter runt popups, banners och annonsplatser.",
  paths: ["/"],
  texts: {
    "popups.dialog.fallbackLabel": "Erbjudande",
    "popups.dialog.close": "Stäng",
    "popups.adSlot.empty": "ANNONSPLATS {format}",
  },
  hints: {
    "popups.dialog.fallbackLabel":
      "Skärmläsarnamn på popupen när den saknar rubrik.",
    "popups.dialog.close": "Skärmläsartext på krysset i popupen.",
    "popups.adSlot.empty":
      "Platshållaren när ingen banner är aktiv. {format} är måtten, t.ex. 970×90.",
  },
});
