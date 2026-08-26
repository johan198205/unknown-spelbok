import { cn } from "@/lib/utils";
import { StatCard } from "./StatCard";

export { Badge } from "./Badge";
export type { BadgeTone } from "./Badge";
export { ResultButtons } from "./ResultButtons";
export { SectionCard } from "./SectionCard";
export { StatCard } from "./StatCard";

export function Panel({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  /** Ankarmål, t.ex. #tavling-{id} från en notis. */
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "rounded-[var(--radius-panel)] border border-line bg-panel",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Prefer StatCard — kept for existing pages */
export function Kpi({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <StatCard
      label={label}
      value={value}
      color={color}
      className="rounded-[var(--radius-panel)] px-4 py-4"
    />
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Panel className="px-6 py-12 text-center text-muted">{children}</Panel>
  );
}
