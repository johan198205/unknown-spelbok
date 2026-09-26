import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { fetchSiteSettingsCached } from "@/lib/site-settings";
import {
  ADMIN_AUTH_COOKIE,
  AUTH_SCOPE_HEADER,
  cookieOptionsFor,
  isAdminAuthPath,
  scopeForPath,
} from "@/lib/supabase/scope";

const MAINTENANCE_PATH = "/underhall";

/** Vägar som måste fungera även i underhållsläge (inlogg, admin, API, PWA). */
function isMaintenanceExempt(path: string) {
  return (
    path === MAINTENANCE_PATH ||
    path.startsWith("/admin") ||
    path.startsWith("/login") ||
    path.startsWith("/registrera") ||
    path.startsWith("/auth") ||
    path.startsWith("/api") ||
    path.startsWith("/go") ||
    path.startsWith("/offline")
  );
}

export async function middleware(request: NextRequest) {
  const scope = scopeForPath(request.nextUrl.pathname);

  /** Vidarebefordrar requesten med scope-headern satt (och aldrig från klienten). */
  function next() {
    const headers = new Headers(request.headers);
    headers.set(AUTH_SCOPE_HEADER, scope);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("x-pathname", request.nextUrl.pathname);
    return res;
  }

  function redirectKeepingCookies(url: URL) {
    const redirect = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  let supabaseResponse = next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieOptionsFor(scope),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = next();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isApp =
    path.startsWith("/hem") ||
    path.startsWith("/spelbok") ||
    // Planket är inloggat läge: vyn planket_posts bär spel ur privata
    // spelböcker och är därför bara läsbar för authenticated.
    path.startsWith("/planket") ||
    path.startsWith("/statistik") ||
    path.startsWith("/tavlingar") ||
    path.startsWith("/installningar");
  const isAdmin = path === "/admin" || path.startsWith("/admin/");

  let role: string | null = null;
  async function loadRole() {
    if (!user || role !== null) return role;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role ?? "user";
    return role;
  }

  // Admin: egen session och egen inloggning, se lib/supabase/scope.ts.
  if (isAdmin) {
    const isAdminUser = !!user && (await loadRole()) === "admin";

    if (isAdminAuthPath(path)) {
      if (isAdminUser && path === "/admin/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        url.search = "";
        return redirectKeepingCookies(url);
      }
      return supabaseResponse;
    }

    if (!isAdminUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      const returnTo = path + (request.nextUrl.search || "");
      url.search = "";
      if (returnTo !== "/admin") url.searchParams.set("next", returnTo);
      return redirectKeepingCookies(url);
    }

    return supabaseResponse;
  }

  // Inloggade ska landa på Hem, inte marknadsföringsstartsidan.
  if (user && (path === "/" || path === "/login" || path === "/registrera")) {
    const url = request.nextUrl.clone();
    url.pathname = "/hem";
    url.search = "";
    return redirectKeepingCookies(url);
  }

  if (isApp && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const returnTo = path + (request.nextUrl.search || "");
    url.search = "";
    url.searchParams.set("next", returnTo);
    return NextResponse.redirect(url);
  }

  if (!isMaintenanceExempt(path)) {
    const site = await fetchSiteSettingsCached(supabase);

    // Tävlingar avstängda i inställningarna: sidan finns kvar men når ingen.
    if (!site.competitions_enabled && path.startsWith("/tavlingar")) {
      const url = request.nextUrl.clone();
      url.pathname = "/topplista";
      url.search = "";
      const redirect = NextResponse.redirect(url);
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }
      return redirect;
    }

    if (
      site.maintenance &&
      (await loadRole()) !== "admin" &&
      !(await hasAdminSession(request))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = MAINTENANCE_PATH;
      url.search = "";
      const rewrite = NextResponse.rewrite(url, { request });
      // Behåll de uppdaterade sessionskakorna från getUser() ovan.
      for (const cookie of supabaseResponse.cookies.getAll()) {
        rewrite.cookies.set(cookie);
      }
      rewrite.headers.set("x-pathname", path);
      return rewrite;
    }
  }

  return supabaseResponse;
}

/**
 * Admin ska kunna se sajten i underhållsläge även när hen bara är inloggad
 * i admin. Kakorna skrivs aldrig tillbaka härifrån — adminsessionen förnyas
 * när admin själv används.
 */
async function hasAdminSession(request: NextRequest) {
  if (!request.cookies.getAll().some((c) => c.name.startsWith(ADMIN_AUTH_COOKIE))) {
    return false;
  }
  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieOptionsFor("admin"),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );
  const {
    data: { user },
  } = await admin.auth.getUser();
  if (!user) return false;
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin";
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|swe-worker|manifest\\.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
