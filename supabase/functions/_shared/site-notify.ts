/**
 * Skickar push via Next.js-routen /api/internal/notify.
 *
 * MÅSTE await:as av anroparen. Deno Deploy river isolatet så fort
 * handlern returnerat sin Response — en fire-and-forget fetch hinner
 * då aldrig ut på nätet.
 */
export async function notifySite(body: unknown) {
  const site = Deno.env.get("SITE_URL") || Deno.env.get("NEXT_PUBLIC_SITE_URL");
  // Egen delad hemlighet, inte plattformsnyckeln: Supabase injicerar sitt
  // eget SUPABASE_SERVICE_ROLE_KEY i funktionen, och på projekt med nya
  // nyckelsystemet är det INTE samma sträng som Vercel har. Rutten jämför
  // exakt, så allt blev 403.
  const key =
    Deno.env.get("INTERNAL_NOTIFY_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!site || !key) {
    console.error(
      "site notify: hoppar över push — SITE_URL eller INTERNAL_NOTIFY_SECRET saknas"
    );
    return;
  }
  try {
    const res = await fetch(`${site.replace(/\/$/, "")}/api/internal/notify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("site notify", res.status, await res.text());
    }
  } catch (err) {
    console.error("site notify", err);
  }
}
