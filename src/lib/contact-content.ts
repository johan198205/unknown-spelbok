import { createClient } from "@/lib/supabase/server";

export type ContactChannel = {
  badge: string;
  title: string;
  /** mailto: eller https — tom = visa adressrader i stället */
  href: string;
  label: string;
  /** En rad per rad, används när href/label saknas */
  lines: string;
};

export type ContactContent = {
  eyebrow: string;
  headline: string;
  intro: string;
  channels: ContactChannel[];
  noticeBadge: string;
  noticeBody: string;
};

export type ContactPage = ContactContent & {
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

const CONTACT_TYPE = "contact" as const;

export const DEFAULT_CONTACT: ContactContent = {
  eyebrow: "Kontakt",
  headline: "Hör av dig.",
  intro:
    "Vi är tre personer och läser allt själva. Vardagar svarar vi inom 24 timmar, helger lite långsammare — då har vi oftast egna spel att rätta.",
  channels: [
    {
      badge: "@",
      title: "Allmänna frågor och support",
      href: "mailto:hej@spelbok.se",
      label: "hej@spelbok.se",
      lines: "",
    },
    {
      badge: "AD",
      title: "Annonsering och samarbeten",
      href: "mailto:partner@spelbok.se",
      label: "partner@spelbok.se",
      lines: "",
    },
    {
      badge: "PR",
      title: "Press",
      href: "mailto:press@spelbok.se",
      label: "press@spelbok.se",
      lines: "",
    },
    {
      badge: "AB",
      title: "Spelbok Sverige AB",
      href: "",
      label: "",
      lines: "Org.nr 559xxx-xxxx\nSveavägen 00, 111 00 Stockholm",
    },
  ],
  noticeBadge: "18+",
  noticeBody:
    "Behöver du prata med någon om ditt spelande? Vi är inte rätt mottagare, men [Stödlinjen](https://www.stodlinjen.se) är det — **020-81 91 00**, gratis och anonymt. Du kan också stänga av dig via [Spelpaus](https://www.spelpaus.se).",
};

function str(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function channel(value: unknown, fallback: ContactChannel): ContactChannel {
  const raw = (value ?? {}) as Record<string, unknown>;
  const linesValue = raw.lines;
  const lines = Array.isArray(linesValue)
    ? linesValue.map(String).join("\n")
    : str(linesValue, fallback.lines);
  return {
    badge: str(raw.badge, fallback.badge),
    title: str(raw.title, fallback.title),
    href: str(raw.href, fallback.href),
    label: str(raw.label, fallback.label),
    lines,
  };
}

export function parseContactContent(raw: unknown): ContactContent {
  const data = (raw ?? {}) as Record<string, unknown>;
  const channelsRaw = Array.isArray(data.channels) ? data.channels : [];
  const d = DEFAULT_CONTACT;

  const channels =
    channelsRaw.length > 0
      ? channelsRaw.map((item, i) =>
          channel(item, d.channels[i] ?? d.channels[0])
        )
      : d.channels;

  return {
    eyebrow: str(data.eyebrow, d.eyebrow),
    headline: str(data.headline, d.headline),
    intro: str(data.intro, d.intro),
    channels,
    noticeBadge: str(data.noticeBadge, d.noticeBadge),
    noticeBody: str(data.noticeBody, d.noticeBody),
  };
}

export function contactFromPageContent(content: string): ContactContent {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { _type?: string };
      if (parsed._type === CONTACT_TYPE) return parseContactContent(parsed);
    } catch {
      // fall through
    }
  }
  return DEFAULT_CONTACT;
}

export function serializeContactContent(contact: ContactContent): string {
  return JSON.stringify({ _type: CONTACT_TYPE, ...contact }, null, 2);
}

export async function fetchContactPage(): Promise<ContactPage> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("title, content, seo_title, seo_description")
    .eq("slug", "kontakt")
    .eq("published", true)
    .maybeSingle();

  if (!data) {
    return {
      ...DEFAULT_CONTACT,
      title: "Kontakt",
      seoTitle: "Kontakta Spelbok",
      seoDescription: DEFAULT_CONTACT.intro.slice(0, 160),
    };
  }

  return {
    ...contactFromPageContent(String(data.content ?? "")),
    title: data.title || "Kontakt",
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
  };
}
