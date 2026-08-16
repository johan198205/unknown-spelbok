import Link from "next/link";
import { AuthPage } from "@/components/layout/AuthForm";
import { Panel } from "@/components/ui/Panel";
import { fetchSiteSettings } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

export default async function RegisterPage() {
  const supabase = await createClient();
  const site = await fetchSiteSettings(supabase);

  if (!site.registrations_open) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-6 text-center">
            <div className="font-display text-2xl font-bold tracking-[0.14em]">
              {site.name.toUpperCase()}
            </div>
          </div>
          <Panel className="p-[26px] text-center">
            <div className="mb-2 inline-flex rounded-[6px] bg-yellow/15 px-2 py-1 text-[10.5px] font-bold tracking-[0.1em] text-yellow">
              STÄNGD
            </div>
            <h1 className="font-display text-[20px] font-semibold uppercase tracking-[0.05em]">
              Registreringen är stängd
            </h1>
            <p className="mt-2.5 text-[14px] text-muted">
              Just nu tar vi inte emot nya konton på {site.name}. Har du redan
              ett konto kan du logga in som vanligt.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex rounded-[10px] bg-win px-5 py-3 text-[14.5px] font-bold text-win-ink no-underline hover:text-win-ink hover:no-underline"
            >
              Logga in
            </Link>
          </Panel>
          <div className="mt-[18px] text-center">
            <Link href="/">Tillbaka till startsidan</Link>
          </div>
        </div>
      </div>
    );
  }

  return <AuthPage mode="register" />;
}
