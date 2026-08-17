"use client";

export default function SpelbokError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-1 py-8">
      <h1 className="font-display text-[28px] font-semibold">Spelboken</h1>
      <p className="mt-2 text-muted">Sidan gick inte att visa just nu.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-[9px] border border-win bg-win/10 px-3.5 py-2 text-sm font-semibold text-win"
      >
        Försök igen
      </button>
    </div>
  );
}
