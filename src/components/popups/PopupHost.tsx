import { getSessionUser } from "@/lib/auth";
import { getActivePopups } from "@/lib/popups-server";
import { PopupRenderer } from "@/components/popups/PopupRenderer";

/**
 * Monteras en gång i root-layouten. Hämtar alla aktiva popups och lämnar
 * över till klienten, som matchar mot sökvägen och kör triggern.
 *
 * Ingen popup betyder ingen klientkomponent alls — den absolut vanligaste
 * situationen ska inte kosta något JS.
 */
export async function PopupHost() {
  const [popups, user] = await Promise.all([
    getActivePopups(),
    getSessionUser(),
  ]);

  if (!popups.length) return null;

  return <PopupRenderer popups={popups} authed={!!user} />;
}
