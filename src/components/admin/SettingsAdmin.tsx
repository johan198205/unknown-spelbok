"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  saveNotifySettings,
  saveSiteSettings,
  type NotifyChannel,
  type NotifySettings,
} from "@/lib/admin/settings";
import type { SiteSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative h-[26px] w-[46px] shrink-0 rounded-full border transition-colors",
        on ? "border-win/40 bg-win/25" : "border-line-strong bg-panel-2"
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] size-[18px] rounded-full transition-[left]",
          on ? "left-[24px] bg-win" : "left-[2px] bg-muted"
        )}
      />
    </button>
  );
}

function SaveBar({
  dirty,
  pending,
  saved,
  error,
  onSave,
}: {
  dirty: boolean;
  pending: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div className="sticky bottom-4 flex items-center justify-end gap-3">
      {error ? (
        <span className="rounded-[9px] border border-loss/40 bg-loss/10 px-3 py-2 text-[13px] text-loss-text">
          {error}
        </span>
      ) : null}
      {saved && !dirty ? (
        <span className="font-mono-num text-[12.5px] text-win">Sparat ✓</span>
      ) : null}
      <button
        type="button"
        disabled={pending || !dirty}
        onClick={onSave}
        className="cursor-pointer rounded-[11px] bg-win px-[26px] py-[13px] text-[15px] font-bold text-win-ink shadow-[0_10px_28px_rgba(0,0,0,.45)] transition disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? "Sparar…" : "Spara inställningar"}
      </button>
    </div>
  );
}

export function GeneralSettingsForm({ site }: { site: SiteSettings }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SiteSettings>(site);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(site);

  const patch = (next: Partial<SiteSettings>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, ...next }));
  };

  return (
    <>
      <div className="rounded-[14px] border border-line bg-panel p-5">
        <div className="mb-4 font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
          Allmänt
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.12em] text-dim">
              Sajtnamn
            </span>
            <input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="w-full rounded-[9px] border border-line bg-bg px-3 py-[11px] text-[14px] outline-none focus:border-line-hover"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.12em] text-dim">
              Standardvaluta
            </span>
            <input
              value={draft.currency}
              onChange={(e) =>
                patch({ currency: e.target.value.toUpperCase().slice(0, 6) })
              }
              className="font-mono-num w-full rounded-[9px] border border-line bg-bg px-3 py-[11px] text-[14px] outline-none focus:border-line-hover"
            />
          </label>
        </div>

        <div className="flex items-center gap-3.5 border-t border-line-soft py-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-semibold">Öppen registrering</div>
            <div className="text-[12.5px] text-muted">
              {draft.registrations_open
                ? "Nya konton kan skapas på /registrera."
                : "Registreringen är stängd — formuläret byts mot ett meddelande."}
            </div>
          </div>
          <Toggle
            on={draft.registrations_open}
            label="Öppen registrering"
            onClick={() => patch({ registrations_open: !draft.registrations_open })}
          />
        </div>

        <div className="flex items-center gap-3.5 border-t border-line-soft py-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-semibold">Underhållsläge</div>
            <div
              className={cn(
                "text-[12.5px]",
                draft.maintenance ? "text-yellow" : "text-muted"
              )}
            >
              {draft.maintenance
                ? "Alla utom admins möts av underhållssidan."
                : "Appen är öppen för alla inloggade."}
            </div>
          </div>
          <Toggle
            on={draft.maintenance}
            label="Underhållsläge"
            onClick={() => patch({ maintenance: !draft.maintenance })}
          />
        </div>

        {draft.maintenance ? (
          <div className="mt-2 flex items-start gap-2.5 rounded-[11px] border border-yellow/40 bg-yellow/10 px-3.5 py-3 text-[13px] text-yellow">
            <span aria-hidden>⚠</span>
            <span>
              Underhållsläget stänger av appen för alla utom admins. Du kommer
              själv åt /admin, övriga ser underhållssidan.
            </span>
          </div>
        ) : null}
      </div>

      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={() => {
          setError(null);
          startTransition(async () => {
            try {
              await saveSiteSettings(draft);
              setSaved(true);
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Kunde inte spara inställningarna"
              );
            }
          });
        }}
      />
    </>
  );
}

const NOTIFY_LABELS: { key: keyof NotifySettings; label: string }[] = [
  { key: "new_user", label: "Ny användare registrerar sig" },
  { key: "manual_settle", label: "Spel kräver manuell sättling" },
  { key: "api_quota", label: "API-kvoten närmar sig taket" },
  { key: "competition_entry", label: "Ny anmälan till tävling" },
];

const CHANNELS: { key: NotifyChannel; label: string }[] = [
  { key: "email", label: "Mejl" },
  { key: "none", label: "Ingen" },
];

export function NotifySettingsForm({ notify }: { notify: NotifySettings }) {
  const router = useRouter();
  const [draft, setDraft] = useState<NotifySettings>(notify);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(notify);

  return (
    <>
      <div className="rounded-[14px] border border-line bg-panel p-5">
        <div className="mb-4 font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
          Notiser
        </div>
        {NOTIFY_LABELS.map((row) => (
          <div
            key={row.key}
            className="flex flex-wrap items-center gap-3.5 border-t border-line-soft py-3.5"
          >
            <span className="min-w-0 flex-1 text-[14.5px] text-text-soft">
              {row.label}
            </span>
            <div className="flex gap-[3px] rounded-[9px] border border-line-soft bg-bg p-[3px]">
              {CHANNELS.map((channel) => {
                const on = draft[row.key] === channel.key;
                return (
                  <button
                    key={channel.key}
                    type="button"
                    onClick={() => {
                      setSaved(false);
                      setDraft((d) => ({ ...d, [row.key]: channel.key }));
                    }}
                    className={cn(
                      "cursor-pointer rounded-[7px] px-3.5 py-[7px] text-[12.5px] font-semibold transition-colors",
                      on
                        ? "bg-panel-2 text-text"
                        : "bg-transparent text-muted hover:text-text"
                    )}
                  >
                    {channel.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="mt-3.5 text-[12.5px] text-dim">
          Mejlen skickas till adminkontonas e-postadresser när respektive
          händelse inträffar.
        </p>
      </div>

      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={() => {
          setError(null);
          startTransition(async () => {
            try {
              await saveNotifySettings(draft);
              setSaved(true);
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Kunde inte spara notiserna"
              );
            }
          });
        }}
      />
    </>
  );
}
