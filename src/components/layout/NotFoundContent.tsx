import { ButtonLink } from "@/components/ui/Button";
import { getProfile } from "@/lib/auth";

/**
 * Innehållet på 404-sidan. Används av app/not-found.tsx (okända adresser,
 * med egen header och footer) och (public)/not-found.tsx (notFound() i en
 * publik sida, där layouten redan ger header och footer).
 */
export async function NotFoundContent() {
  const profile = await getProfile();

  return (
    <div className="animate-sbfade mx-auto flex w-full max-w-[640px] flex-col items-start px-5 py-16 lg:py-24">
      {/* React lyfter <title> till <head>; not-found.js stöder inte metadata. */}
      <title>Sidan hittades inte · Spelbok</title>
      <div className="label-caps mb-3">404</div>
      <h1 className="font-display text-[28px] font-semibold lg:text-[34px]">
        Sidan hittades inte
      </h1>
      <p className="mt-2 text-muted">
        Länken kan vara fel, eller så har sidan tagits bort. Privata spelböcker
        och borttagna kuponger syns inte heller här.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href={profile ? "/hem" : "/"}>Till startsidan</ButtonLink>
        <ButtonLink href="/topplista" variant="secondary">
          Topplistan
        </ButtonLink>
      </div>
    </div>
  );
}
