import { defineTextArea } from "../define";

export default defineTextArea({
  id: "cms",
  label: "Innehållssidor",
  description: "Ramtexter runt sidor skapade under Sidor.",
  paths: [],
  texts: {
    "cms.notFound.metaTitle": "Sidan hittades inte",
  },
  hints: {
    "cms.notFound.metaTitle":
      "Fliktiteln när en innehållssida inte finns eller inte är publicerad",
  },
});
