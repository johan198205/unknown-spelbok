/**
 * Sidrubrik + kort intro högst upp på undersidor, och en valfri längre text
 * längst ner (SEO-text). Redigeras i admin → Sidor som en kärnsida per
 * route; innehållet sparas som JSON (_type: intro) i pages.content.
 *
 * Fler sidor läggs till genom att utöka INTRO_PAGES och rendera
 * <PageIntro slug="…" /> på sidan.
 */

export type PageIntroContent = {
  /** Av = varken rubrik eller intro visas på sidan. */
  show: boolean;
  headline: string;
  intro: string;
  /** Markdown under sidans innehåll. Tom = ingen sektion. */
  body: string;
};

type IntroPageDef = {
  /** Sidans namn i admin och footern. */
  title: string;
  path: string;
  defaults: PageIntroContent;
  seo_title: string;
  seo_description: string;
};

export const INTRO_PAGES = {
  topplista: {
    title: "Topplista",
    path: "/topplista",
    defaults: {
      show: true,
      headline: "Topplista",
      intro: "Alla publika spreadsheets, rankade på ROI.",
      body: "",
    },
    seo_title: "Topplista — bästa publika spelböckerna",
    seo_description:
      "Se vilka publika spreadsheets som har bäst ROI, störst netto och bäst form just nu.",
  },
  planket: {
    title: "Planket",
    path: "/planket",
    defaults: {
      show: true,
      headline: "Planket",
      intro:
        "Planket är platsen för dig som gillar sport och betting. Här kan användare dela sina speltips, diskutera matcher och snacka sport med andra medlemmar.",
      body: "",
    },
    seo_title: "Planket — speltips och diskussion",
    seo_description:
      "Dela speltips, diskutera matcher och snacka sport med andra medlemmar på Planket.",
  },
  spelbolag: {
    title: "Spelbolag",
    path: "/spelbolag",
    defaults: {
      show: true,
      headline: "Topplista: Sveriges bästa spelbolag 2026",
      intro: "",
      body: "",
    },
    seo_title: "Sveriges bästa spelbolag 2026",
    seo_description:
      "Jämför licensierade spelbolag i Sverige: bonusar, omsättningskrav och betyg.",
  },
} satisfies Record<string, IntroPageDef>;

export type IntroPageSlug = keyof typeof INTRO_PAGES;

export function isIntroPageSlug(slug: string): slug is IntroPageSlug {
  return Object.prototype.hasOwnProperty.call(INTRO_PAGES, slug);
}

const INTRO_TYPE = "intro" as const;

function str(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export function parsePageIntro(
  raw: unknown,
  fallback: PageIntroContent
): PageIntroContent {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    show: typeof data.show === "boolean" ? data.show : fallback.show,
    headline: str(data.headline, fallback.headline),
    intro: str(data.intro, fallback.intro),
    body: str(data.body, fallback.body),
  };
}

export function introFromPageContent(
  content: string,
  fallback: PageIntroContent
): PageIntroContent {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { _type?: string };
      if (parsed._type === INTRO_TYPE) return parsePageIntro(parsed, fallback);
    } catch {
      // fall through
    }
  }
  return fallback;
}

export function serializePageIntro(intro: PageIntroContent): string {
  return JSON.stringify({ _type: INTRO_TYPE, ...intro }, null, 2);
}
