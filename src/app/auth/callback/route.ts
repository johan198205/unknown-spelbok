import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Bara interna vägar — annars kan ?next= skicka användaren till en annan sajt. */
function safeNext(raw: string | null) {
  if (!raw) return "/hem";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/hem";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // Google skickar ?error= hit när användaren avbryter i samtyckesdialogen.
  const oauthError =
    searchParams.get("error_description") || searchParams.get("error");
  if (oauthError) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", oauthError);
    if (next !== "/hem") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", error.message);
    if (next !== "/hem") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  const target = new URL(next, origin);

  // GA-eventet måste triggas i webbläsaren (dataLayer finns inte här).
  // AuthEventTracker läser ?auth= på landningssidan och städar bort den.
  const created = data.user?.created_at
    ? Date.parse(data.user.created_at)
    : null;
  const signedIn = data.user?.last_sign_in_at
    ? Date.parse(data.user.last_sign_in_at)
    : null;
  const isNewUser =
    created !== null && signedIn !== null && signedIn - created < 10_000;
  target.searchParams.set("auth", isNewUser ? "signup_google" : "login_google");

  return NextResponse.redirect(target);
}
