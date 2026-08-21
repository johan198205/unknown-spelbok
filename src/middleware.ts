import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { fetchSiteSettingsCached } from "@/lib/site-settings";

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
  let supabaseResponse = NextResponse.next({ request });
  supabaseResponse.headers.set("x-pathname", request.nextUrl.pathname);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          supabaseResponse.headers.set(
            "x-pathname",
            request.nextUrl.pathname
          );
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
    path.startsWith("/statistik") ||
    path.startsWith("/tavlingar") ||
    path.startsWith("/installningar");
  const isAdmin = path.startsWith("/admin");

  // Inloggade ska landa på Hem, inte marknadsföringsstartsidan.
  if (user && (path === "/" || path === "/login" || path === "/registrera")) {
    const url = request.nextUrl.clone();
    url.pathname = "/hem";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  if ((isApp || isAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const returnTo = path + (request.nextUrl.search || "");
    url.search = "";
    url.searchParams.set("next", returnTo);
    return NextResponse.redirect(url);
  }

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

  if (isAdmin && user) {
    if ((await loadRole()) !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/spelbok";
      return NextResponse.redirect(url);
    }
  }

  if (!isMaintenanceExempt(path)) {
    const site = await fetchSiteSettingsCached(supabase);
    if (site.maintenance && (await loadRole()) !== "admin") {
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|swe-worker|manifest\\.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
