import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { nettoColor } from "@/lib/utils";
import type { TopListEntry } from "@/lib/toplists";

export function TopListCard({
  title,
  subtitle,
  entries,
  empty,
}: {
  title: string;
  subtitle?: string;
  entries: TopListEntry[];
  empty: string;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-line bg-bg-soft px-4 py-3">
        <div className="font-display text-[15px] font-semibold">{title}</div>
        {subtitle ? (
          <div className="text-[11.5px] text-dim">{subtitle}</div>
        ) : null}
      </div>

      {entries.length ? (
        <ol className="px-4 py-2">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className="flex items-baseline gap-2 border-b border-[#171E2C] py-2 text-[13.5px] last:border-0"
            >
              <span className="w-5 shrink-0 text-right font-mono-num text-[12px] text-dim">
                {i + 1}.
              </span>
              <span className="min-w-0 flex-1">
                {entry.href ? (
                  <Link href={entry.href} className="block truncate">
                    {entry.label}
                  </Link>
                ) : (
                  <span className="block truncate">{entry.label}</span>
                )}
                {entry.sublabel ? (
                  <span className="block truncate text-[11.5px] text-dim">
                    {entry.sublabel}
                  </span>
                ) : null}
              </span>
              <span
                className={`shrink-0 font-mono-num text-[13px] font-semibold ${
                  entry.tone === "netto" ? nettoColor(entry.value) : "text-muted"
                }`}
              >
                {entry.display}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="px-4 py-8 text-center text-[13px] text-muted">
          {empty}
        </div>
      )}
    </Panel>
  );
}
