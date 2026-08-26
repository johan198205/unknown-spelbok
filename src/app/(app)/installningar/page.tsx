import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/bets/SettingsForm";
import { DisplayPrefsForm } from "@/components/bets/DisplayPrefsForm";
import { PushToggle } from "@/components/PushToggle";
import { NotifySettleToggle } from "@/components/bets/NotifySettleToggle";
import { NotificationSettingsCard } from "@/components/notifications/NotificationSettingsCard";
import { Badge, Panel } from "@/components/ui/Panel";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { formatAmount } from "@/lib/display";
import { getDisplayPrefs } from "@/lib/display-prefs";
import { getNotificationSettings } from "@/lib/notifications-server";
import { computeStats, formatRoi, initialOf, nettoColor } from "@/lib/utils";
import type { Bet, Sheet } from "@/lib/types";

export default async function InstallningarPage() {
  await requireUser();
  const profile = await getProfile();
  if (!profile) return null;

  const prefs = await getDisplayPrefs();
  const notificationSettings = await getNotificationSettings();
  const supabase = await createClient();
  const [{ data: sheets }, { data: betsData }] = await Promise.all([
    supabase
      .from("sheets")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("bets")
      .select("stake, payout, result, sheet_id")
      .eq("user_id", profile.id),
  ]);

  const sheetList = (sheets || []) as Sheet[];
  const bets = (betsData || []) as Bet[];
  const stats = computeStats(bets);

  return (
    <div className="animate-sbfade mx-auto max-w-[820px] space-y-5">
      {/* Mobile profile hero */}
      <div className="lg:hidden">
        <div className="flex flex-col items-center pt-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line-strong bg-panel-2 font-display text-2xl font-semibold">
            {initialOf(profile.username)}
          </div>
          <h1 className="mt-3 font-display text-[26px] font-semibold">
            {profile.username}
          </h1>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {[
            {
              label: "Netto",
              value: formatAmount(stats.netto, prefs),
              color: nettoColor(stats.netto),
            },
            {
              label: "ROI",
              value: formatRoi(stats.roi),
              color: nettoColor(stats.roi),
            },
            { label: "Spel", value: String(stats.bets), color: "text-text" },
            {
              label: "Böcker",
              value: String(sheetList.length),
              color: "text-text",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-[12px] border border-line bg-panel px-3.5 py-3"
            >
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">
                {k.label}
              </div>
              <div className={`mt-1 font-mono-num text-[17px] font-semibold ${k.color}`}>
                {k.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <h2 className="mb-2 font-display text-[17px] font-semibold uppercase tracking-[0.04em]">
            Spelbokslista
          </h2>
          <div className="space-y-2">
            {sheetList.map((s) => {
              const st = computeStats(bets.filter((b) => b.sheet_id === s.id));
              return (
                <Link
                  key={s.id}
                  href={`/spelbok?sheet=${s.id}`}
                  className="flex items-center gap-3 rounded-[12px] border border-line bg-panel px-3.5 py-3 text-text no-underline"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{s.name}</span>
                      <Badge tone={s.is_public ? "win" : "muted"}>
                        {s.is_public ? "PUBLIK" : "PRIVAT"}
                      </Badge>
                    </div>
                    <div className="text-[12px] text-muted">{st.bets} spel</div>
                  </div>
                  <span className={`font-mono-num font-semibold ${nettoColor(st.netto)}`}>
                    {formatAmount(st.netto, prefs)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[12px] border border-line bg-panel">
          <Link
            href="/installningar#username"
            className="flex items-center justify-between border-b border-line-soft px-4 py-3.5 text-text no-underline"
          >
            <span className="font-semibold">Byt användarnamn</span>
            <span className="text-muted">›</span>
          </Link>
          <Link
            href="/spelbok"
            className="flex items-center justify-between border-b border-line-soft px-4 py-3.5 text-text no-underline"
          >
            <span className="font-semibold">Hantera spelböcker</span>
            <span className="text-muted">›</span>
          </Link>
          <div className="px-4 py-3">
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <div>
          <h1 className="font-display text-[32px] font-semibold">
            Inställningar
          </h1>
          <p className="text-muted">Uppdatera din profil</p>
        </div>
      </div>

      <div id="username">
        <Panel className="p-[18px]">
          <div className="mb-3 font-display text-lg font-semibold lg:hidden">
            Byt användarnamn
          </div>
          <SettingsForm profile={profile} />
        </Panel>
      </div>

      <Panel className="p-[18px]">
        <h2 className="mb-1.5 font-display text-lg font-semibold">
          Enheter och valuta
        </h2>
        <p className="mb-4 text-[14px] text-muted">
          Gäller alla dina spelböcker. Växla mellan units och valuta direkt i
          headern.
        </p>
        <DisplayPrefsForm prefs={prefs} />
      </Panel>

      {/* Notispanelens fotknapp länkar hit. */}
      <div id="notiser" className="scroll-mt-24">
        <NotificationSettingsCard settings={notificationSettings} />
      </div>

      <Panel className="p-[18px]">
        {/*
          Egen rubrik: push till enheten är en tredje kanal vid sidan av
          "I appen" och "Mejl" i kortet ovanför, och två rutor som båda
          heter Notiser på samma sida går inte att skilja åt.
        */}
        <h2 className="mb-1.5 font-display text-lg font-semibold">
          Push till enheten
        </h2>
        <p className="mb-4 text-[14px] text-muted">
          Meddelanden på låsskärmen, även när Spelbok är stängt.
        </p>
        <PushToggle />
        <div className="mt-4 border-t border-line-soft pt-4">
          <NotifySettleToggle
            enabled={profile.notify_settle !== false}
            persisted={typeof profile.notify_settle === "boolean"}
          />
        </div>
      </Panel>
    </div>
  );
}
