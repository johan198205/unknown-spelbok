import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { NotFoundContent } from "@/components/layout/NotFoundContent";
import { getProfile } from "@/lib/auth";

/**
 * Okända adresser och notFound() utanför (public) renderas bara inuti
 * rotlayouten, så header och footer läggs på här.
 */
export default async function NotFound() {
  const profile = await getProfile();

  return (
    <>
      <SiteHeader variant={profile ? "app" : "public"} />
      <main className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
