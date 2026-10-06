import Link from "next/link";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { FormattedAmount } from "@/components/FormattedAmount";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getProfile } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications-server";
import { initialOf, nettoColor } from "@/lib/utils";

export async function MobileHeader({
  username,
  netto,
}: {
  username?: string | null;
  netto: number;
}) {
  // Memoiserad per request — layouten har redan betalat för profilen.
  const profile = username ? await getProfile() : null;
  const unread = profile ? await getUnreadNotificationCount() : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-[rgba(15,20,32,.92)] px-4 py-3 backdrop-blur-[10px] lg:hidden">
      {/* min-w-0 hela vägen: ett långt saldo får krympa i stället för att
          trycka ut headern bredare än skärmen (sidledsscroll i mobil). */}
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/hem"
          className="shrink-0 font-display text-[17px] font-bold tracking-[0.14em] text-text no-underline"
        >
          SPELBOK
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <span
            className={`min-w-0 truncate font-mono-num text-[13px] font-semibold ${nettoColor(netto)}`}
          >
            <FormattedAmount value={netto} />
          </span>
          {/* Ordning: saldo → profilbild → notisklocka → meny. */}
          {username ? (
            <Link
              href="/installningar"
              className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-panel-2 font-display text-sm font-semibold text-text no-underline"
              aria-label="Profil"
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initialOf(username)
              )}
            </Link>
          ) : null}
          {profile ? (
            <NotificationBell
              userId={profile.id}
              initialUnread={unread}
              /* Mobilheadern ligger på #0F1420, inte sidans #0B0E14. */
              badgeBorder="#0F1420"
            />
          ) : null}
          <MobileMenu
            user={
              profile
                ? {
                    username: profile.username,
                    avatarUrl: profile.avatar_url,
                    netto,
                    isAdmin: profile.role === "admin",
                  }
                : null
            }
          />
        </div>
      </div>
    </header>
  );
}
