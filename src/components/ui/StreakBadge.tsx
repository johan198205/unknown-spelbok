import { getT } from "@/lib/texts/server";
import { cn } from "@/lib/utils";

/** Visas från 3 raka vinster; från 5 förstärkt med 🔥. */
export async function StreakBadge({
  streak,
  className,
}: {
  streak: number;
  className?: string;
}) {
  if (streak < 3) return null;
  const hot = streak >= 5;
  const t = await getT();

  return (
    <span
      title={t("common.streak.title", { count: streak })}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[13.5px] font-semibold",
        hot
          ? "border-[var(--yellow-border)] bg-[var(--yellow-soft)] text-yellow shadow-[0_0_18px_rgba(255,209,102,0.18)]"
          : "border-[var(--win-border)] bg-[var(--win-soft)] text-win",
        className
      )}
    >
      {hot ? <span aria-hidden>🔥</span> : null}
      <span className="font-mono-num">{streak}</span>
      {t("common.streak.label")}
    </span>
  );
}
