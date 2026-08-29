/**
 * Notiser från Planket.
 *
 * Server-only: allt skrivs med service role, aldrig från klienten.
 *
 * Två typer, två helt olika idempotenskontrakt:
 *
 *   back      en notis per ryggning. dedupe back:{post_back_id} — id:t är
 *             unikt, så nyckeln kan aldrig krocka och raden skrivs en gång.
 *
 *   reaction  SAMLAD per inlägg och timme. dedupe reaction:{post_id}:{timme}.
 *             Den här är den enda notisen i appen som skrivs OM: andra
 *             reaktionen inom samma timme uppdaterar titeln till
 *             "3 personer reagerade på ditt inlägg" i stället för att lägga
 *             en rad till. Ett DO NOTHING hade låst räknaren på ett.
 *
 * Ingen notis till en själv: att rygga sitt eget spel eller gilla sitt eget
 * inlägg ska inte pinga.
 */

import { formatPick } from "@/lib/picks";
import {
  normalizeSettings,
  NOTIFICATION_SETTINGS_COLUMNS,
} from "@/lib/notifications";
import { planketOdds } from "@/lib/planket";
import { createAdminClient } from "@/lib/supabase/admin";

/** Har användaren Planket-notiser i appen påslagna? Saknad rad ger defaults. */
async function wantsPlanket(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notification_settings")
    .select(NOTIFICATION_SETTINGS_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  return normalizeSettings(data as Record<string, unknown> | null).planket_in_app;
}

/** Timfönstret som reaktionsnotisen samlas i. 2026-08-29T14 */
export function reactionHourKey(date = new Date()) {
  return date.toISOString().slice(0, 13);
}

/**
 * "{användarnamn} ryggade ditt spel".
 *
 * Fel här får aldrig fälla ryggningen — spelet är redan bokfört när vi
 * kommer hit. Loggas och släpps.
 */
export async function notifyPostBacked({
  postId,
  postBackId,
  authorId,
  backerId,
  backerUsername,
  match,
  pick,
  odds,
}: {
  postId: string;
  postBackId: string;
  authorId: string;
  backerId: string;
  backerUsername: string;
  match: string;
  pick: string;
  odds: number;
}) {
  if (authorId === backerId) return;

  try {
    if (!(await wantsPlanket(authorId))) return;

    const admin = createAdminClient();
    await admin.from("notifications").upsert(
      {
        user_id: authorId,
        type: "back",
        title: `${backerUsername} ryggade ditt spel`,
        body: `${match} · ${formatPick(pick)} @ ${planketOdds(odds)}`,
        dedupe_key: `back:${postBackId}`,
        target_type: "post",
        target_id: postId,
      },
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }
    );
  } catch (error) {
    console.error("planket: kunde inte skapa ryggningsnotis", error);
  }
}

/**
 * "{n} personer reagerade på ditt inlägg" — en rad per inlägg och timme.
 *
 * Räknar distinkta användare, inte reaktioner: samma person som ger både
 * 🔥 och 👍 är en person, inte två.
 */
export async function notifyPostReaction({
  postId,
  authorId,
  reactorId,
}: {
  postId: string;
  authorId: string;
  reactorId: string;
}) {
  if (authorId === reactorId) return;

  try {
    if (!(await wantsPlanket(authorId))) return;

    const admin = createAdminClient();
    const hourStart = new Date();
    hourStart.setMinutes(0, 0, 0);

    const { data: rows } = await admin
      .from("post_reactions")
      .select("user_id")
      .eq("post_id", postId)
      .gte("created_at", hourStart.toISOString())
      .neq("user_id", authorId);

    const people = new Set((rows ?? []).map((r) => r.user_id)).size;
    if (people < 1) return;

    await admin.from("notifications").upsert(
      {
        user_id: authorId,
        type: "reaction",
        title:
          people === 1
            ? "Någon reagerade på ditt inlägg"
            : `${people} personer reagerade på ditt inlägg`,
        body: "",
        dedupe_key: `reaction:${postId}:${reactionHourKey(hourStart)}`,
        target_type: "post",
        target_id: postId,
      },
      // ignoreDuplicates: false — den här SKA skriva om raden så räknaren
      // följer med. Det är avsiktligt och gäller bara reaktionsnotisen.
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: false }
    );
  } catch (error) {
    console.error("planket: kunde inte skapa reaktionsnotis", error);
  }
}
