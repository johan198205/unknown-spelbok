import {
  ManualSettleRows,
  SyncFixturesButton,
} from "@/components/admin/SettleAdmin";
import { getSettleData } from "@/lib/admin/settle";
import { cn, formatMoney } from "@/lib/utils";

export const metadata = { title: "Sättling" };

const FIXTURE_STATUS_LABEL: Record<string, string> = {
  NS: "Ej startad",
  TBD: "Tid saknas",
  "1H": "Första halvlek",
  HT: "Halvtid",
  "2H": "Andra halvlek",
  ET: "Förlängning",
  P: "Straffar",
  LIVE: "Pågår",
  FT: "Slut",
  AET: "Slut e. förl.",
  PEN: "Slut e. straffar",
  PST: "Uppskjuten",
  CANC: "Inställd",
  ABD: "Avbruten",
  SUSP: "Avbruten",
  INT: "Avbruten",
  AWD: "Domarbeslut",
  WO: "Walkover",
};

function statusTone(status: string) {
  if (status === "FT" || status === "AET" || status === "PEN") {
    return "bg-win/15 text-win";
  }
  if (["PST", "CANC", "ABD", "SUSP", "INT"].includes(status)) {
    return "bg-loss/15 text-loss";
  }
  if (["1H", "HT", "2H", "ET", "P", "LIVE"].includes(status)) {
    return "bg-cyan/15 text-cyan";
  }
  return "bg-amber/15 text-amber";
}

function kickoffLabel(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

function syncedLabel(iso: string | null) {
  if (!iso) return "aldrig synkad";
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just nu";
  if (mins < 60) return `för ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `för ${hours} tim`;
  return `${Math.floor(hours / 24)} dagar sedan`;
}

export default async function AdminSettlePage() {
  const data = await getSettleData();

  return (
    <div className="animate-[admfade_.22s_ease]">
      <div className="mb-4 grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <div className="flex items-center gap-[11px] rounded-[13px] border border-line bg-panel p-[15px]">
          <span
            className={cn(
              "size-[9px] shrink-0 rounded-full",
              data.api.ok ? "bg-win" : "bg-yellow"
            )}
          />
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-dim">
              API-status
            </div>
            <div className="text-[13.5px]">
              {data.api.ok ? "Ansluten" : "Väntar på synk"} ·{" "}
              <span
                className={cn(
                  "font-mono-num",
                  data.api.ok ? "text-muted" : "text-yellow"
                )}
              >
                {data.api.lastSyncLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[13px] border border-line bg-panel p-4">
          <div className="mb-2 text-[10.5px] uppercase tracking-[0.13em] text-dim">
            Väntar på resultat
          </div>
          <div className="font-mono-num text-[27px] font-semibold">
            {data.waitingCount.toLocaleString("sv-SE")}
          </div>
        </div>

        <div
          className={cn(
            "rounded-[13px] border bg-panel p-4",
            data.manualCount > 0 ? "border-yellow/40" : "border-line"
          )}
        >
          <div className="mb-2 text-[10.5px] uppercase tracking-[0.13em] text-dim">
            Behöver manuell hantering
          </div>
          <div
            className={cn(
              "font-mono-num text-[27px] font-semibold",
              data.manualCount > 0 ? "text-yellow" : "text-text"
            )}
          >
            {data.manualCount.toLocaleString("sv-SE")}
          </div>
        </div>
      </div>

      <div className="mb-4 overflow-hidden rounded-[14px] border border-line bg-panel">
        <div className="flex items-center gap-2.5 border-b border-line-soft px-[18px] py-[15px]">
          <span className="font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
            Manuell hantering
          </span>
          <span className="font-mono-num rounded-[6px] bg-amber/15 px-2 py-[3px] text-[11.5px] text-amber">
            {data.manualCount.toLocaleString("sv-SE")} spel
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-[1000px] gap-3 border-b border-line bg-bg-soft px-[18px] py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span className="w-[130px] shrink-0">Användare</span>
            <span className="flex-[1.2]">Match</span>
            <span className="flex-1">Spel</span>
            <span className="w-[70px] shrink-0 text-right">Odds</span>
            <span className="w-[90px] shrink-0 text-right">Insats</span>
            <span className="w-[150px] shrink-0">Orsak</span>
            <span className="w-[150px] shrink-0" />
          </div>
          <ManualSettleRows rows={data.manual} />
        </div>
      </div>

      <div className="mb-4 overflow-hidden rounded-[14px] border border-line bg-panel">
        <div className="flex items-center justify-between gap-3 border-b border-line-soft px-[18px] py-[15px]">
          <span className="font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
            Väntar på resultat
          </span>
          <span className="font-mono-num text-[12px] text-dim">
            avspark passerad
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-[900px] gap-3 border-b border-line bg-bg-soft px-[18px] py-[11px] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span className="w-[130px] shrink-0">Användare</span>
            <span className="flex-[1.2]">Match</span>
            <span className="flex-1">Spel</span>
            <span className="w-[130px] shrink-0">Avspark</span>
            <span className="w-[60px] shrink-0 text-center">Res.</span>
            <span className="w-[130px] shrink-0">Fixture-status</span>
          </div>
          {data.waiting.length ? (
            data.waiting.map((row) => (
              <div
                key={row.betId}
                className="flex min-w-[900px] items-center gap-3 border-b border-rowline px-[18px] py-3 transition-colors hover:bg-hover"
              >
                <span className="w-[130px] shrink-0 truncate text-[13.5px]">
                  {row.user}
                </span>
                <span className="min-w-0 flex-[1.2] truncate text-[13.5px]">
                  {row.match}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                  {row.pick}
                </span>
                <span className="font-mono-num w-[130px] shrink-0 text-[12.5px] text-muted">
                  {kickoffLabel(row.kickoff)}
                </span>
                <span className="font-mono-num w-[60px] shrink-0 text-center text-[13px]">
                  {row.score}
                </span>
                <span className="w-[130px] shrink-0">
                  <span
                    className={cn(
                      "rounded-[6px] px-2 py-1 text-[10.5px] font-bold tracking-[0.07em]",
                      statusTone(row.fixtureStatus)
                    )}
                  >
                    {FIXTURE_STATUS_LABEL[row.fixtureStatus] ??
                      row.fixtureStatus}
                  </span>
                </span>
              </div>
            ))
          ) : (
            <div className="px-[18px] py-8 text-center text-[13.5px] text-dim">
              Inga spel väntar på resultat.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
          <div className="border-b border-line-soft px-[18px] py-[15px] font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
            Senaste auto-rättningar
          </div>
          {data.auto.length ? (
            data.auto.map((row) => (
              <div
                key={row.betId}
                className="font-mono-num flex items-center gap-3 border-b border-rowline px-[18px] py-[11px] text-[12.5px]"
              >
                <span className="w-14 shrink-0 text-dim">{row.settledAt}</span>
                <span className="min-w-0 flex-1 truncate font-sans text-[13.5px] text-text-soft">
                  {row.match}
                </span>
                <span className="w-14 shrink-0 text-center font-semibold">
                  {row.score}
                </span>
                <span
                  className={cn(
                    "w-[96px] shrink-0 text-right",
                    row.netto > 0
                      ? "text-win"
                      : row.netto < 0
                        ? "text-loss"
                        : "text-muted"
                  )}
                >
                  {formatMoney(row.netto)}
                </span>
                <span
                  className={cn(
                    "w-[18px] shrink-0 text-center text-[13px]",
                    row.result === "win" || row.result === "halfwin"
                      ? "text-win"
                      : row.result === "loss" || row.result === "halfloss"
                        ? "text-loss"
                        : "text-muted"
                  )}
                >
                  ✓
                </span>
              </div>
            ))
          ) : (
            <div className="px-[18px] py-8 text-center text-[13.5px] text-dim">
              Inga auto-rättningar ännu. Kör Edge-funktionen settle-results.
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
          <div className="flex items-center justify-between gap-3 border-b border-line-soft px-[18px] py-[15px]">
            <span className="font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
              Fixtures-cache
            </span>
            <SyncFixturesButton />
          </div>
          {data.fixtures.length ? (
            data.fixtures.map((row) => (
              <div
                key={row.league}
                className="flex items-center gap-3 border-b border-rowline px-[18px] py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">
                    {row.league}
                  </div>
                  <div className="font-mono-num text-[11.5px] text-dim">
                    {row.upcoming.toLocaleString("sv-SE")} kommande · synkad{" "}
                    {syncedLabel(row.oldestUpdatedAt)}
                  </div>
                </div>
                <SyncFixturesButton league={row.league} />
              </div>
            ))
          ) : (
            <div className="px-[18px] py-8 text-center text-[13.5px] text-dim">
              Cachen är tom. Synka för att hämta kommande matcher.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[14px] border border-line bg-panel">
        <div className="border-b border-line-soft px-[18px] py-[15px] font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
          Synklogg
        </div>
        {data.syncLog.length ? (
          data.syncLog.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 border-b border-rowline px-[18px] py-3 text-[13px]"
            >
              <span className="font-mono-num w-[140px] shrink-0 text-[12.5px] text-muted">
                {row.startedLabel}
              </span>
              <span className="w-[140px] shrink-0 font-semibold">{row.job}</span>
              <span
                className={cn(
                  "rounded-[6px] px-2 py-1 text-[10.5px] font-bold tracking-[0.07em]",
                  row.ok ? "bg-win/15 text-win" : "bg-loss/15 text-loss"
                )}
              >
                {row.ok ? "OK" : "FEL"}
              </span>
              <span className="font-mono-num text-[12px] text-dim">
                {row.requests} req · {row.upserted} upsert · {row.settled}{" "}
                settlade
              </span>
              {row.error ? (
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-loss">
                  {row.error}
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <div className="px-[18px] py-8 text-center text-[13.5px] text-dim">
            Ingen synk körd ännu. Deploya sync-fixtures och tryck Synka nu.
          </div>
        )}
      </div>
    </div>
  );
}
