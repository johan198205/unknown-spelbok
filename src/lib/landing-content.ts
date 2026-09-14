export type LandingCta = {
  label: string;
  href: string;
};

export type LandingStep = {
  no: string;
  title: string;
  body: string;
  img: string;
  alt: string;
};

export type LandingContent = {
  hero: {
    badge: string;
    body: string;
    primaryCta: LandingCta;
    secondaryCta: LandingCta;
    image: string;
    imageAlt: string;
  };
  howItWorks: {
    title: string;
    body: string;
    steps: [LandingStep, LandingStep, LandingStep];
  };
  leaderboard: {
    title: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
  };
  cta: {
    title: string;
    body: string;
    buttonLabel: string;
    buttonHref: string;
  };
};

export type LandingPage = LandingContent & {
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

const LANDING_TYPE = "landing" as const;

type LandingStored = LandingContent & { _type: typeof LANDING_TYPE };

export const DEFAULT_LANDING: LandingContent = {
  hero: {
    badge: "Live bokföring",
    body: "Bokför varje spel, se din riktiga ROI och sluta gissa. Jämför dig med andra i topplistorna där bara siffrorna talar.",
    primaryCta: { label: "Börja bokföra gratis", href: "/registrera" },
    secondaryCta: { label: "Se ett publikt spreadsheet", href: "/topplista" },
    image: "/mockups/spelbok-devices.png",
    imageAlt:
      "Spelbok på laptop och mobil — dashboard med netto, ROI, hitrate och bokförda spel.",
  },
  howItWorks: {
    title: "Så funkar det",
    body: "Tre steg från utspridda skärmdumpar och minneslappar till en bok som visar exakt var pengarna kommer ifrån.",
    steps: [
      {
        no: "01",
        title: "Skapa ett spreadsheet",
        body: "En bok per strategi. Sätt startbankroll, välj om den ska vara publik och börja logga.",
        img: "/img/sa-funkar-det/skapa-spreadsheet.png",
        alt: "Formuläret för nytt spreadsheet med namn, startbankroll och publik-val.",
      },
      {
        no: "02",
        title: "Bokför varje spel",
        body: "Match, tipp, odds, insats och resultat. Filtrera på liga, spelbolag eller oddsintervall.",
        img: "/img/sa-funkar-det/bokfor-spel.png",
        alt: "Spellistan med datum, liga, match, tipp, odds, resultat och netto per rad.",
      },
      {
        no: "03",
        title: "Läs av sanningen",
        body: "Netto, ROI och hitrate räknas om direkt. Jämför dig i topplistorna.",
        img: "/img/sa-funkar-det/statistik.png",
        alt: "Statistikvyn med netto, ROI, hitrate och grafen över ackumulerat netto.",
      },
    ],
  },
  leaderboard: {
    title: "Topplistan just nu",
    body: "Publika spreadsheets rankade på ROI",
    ctaLabel: "Se hela listan",
    ctaHref: "/topplista",
  },
  cta: {
    title: "Börja bokföra idag",
    body: "Gratis konto, obegränsat antal spreadsheets och full statistik från första spelet.",
    buttonLabel: "Skapa konto",
    buttonHref: "/registrera",
  },
};

export const DEFAULT_LANDING_TITLE = "TA KONTROLL ÖVER\nDITT SPELANDE.";
const DEFAULT_TITLE = DEFAULT_LANDING_TITLE;

function str(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function cta(value: unknown, fallback: LandingCta): LandingCta {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    label: str(raw.label, fallback.label),
    href: str(raw.href, fallback.href),
  };
}

function step(value: unknown, fallback: LandingStep): LandingStep {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    no: str(raw.no, fallback.no),
    title: str(raw.title, fallback.title),
    body: str(raw.body, fallback.body),
    img: str(raw.img, fallback.img),
    alt: str(raw.alt, fallback.alt),
  };
}

/** Första stycket i legacy-markdown (före ## / blockquote). */
export function firstMarkdownParagraph(content: string): string | null {
  const found = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith("#") && !p.startsWith(">"));
  return found ? found.replace(/\s+/g, " ").trim() : null;
}

export function parseLandingContent(raw: unknown): LandingContent {
  const data = (raw ?? {}) as Record<string, unknown>;
  const heroRaw = (data.hero ?? {}) as Record<string, unknown>;
  const howRaw = (data.howItWorks ?? {}) as Record<string, unknown>;
  const stepsRaw = Array.isArray(howRaw.steps) ? howRaw.steps : [];
  const boardRaw = (data.leaderboard ?? {}) as Record<string, unknown>;
  const ctaRaw = (data.cta ?? {}) as Record<string, unknown>;
  const d = DEFAULT_LANDING;

  return {
    hero: {
      badge: str(heroRaw.badge, d.hero.badge),
      body: str(heroRaw.body, d.hero.body),
      primaryCta: cta(heroRaw.primaryCta, d.hero.primaryCta),
      secondaryCta: cta(heroRaw.secondaryCta, d.hero.secondaryCta),
      image: str(heroRaw.image, d.hero.image),
      imageAlt: str(heroRaw.imageAlt, d.hero.imageAlt),
    },
    howItWorks: {
      title: str(howRaw.title, d.howItWorks.title),
      body: str(howRaw.body, d.howItWorks.body),
      steps: [
        step(stepsRaw[0], d.howItWorks.steps[0]),
        step(stepsRaw[1], d.howItWorks.steps[1]),
        step(stepsRaw[2], d.howItWorks.steps[2]),
      ],
    },
    leaderboard: {
      title: str(boardRaw.title, d.leaderboard.title),
      body: str(boardRaw.body, d.leaderboard.body),
      ctaLabel: str(boardRaw.ctaLabel, d.leaderboard.ctaLabel),
      ctaHref: str(boardRaw.ctaHref, d.leaderboard.ctaHref),
    },
    cta: {
      title: str(ctaRaw.title, d.cta.title),
      body: str(ctaRaw.body, d.cta.body),
      buttonLabel: str(ctaRaw.buttonLabel, d.cta.buttonLabel),
      buttonHref: str(ctaRaw.buttonHref, d.cta.buttonHref),
    },
  };
}

export function isLandingContentJson(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(trimmed) as { _type?: string };
    return parsed._type === LANDING_TYPE;
  } catch {
    return false;
  }
}

/**
 * Tolkar `pages.content` för startsidan.
 * Ny modell = JSON med `_type: "landing"`. Äldre markdown → defaults + första stycket.
 */
export function landingFromPageContent(content: string): LandingContent {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { _type?: string };
      if (parsed._type === LANDING_TYPE) {
        return parseLandingContent(parsed);
      }
    } catch {
      // fall through to markdown migration
    }
  }

  const body = firstMarkdownParagraph(content);
  if (!body) return DEFAULT_LANDING;
  return {
    ...DEFAULT_LANDING,
    hero: { ...DEFAULT_LANDING.hero, body },
  };
}

export function serializeLandingContent(landing: LandingContent): string {
  const stored: LandingStored = { _type: LANDING_TYPE, ...landing };
  return JSON.stringify(stored, null, 2);
}

export function formatLandingTitle(title: string): string {
  const trimmed = (title || DEFAULT_TITLE).trim();
  if (trimmed.includes("\n")) return trimmed;
  return trimmed.replace(/\s+ÖVER\s+/i, " ÖVER\n");
}
