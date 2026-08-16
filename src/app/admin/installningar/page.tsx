import Link from "next/link";
import {
  GeneralSettingsForm,
  NotifySettingsForm,
} from "@/components/admin/SettingsAdmin";
import {
  getAdminLogs,
  getAdminSettings,
  getApiKeyStatus,
} from "@/lib/admin/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inställningar" };

type Section = "allmant" | "nycklar" | "notiser" | "loggar";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "allmant", label: "Allmänt" },
  { key: "nycklar", label: "API-nycklar" },
  { key: "notiser", label: "Notiser" },
  { key: "loggar", label: "Loggar" },
];

const ACTION_LABELS: Record<string, string> = {
  "user.role_changed": "Roll ändrad",
  "user.banned": "Konto avstängt",
  "user.unbanned": "Konto aktiverat",
  "bookmaker.created": "Spelbolag skapat",
  "bookmaker.updated": "Spelbolag uppdaterat",
  "bookmaker.published": "Spelbolag publicerat",
  "bookmaker.unpublished": "Spelbolag avpublicerat",
  "bookmaker.reordered": "Spelbolag omsorterade",
  "banner.created": "Banner skapad",
  "banner.updated": "Banner uppdaterad",
  "banner.activated": "Banner aktiverad",
  "banner.paused": "Banner pausad",
  "banner.deleted": "Banner raderad",
  "page.created": "Sida skapad",
  "page.updated": "Sida uppdaterad",
  "page.published": "Sida publicerad",
  "page.unpublished": "Sida avpublicerad",
  "page.deleted": "Sida raderad",
  "competition.created": "Tävling skapad",
  "competition.updated": "Tävling uppdaterad",
  "competition.ended": "Tävling avslutad",
  "settle.manual": "Manuell sättling",
  "fixtures.synced": "Fixtures synkade",
  "settings.site_updated": "Sajtinställningar sparade",
  "settings.notify_updated": "Notiser sparade",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function logTime(iso: string) {
  return new Date(iso)
    .toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm",
    })
    .replace(",", "");
}

function syncLabel(iso: string | null) {
  if (!iso) return "ingen synk ännu";
  return new Date(iso).toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; action?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const section: Section =
    (SECTIONS.find((s) => s.key === sp.section)?.key as Section) ?? "allmant";
  const actionFilter = sp.action ?? "all";
  const page = Math.max(1, Number(sp.page || 1));

  const [{ site, notify }, keys, logs] = await Promise.all([
    getAdminSettings(),
    getApiKeyStatus(),
    section === "loggar"
      ? getAdminLogs({ action: actionFilter, page })
      : Promise.resolve(null),
  ]);

  return (
    <div className="grid animate-[admfade_.22s_ease] grid-cols-1 items-start gap-5 lg:grid-cols-[200px_1fr]">
      <div className="rounded-[14px] border border-line bg-panel p-2 lg:sticky lg:top-[88px]">
        <div className="flex gap-1 overflow-x-auto lg:block">
          {SECTIONS.map((s) => {
            const on = s.key === section;
            return (
              <Link
                key={s.key}
                href={`/admin/installningar?section=${s.key}`}
                className={cn(
                  "mb-0.5 block whitespace-nowrap rounded-[9px] px-[13px] py-[11px] text-left text-[14px] font-semibold no-underline transition-colors hover:no-underline",
                  on
                    ? "bg-hover2 text-text"
                    : "bg-transparent text-muted hover:bg-hover hover:text-text"
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {section === "allmant" ? <GeneralSettingsForm site={site} /> : null}

        {section === "nycklar" ? (
          <div className="rounded-[14px] border border-line bg-panel p-5">
            <div className="mb-1.5 font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
              API-nycklar
            </div>
            <div className="mb-4 text-[13px] text-muted">
              Nycklarna sätts som miljövariabler på servern och skickas aldrig
              till klienten. Admin ser bara om de är konfigurerade.
            </div>

            <div className="flex flex-wrap items-center gap-3.5 border-t border-line-soft py-3.5">
              <span
                className={cn(
                  "size-[9px] shrink-0 rounded-full",
                  keys.configured ? "bg-win" : "bg-loss"
                )}
              />
              <div className="w-[180px] min-w-0">
                <div className="text-[14px] font-semibold">API-Football</div>
                <div className="font-mono-num text-[12px] text-dim">
                  APIFOOTBALL_KEY
                </div>
              </div>
              <span className="font-mono-num min-w-0 flex-1 truncate rounded-[9px] border border-line bg-bg px-3 py-[10px] text-[13px] text-text-soft">
                {keys.configured ? "konfigurerad · dolt värde" : "saknas"}
              </span>
              <span
                className={cn(
                  "rounded-[6px] px-2 py-1 text-[10.5px] font-bold tracking-[0.07em]",
                  keys.configured
                    ? "bg-win/15 text-win"
                    : "bg-loss/15 text-loss"
                )}
              >
                {keys.configured ? "AKTIV" : "EJ SATT"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3.5 border-t border-line-soft py-3.5">
              <span
                className={cn(
                  "size-[9px] shrink-0 rounded-full",
                  keys.serviceRoleConfigured ? "bg-win" : "bg-loss"
                )}
              />
              <div className="w-[180px] min-w-0">
                <div className="text-[14px] font-semibold">Supabase service role</div>
                <div className="font-mono-num text-[12px] text-dim">
                  SUPABASE_SERVICE_ROLE_KEY
                </div>
              </div>
              <span className="font-mono-num min-w-0 flex-1 truncate rounded-[9px] border border-line bg-bg px-3 py-[10px] text-[13px] text-text-soft">
                {keys.serviceRoleConfigured
                  ? "konfigurerad · dolt värde"
                  : "saknas"}
              </span>
              <span
                className={cn(
                  "rounded-[6px] px-2 py-1 text-[10.5px] font-bold tracking-[0.07em]",
                  keys.serviceRoleConfigured
                    ? "bg-win/15 text-win"
                    : "bg-loss/15 text-loss"
                )}
              >
                {keys.serviceRoleConfigured ? "AKTIV" : "EJ SATT"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-[11px] border border-line-soft bg-bg-soft px-3.5 py-3">
              <span className="text-[13px] text-muted">
                Senaste lyckade synk mot API-Football
              </span>
              <span className="font-mono-num ml-auto text-[13px] text-text-soft">
                {syncLabel(keys.lastSync)}
              </span>
            </div>
          </div>
        ) : null}

        {section === "notiser" ? <NotifySettingsForm notify={notify} /> : null}

        {section === "loggar" && logs ? (
          <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
            <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-4">
              <span className="font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
                Loggar
              </span>
              <span className="font-mono-num text-[12.5px] text-dim">
                {logs.total.toLocaleString("sv-SE")} händelser
              </span>
              <form className="ml-auto flex items-center gap-2" action="/admin/installningar">
                <input type="hidden" name="section" value="loggar" />
                <select
                  name="action"
                  defaultValue={actionFilter}
                  className="rounded-[9px] border border-line bg-bg px-3 py-2 text-[13.5px] text-text outline-none"
                >
                  <option value="all">Alla händelser</option>
                  {logs.actions.map((a) => (
                    <option key={a} value={a}>
                      {actionLabel(a)}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="cursor-pointer rounded-[9px] border border-line-strong bg-panel-2 px-3.5 py-2 text-[13px] font-semibold text-text-soft transition-colors hover:bg-hover2"
                >
                  Filtrera
                </button>
              </form>
            </div>

            {logs.rows.length ? (
              logs.rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-3.5 border-b border-rowline px-5 py-3"
                >
                  <span className="font-mono-num w-[130px] shrink-0 text-[12px] text-dim">
                    {logTime(row.createdAt)}
                  </span>
                  <span className="w-[120px] shrink-0 truncate text-[13.5px] text-text-soft">
                    {row.admin}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px]">
                    {actionLabel(row.action)}
                    {row.target ? (
                      <span className="text-muted"> · {row.target}</span>
                    ) : null}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-[13.5px] text-dim">
                Inga händelser matchar filtret.
              </div>
            )}

            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="font-mono-num text-[12.5px] text-dim">
                Sida {logs.page} av{" "}
                {Math.max(1, Math.ceil(logs.total / logs.pageSize))}
              </span>
              <div className="flex gap-2">
                <PageLink
                  disabled={logs.page <= 1}
                  href={`/admin/installningar?section=loggar&action=${actionFilter}&page=${logs.page - 1}`}
                >
                  Föregående
                </PageLink>
                <PageLink
                  disabled={logs.page * logs.pageSize >= logs.total}
                  href={`/admin/installningar?section=loggar&action=${actionFilter}&page=${logs.page + 1}`}
                >
                  Nästa
                </PageLink>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-[9px] border border-line bg-panel px-3.5 py-2 text-[13.5px] font-semibold text-muted opacity-40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-[9px] border border-line bg-panel px-3.5 py-2 text-[13.5px] font-semibold text-text no-underline hover:no-underline hover:bg-hover"
    >
      {children}
    </Link>
  );
}
