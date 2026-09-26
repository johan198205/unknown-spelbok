/**
 * Admin har en egen Supabase-session, skild från spelbokens.
 *
 * Båda loggar in mot samma Supabase-projekt, men sessionen sparas i en egen
 * kaka. Att vara inloggad i spelboken ger alltså ingen åtkomst till /admin,
 * och man kan vara inloggad med olika konton i de två delarna samtidigt.
 *
 * Middleware avgör vilken del en request tillhör och skickar det vidare i
 * AUTH_SCOPE_HEADER, så att createClient() i server.ts läser rätt kaka i
 * sidor, server actions och API-routes utan att varje anrop behöver veta det.
 */
export const ADMIN_AUTH_COOKIE = "sb-spelbok-admin-auth";
export const AUTH_SCOPE_HEADER = "x-spelbok-auth-scope";

export type AuthScope = "app" | "admin";

export function scopeForPath(path: string): AuthScope {
  return path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/api/admin" ||
    path.startsWith("/api/admin/")
    ? "admin"
    : "app";
}

export function cookieOptionsFor(scope: AuthScope) {
  return scope === "admin" ? { name: ADMIN_AUTH_COOKIE } : undefined;
}

/** Sidor under /admin som ska nås utan adminsession. */
export function isAdminAuthPath(path: string) {
  return path === "/admin/login" || path === "/admin/registrera";
}
