import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-bg-soft px-6 py-16 text-center">
      <p className="font-display text-[28px] font-bold tracking-[0.14em] text-text">
        SPELBOK
      </p>
      <h1 className="mt-8 font-display text-[32px] font-semibold tracking-wide text-text">
        Du är offline
      </h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
        Öppna spel synkas när uppkopplingen är tillbaka. Du kan bläddra i
        cachade sidor under tiden.
      </p>
      <Link
        href="/spelbok"
        className="mt-10 rounded-[var(--radius-btn)] border border-[var(--win-border)] bg-[var(--win-soft)] px-5 py-2.5 text-sm font-semibold text-win no-underline hover:no-underline"
      >
        Försök igen
      </Link>
    </div>
  );
}
