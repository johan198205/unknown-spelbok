/**
 * Typsnitten till bilder som renderas med next/og (Satori).
 *
 * Satori läser bara ttf/otf/woff — aldrig woff2, vilket är precis det
 * next/font laddar ner till .next. Typsnitten hämtas därför från Google
 * med en gammal user agent, som är det enda sättet att få css2 att svara
 * med truetype-URL:er i stället för woff2.
 *
 * Hela steget är frivilligt: failar hämtningen ritar Satori med sitt
 * inbyggda typsnitt i stället för att bilden uteblir.
 */

export const OG_DISPLAY = "Oswald";
export const OG_MONO = "IBM Plex Mono";
export const OG_SANS = "Barlow";

const LEGACY_UA = "Mozilla/5.0 (Windows NT 6.1; WOW64)";

const FAMILIES = [
  { name: OG_SANS, weights: [400, 700] },
  { name: OG_DISPLAY, weights: [600] },
  { name: OG_MONO, weights: [600] },
];

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 700;
  style: "normal";
};

let cache: Promise<OgFont[] | undefined> | null = null;

export function loadOgFonts() {
  // Modulnivå-cache: samma promise återanvänds för varje rendering i
  // processen, och fetch-cachen bär den över omstarter.
  cache ??= (async () => {
    try {
      const query = FAMILIES.map(
        (f) => `family=${f.name.replace(/ /g, "+")}:wght@${f.weights.join(";")}`
      ).join("&");

      const css = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
        headers: { "User-Agent": LEGACY_UA },
        cache: "force-cache",
      }).then((r) => r.text());

      const faces = [
        ...css.matchAll(
          /font-family:\s*'([^']+)';[\s\S]*?font-weight:\s*(\d+);[\s\S]*?src:\s*url\(([^)]+\.ttf)\)/g
        ),
      ];

      if (!faces.length) return undefined;

      return await Promise.all(
        faces.map(async ([, name, weight, url]) => ({
          name,
          data: await fetch(url, { cache: "force-cache" }).then((r) =>
            r.arrayBuffer()
          ),
          weight: Number(weight) as OgFont["weight"],
          style: "normal" as const,
        }))
      );
    } catch (error) {
      console.error("og: typsnitt kunde inte hämtas", error);
      return undefined;
    }
  })();

  return cache;
}
