import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { getT } from "@/lib/texts/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("errors.offline.metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function OfflinePage() {
  const t = await getT();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-bg-soft px-6 py-16 text-center">
      <Logo title={t("errors.offline.brand")} className="h-8 w-auto text-text" />
      <h1 className="mt-8 font-display text-[32px] font-semibold tracking-wide text-text">
        {t("errors.offline.title")}
      </h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
        {t("errors.offline.body")}
      </p>
      <Link
        href="/spelbok"
        className="mt-10 rounded-[var(--radius-btn)] border border-[var(--win-border)] bg-[var(--win-soft)] px-5 py-2.5 text-sm font-semibold text-win no-underline hover:no-underline"
      >
        {t("errors.offline.retry")}
      </Link>
    </div>
  );
}
