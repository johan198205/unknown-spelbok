/**
 * Spärr för Edge Functions som bara får köras av cron och admin-routen.
 *
 * Gatewayens verify_jwt släpper igenom vilken giltig JWT som helst — även
 * den publika anon-nyckeln eller en inloggad användares token. Därför
 * kräver vi här att Authorization bär exakt projektets service role-nyckel.
 *
 * Anropare i dag (behöver inte ändras):
 *   - pg_cron via public.call_edge_function (db/cron.sql): Bearer = Vault-
 *     hemligheten 'edge_functions_key', som ska vara legacy service_role-JWT:n.
 *   - src/app/api/admin/sync/route.ts: Bearer = SUPABASE_SERVICE_ROLE_KEY.
 *
 * Nyckeln jämförs mot SUPABASE_SERVICE_ROLE_KEY, som Supabase injicerar
 * automatiskt i Edge Functions. Annars godtas en JWT med role service_role,
 * vars signatur gatewayen redan har kontrollerat (se jwtRole). De nya sb_secret_…-nycklarna
 * (SUPABASE_SECRET_KEYS) godtas också, så att ett byte till dem inte låser ute
 * cron.
 */

function allowedKeys(): string[] {
  const keys: string[] = [];
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) keys.push(legacy);

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, unknown>;
      for (const v of Object.values(parsed)) {
        if (typeof v === "string" && v) keys.push(v);
      }
    } catch {
      /* okänt format — ignoreras */
    }
  }
  return keys;
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/**
 * Role-claimet ur en JWT. Signaturen kontrolleras inte här — det gör
 * gatewayen, eftersom funktionerna deployas med verify_jwt påslaget
 * (standard, ingen supabase/config.toml stänger av det). Utan den kontrollen
 * vore claimet värdelöst, så deploya aldrig de här med --no-verify-jwt.
 *
 * Behövs för att SUPABASE_SERVICE_ROLE_KEY i funktionernas miljö inte är
 * samma sträng som legacy-JWT:n som cron och Next-appen skickar.
 */
function jwtRole(token: string): string | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

/** Returnerar ett 401-svar om anropet inte bär service role, annars null. */
export function requireServiceRole(req: Request): Response | null {
  const header = req.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim() ?? "";

  const keys = allowedKeys();
  if (token && keys.some((k) => timingSafeEqual(token, k))) return null;
  if (token && jwtRole(token) === "service_role") return null;

  if (keys.length === 0) {
    console.error("requireServiceRole: SUPABASE_SERVICE_ROLE_KEY saknas i miljön");
  }
  return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/** Wrappar en handler så att spärren alltid körs först. */
export function withServiceRole(
  handler: (req: Request) => Response | Promise<Response>
): (req: Request) => Response | Promise<Response> {
  return (req) => requireServiceRole(req) ?? handler(req);
}
