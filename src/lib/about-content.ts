import { createClient } from "@/lib/supabase/server";

export type AboutPrinciple = {
  n: string;
  title: string;
  body: string;
};

export type AboutCta = {
  title: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

export type AboutContent = {
  eyebrow: string;
  headline: string;
  intro: string;
  principlesTitle: string;
  principlesIntro: string;
  principles: AboutPrinciple[];
  cta: AboutCta;
};

export type AboutPage = AboutContent & {
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

const ABOUT_TYPE = "about" as const;

export const DEFAULT_ABOUT: AboutContent = {
  eyebrow: "Om Spelbok",
  headline: "Vi byggde verktyget vi själva saknade.",
  intro:
    "Spelbok startade 2025 som ett kalkylark mellan tre vänner som tröttnat på att gissa om de låg plus eller minus. Idag är det en plattform för alla som vill bokföra sina spel, se sin riktiga ROI och jämföra sig med andra på lika villkor.",
  principlesTitle: "Det vi tror på",
  principlesIntro:
    "Fyra principer som styr varje beslut om produkten. De står här så att du kan hålla oss ansvariga.",
  principles: [
    {
      n: "01",
      title: "Siffrorna ljuger inte, det gör minnet",
      body: "Netto, ROI och hitrate räknas ut ur varje enskilt spel. Ingen kan runda upp, glömma en förlust eller välja period.",
    },
    {
      n: "02",
      title: "Vi förmedlar inga spel",
      body: "Spelbok tar inga insatser och betalar inga vinster. Du spelar hos ditt licensierade spelbolag och bokför resultatet här.",
    },
    {
      n: "03",
      title: "Öppet om hur vi tjänar pengar",
      body: "Tjänsten är gratis och finansieras av annonsplatser och reklamlänkar till spelbolag. Varje sådan länk är märkt. Betyg och rankning påverkas inte av ersättning.",
    },
    {
      n: "04",
      title: "Ansvar före tillväxt",
      body: "18+, Stödlinjen och Spelpaus finns på varje sida. Vi använder aldrig brådska eller bonusretorik för att få någon att spela mer.",
    },
  ],
  cta: {
    title: "Frågor, samarbeten eller press?",
    body: "Vi svarar på vardagar inom 24 timmar.",
    primaryLabel: "Kontakta oss",
    primaryHref: "/kontakt",
    secondaryLabel: "Skapa konto",
    secondaryHref: "/registrera",
  },
};

function str(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function principle(value: unknown, fallback: AboutPrinciple): AboutPrinciple {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    n: str(raw.n, fallback.n),
    title: str(raw.title, fallback.title),
    body: str(raw.body, fallback.body),
  };
}

export function parseAboutContent(raw: unknown): AboutContent {
  const data = (raw ?? {}) as Record<string, unknown>;
  const ctaRaw = (data.cta ?? {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(data.principles) ? data.principles : [];
  const d = DEFAULT_ABOUT;

  const principles =
    itemsRaw.length > 0
      ? itemsRaw.map((item, i) =>
          principle(item, d.principles[i] ?? d.principles[0])
        )
      : d.principles;

  return {
    eyebrow: str(data.eyebrow, d.eyebrow),
    headline: str(data.headline, d.headline),
    intro: str(data.intro, d.intro),
    principlesTitle: str(data.principlesTitle, d.principlesTitle),
    principlesIntro: str(data.principlesIntro, d.principlesIntro),
    principles,
    cta: {
      title: str(ctaRaw.title, d.cta.title),
      body: str(ctaRaw.body, d.cta.body),
      primaryLabel: str(ctaRaw.primaryLabel, d.cta.primaryLabel),
      primaryHref: str(ctaRaw.primaryHref, d.cta.primaryHref),
      secondaryLabel: str(ctaRaw.secondaryLabel, d.cta.secondaryLabel),
      secondaryHref: str(ctaRaw.secondaryHref, d.cta.secondaryHref),
    },
  };
}

export function aboutFromPageContent(content: string): AboutContent {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { _type?: string };
      if (parsed._type === ABOUT_TYPE) return parseAboutContent(parsed);
    } catch {
      // fall through
    }
  }
  return DEFAULT_ABOUT;
}

export function serializeAboutContent(about: AboutContent): string {
  return JSON.stringify({ _type: ABOUT_TYPE, ...about }, null, 2);
}

export async function fetchAboutPage(): Promise<AboutPage> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("title, content, seo_title, seo_description")
    .eq("slug", "om-oss")
    .eq("published", true)
    .maybeSingle();

  if (!data) {
    return {
      ...DEFAULT_ABOUT,
      title: "Om oss",
      seoTitle: "Om Spelbok",
      seoDescription: DEFAULT_ABOUT.intro.slice(0, 160),
    };
  }

  return {
    ...aboutFromPageContent(String(data.content ?? "")),
    title: data.title || "Om oss",
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
  };
}
