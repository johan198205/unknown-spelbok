import { ButtonLink } from "@/components/ui/Button";
import { Emblem } from "@/components/brand/Logo";
import { getProfile } from "@/lib/auth";
import { getT } from "@/lib/texts/server";

/**
 * Innehållet på 404-sidan. Används av app/not-found.tsx (okända adresser,
 * med egen header och footer) och (public)/not-found.tsx (notFound() i en
 * publik sida, där layouten redan ger header och footer).
 */
export async function NotFoundContent() {
  const [profile, t] = await Promise.all([getProfile(), getT()]);

  return (
    <div className="animate-sbfade mx-auto flex w-full max-w-[640px] flex-col items-start px-5 py-16 lg:py-24">
      {/* React lyfter <title> till <head>; not-found.js stöder inte metadata. */}
      <title>{t("errors.notFound.metaTitle")}</title>
      <Emblem className="mb-6 h-9 w-auto text-text" />
      <div className="label-caps mb-3">{t("errors.notFound.eyebrow")}</div>
      <h1 className="font-display text-[28px] font-semibold lg:text-[34px]">
        {t("errors.notFound.title")}
      </h1>
      <p className="mt-2 text-muted">{t("errors.notFound.body")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href={profile ? "/hem" : "/"}>
          {t("errors.notFound.home")}
        </ButtonLink>
        <ButtonLink href="/topplista" variant="secondary">
          {t("errors.notFound.toplist")}
        </ButtonLink>
      </div>
    </div>
  );
}
