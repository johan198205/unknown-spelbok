import Link from "next/link";
import { DisplayModeToggle } from "@/components/layout/DisplayModeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getProfile } from "@/lib/auth";
import { formatAmount, type DisplayPrefs } from "@/lib/display";
import { getUnreadNotificationCount } from "@/lib/notifications-server";
import { initialOf, nettoColor } from "@/lib/utils";

export async function MobileHeader({
  username,
  netto,
  prefs,
}: {
  username?: string | null;
  netto: number;
  prefs: DisplayPrefs;
}) {
  // Båda är memoiserade per request — layouten har redan betalat för dem.
  const profile = username ? await getProfile() : null;
  const unread = profile ? await getUnreadNotificationCount() : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-[rgba(15,20,32,.92)] px-4 py-3 backdrop-blur-[10px] lg:hidden">
      <div className="flex items-center gap-3">
        <Link
          href="/hem"
          className="font-display text-[17px] font-bold tracking-[0.14em] text-text no-underline"
        >
          SPELBOK
        </Link>
        <div className="ml-auto flex items-center gap-2.5">
          {username ? <DisplayModeToggle /> : null}
          <span
            className={`font-mono-num text-[13px] font-semibold ${nettoColor(netto)}`}
          >
            {formatAmount(netto, prefs)}
          </span>
          {profile ? (
            <NotificationBell
              userId={profile.id}
              initialUnread={unread}
              /* Mobilheadern ligger på #0F1420, inte sidans #0B0E14. */
              badgeBorder="#0F1420"
            />
          ) : null}
          {username ? (
            <Link
              href="/installningar"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-panel-2 font-display text-sm font-semibold text-text no-underline"
              aria-label="Profil"
            >
              {initialOf(username)}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
