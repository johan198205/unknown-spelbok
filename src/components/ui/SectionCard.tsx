import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
  title,
  action,
  bodyClassName,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-panel)] border border-line bg-panel",
        className
      )}
    >
      {title != null ? (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="font-display text-[17px] font-semibold uppercase tracking-[0.06em]">
            {title}
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  );
}
