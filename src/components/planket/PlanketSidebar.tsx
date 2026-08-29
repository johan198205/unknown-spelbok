import Link from "next/link";
import { Avatar, LeagueCrest } from "@/components/planket/Bits";
import { ResponsibleBox } from "@/components/planket/ResponsibleBox";
import { formatPick } from "@/lib/picks";
import { planketOdds } from "@/lib/planket";
import { fetchActiveUsers, fetchTopBacked } from "@/lib/planket-server";
import { cn } from "@/lib/utils";

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-[11px] font-display text-[15px] font-semibold uppercase tracking-[0.09em] text-text">
      {children}
    </h2>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[14px] border border-line bg-[#151B2B] p-4",
        className
      )}
    >
      {children}
    </section>
  );
}

export async function PlanketSidebar() {
  const [topBacked, active] = await Promise.all([
    fetchTopBacked(3),
    fetchActiveUsers(6),
  ]);

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col gap-[14px] sheet:flex">
      <Card>
        <CardTitle>Mest ryggade idag</CardTitle>
        {topBacked.length === 0 ? (
          <p className="text-[13px] text-[#5D6883]">
            Inga ryggningar i dag ännu.
          </p>
        ) : (
          <div className="flex flex-col gap-[9px]">
            {topBacked.map((row) => (
              <Link
                key={row.post_id}
                href={`/planket#inlagg-${row.post_id}`}
                className="block rounded-[10px] border border-line bg-[#1B2233] px-3 py-2.5 no-underline hover:border-[#3A4560] hover:no-underline"
              >
                <div className="mb-[5px] flex items-center gap-2">
                  <LeagueCrest
                    logo={row.league_logo}
                    leagueId={row.league_id}
                    sport={row.sport}
                    name={row.league}
                    size={18}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[#8A94AB]">
                    {row.match}
                  </span>
                  <span className="shrink-0 font-mono-num text-[13.5px] font-semibold text-text">
                    {planketOdds(row.odds)}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-text">
                    {formatPick(row.pick)}
                  </span>
                  <span className="shrink-0 font-mono-num text-[11.5px] text-win">
                    Ryggat av {row.backed_today}
                  </span>
                </div>
                <div className="mt-1 truncate text-[11.5px] text-[#5D6883]">
                  Postat av {row.author_username}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Aktiva just nu</CardTitle>
        {active.users.length === 0 ? (
          <p className="text-[13px] text-[#5D6883]">Ingen aktiv den senaste timmen.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {active.users.map((user) => (
              <span key={user.id} title={user.username} className="relative">
                <Avatar username={user.username} size={34} />
                {/*
                  Punkten har 2 px kant i kortets bakgrundsfärg, inte i
                  sidans — annars ser den ut att sväva över avataren.
                */}
                <span
                  aria-hidden
                  className="absolute -bottom-px -right-px block h-[9px] w-[9px] rounded-full border-2 border-[#151B2B] bg-win"
                />
              </span>
            ))}
            {active.overflow > 0 ? (
              <span className="ml-1 font-mono-num text-[12.5px] text-[#5D6883]">
                +{active.overflow}
              </span>
            ) : null}
          </div>
        )}
      </Card>

      <ResponsibleBox />
    </aside>
  );
}
