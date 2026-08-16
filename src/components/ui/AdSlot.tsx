import { cn } from "@/lib/utils";

export function AdSlot({
  label = "ANNONSPLATS 970×90",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[var(--radius-ad)] border border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--ad-a),var(--ad-a)_10px,var(--ad-b)_10px,var(--ad-b)_20px)] font-mono-num text-[12px] tracking-[0.14em] text-faint",
        className
      )}
    >
      {label}
    </div>
  );
}
