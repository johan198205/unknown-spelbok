"use client";

import { useT } from "@/components/TextsProvider";

export default function SpelbokError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  return (
    <div className="px-1 py-8">
      <h1 className="font-display text-[28px] font-semibold">{t("errors.spelbok.title")}</h1>
      <p className="mt-2 text-muted">{t("errors.spelbok.body")}</p>
      {error.message ? (
        <p className="mt-2 max-w-xl font-mono-num text-[12px] text-faint">
          {error.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-[9px] border border-win bg-win/10 px-3.5 py-2 text-sm font-semibold text-win"
      >
        {t("errors.spelbok.retry")}
      </button>
    </div>
  );
}
