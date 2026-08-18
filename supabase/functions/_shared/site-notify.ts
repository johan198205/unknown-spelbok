export function notifySite(body: unknown) {
  const site = Deno.env.get("SITE_URL") || Deno.env.get("NEXT_PUBLIC_SITE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!site || !key) return;
  void fetch(`${site.replace(/\/$/, "")}/api/internal/notify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).catch((err) => console.error("site notify", err));
}
