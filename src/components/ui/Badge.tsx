import { cn } from "@/lib/utils";

export type BadgeTone =
  | "public"
  | "private"
  | "auto"
  | "manual"
  | "muted"
  | "win"
  | "cyan"
  | "yellow"
  | "loss"
  | "blue";

const tones: Record<BadgeTone, string> = {
  public: "bg-[var(--badge-pub-bg)] text-win",
  private: "bg-[var(--badge-priv-bg)] text-muted",
  auto: "bg-[var(--badge-auto-bg)] text-blue",
  manual: "bg-panel-2 text-muted",
  muted: "bg-panel-2 text-muted",
  win: "bg-win/15 text-win",
  cyan: "bg-cyan/15 text-cyan",
  yellow: "bg-yellow/15 text-yellow",
  loss: "bg-loss/15 text-loss",
  blue: "bg-[var(--blue-soft)] text-blue",
};

export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-badge)] px-[7px] py-[3px] text-[9.5px] font-semibold uppercase tracking-[0.1em]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
