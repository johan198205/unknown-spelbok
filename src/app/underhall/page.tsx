import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchSiteSettings } from "@/lib/site-settings";
import { getT } from "@/lib/texts/server";

export async function generateMetadata() {
  const t = await getT();
  return {
    title: t("errors.maintenance.metaTitle"),
    description: t("errors.maintenance.metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function MaintenancePage() {
  const supabase = await createClient();
  const [site, t] = await Promise.all([fetchSiteSettings(supabase), getT()]);

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-20">
      <div className="w-full max-w-[440px] text-center">
        <div className="font-display mb-6 text-2xl font-bold tracking-[0.14em]">
          {site.name.toUpperCase()}
        </div>
        <div className="rounded-[14px] border border-yellow/40 bg-yellow/10 p-7">
          <div className="mb-3 text-[28px]" aria-hidden>
            🔧
          </div>
          <h1 className="font-display text-[22px] font-semibold uppercase tracking-[0.05em] text-yellow">
            {t("errors.maintenance.title")}
          </h1>
          <p className="mt-3 text-[14.5px] text-text-soft">
            {t("errors.maintenance.body", { site: site.name })}
          </p>
        </div>
        <p className="mt-5 text-[13px] text-muted">
          {t("errors.maintenance.adminQuestion")}{" "}
          <Link href="/admin">{t("errors.maintenance.adminLink")}</Link>
        </p>
      </div>
    </div>
  );
}
