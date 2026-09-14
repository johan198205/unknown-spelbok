import {
  fetchLandingPage,
  type LandingPage,
} from "@/lib/landing-content";

/** @deprecated Använd LandingPage / fetchLandingPage. */
export type LandingHero = {
  title: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

/**
 * Hero-texter från CMS-sidan `startsida` (Admin → Sidor).
 * Saknas sidan eller är den opublicerad → defaults.
 */
export async function fetchLandingHero(): Promise<LandingHero> {
  const page: LandingPage = await fetchLandingPage();
  return {
    title: page.title,
    body: page.hero.body,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  };
}
