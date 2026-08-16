import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  color,
  className,
}: {
  label: string;
  value: string;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[var(--radius-stat)] border border-line bg-panel px-[13px] py-3",
        className
      )}
    >
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.13em] text-faint">
        {label}
      </div>
      <div
        className={cn(
          "font-mono-num text-[18px] font-semibold whitespace-nowrap",
          color || "text-text"
        )}
      >
        {value}
      </div>
    </div>
  );
}
