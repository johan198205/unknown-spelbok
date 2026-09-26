import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { AUTH_SCOPE_HEADER, cookieOptionsFor } from "./scope";

/**
 * Memoiserad per request: layout, header, footer och sidan delar samma klient
 * istället för att bygga en ny (och dubbla auth-anropen) i varje komponent.
 *
 * Under /admin och /api/admin läses adminsessionen istället för spelbokens
 * (se scope.ts), så allt som anropar createClient() där agerar som admin.
 */
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();
  const scope =
    (await headers()).get(AUTH_SCOPE_HEADER) === "admin" ? "admin" : "app";

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieOptionsFor(scope),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware will refresh sessions.
          }
        },
      },
    }
  );
});
