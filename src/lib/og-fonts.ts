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

// Varumärkets typsnitt. Rubriker, brödtext och siffror är samma familj;
// namnen finns kvar så att bilderna kan välja vikt per roll.
export const OG_DISPLAY = "Manrope";
export const OG_MONO = "Manrope";
export const OG_SANS = "Manrope";

const LEGACY_UA = "Mozilla/5.0 (Windows NT 6.1; WOW64)";

const FAMILIES = [{ name: OG_SANS, weights: [400, 600, 700] }];

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
