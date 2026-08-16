import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Underhåll",
  description: "Spelbok är tillfälligt nere för underhåll.",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const supabase = await createClient();
  const site = await fetchSiteSettings(supabase);

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
            Underhåll pågår
          </h1>
          <p className="mt-3 text-[14.5px] text-text-soft">
            Vi jobbar på {site.name} just nu. Dina spel och din statistik är
            orörda — appen är tillbaka om en liten stund.
          </p>
        </div>
        <p className="mt-5 text-[13px] text-muted">
          Är du admin?{" "}
          <Link href="/admin">Logga in i adminpanelen</Link>
        </p>
      </div>
    </div>
  );
}
