import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const src = request.nextUrl.searchParams.get("src") || null;
  const supabase = await createClient();

  const { data: bookmaker } = await supabase
    .from("bookmakers")
    .select("id, tracking_url, active")
    .eq("slug", slug)
    .maybeSingle();

  if (!bookmaker?.tracking_url || !bookmaker.active) {
    return NextResponse.redirect(new URL("/spelbolag", request.url), 302);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("affiliate_clicks").insert({
    bookmaker_id: bookmaker.id,
    user_id: user?.id ?? null,
    source: src,
  });

  return NextResponse.redirect(bookmaker.tracking_url, 302);
}
