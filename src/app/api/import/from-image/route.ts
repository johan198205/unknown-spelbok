import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/import/rate-limit";
import {
  DAILY_IMAGE_IMPORT_LIMIT,
  MAX_IMPORT_IMAGE_BYTES,
  type ImportFromImageResponse,
} from "@/lib/import/types";
import {
  extractBetsFromImage,
  ImportVisionError,
  isAllowedImageMime,
} from "@/lib/import/vision";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Tolkar en skärmdump/kupong med Claude Vision och returnerar rader +
 * kanonisk mappning. Klienten går sedan vidare till /preview och /commit
 * — bilden sparas aldrig.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const minute = rateLimit(`import-image:${user.id}`, 3, 60_000);
  if (!minute.allowed) {
    return NextResponse.json(
      { error: "För många bildtolkningar. Vänta en stund." },
      { status: 429, headers: { "Retry-After": String(minute.retryAfter) } }
    );
  }

  const daily = rateLimit(
    `import-image-day:${user.id}`,
    DAILY_IMAGE_IMPORT_LIMIT,
    24 * 60 * 60 * 1000
  );
  if (!daily.allowed) {
    return NextResponse.json(
      {
        error: `Max ${DAILY_IMAGE_IMPORT_LIMIT} bildtolkningar per dygn. Försök igen imorgon.`,
      },
      { status: 429, headers: { "Retry-After": String(daily.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Trasig data." }, { status: 400 });
  }

  const mime = typeof body.mime === "string" ? body.mime.trim() : "";
  if (!isAllowedImageMime(mime)) {
    return NextResponse.json(
      { error: "Endast JPEG, PNG eller WebP." },
      { status: 400 }
    );
  }

  const filename =
    typeof body.filename === "string" && body.filename.trim()
      ? body.filename.trim().slice(0, 200)
      : "bildimport";

  const base64 =
    typeof body.image_base64 === "string" ? body.image_base64.trim() : "";
  if (!base64) {
    return NextResponse.json({ error: "Bilden saknas." }, { status: 400 });
  }

  // Tillåt data-URL-prefix om klienten skickar det.
  const rawB64 = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  let bytes: Buffer;
  try {
    bytes = Buffer.from(rawB64, "base64");
  } catch {
    return NextResponse.json({ error: "Ogiltig bilddata." }, { status: 400 });
  }

  if (!bytes.length) {
    return NextResponse.json({ error: "Bilden är tom." }, { status: 400 });
  }
  if (bytes.length > MAX_IMPORT_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Bilden är för stor (max 5 MB)." },
      { status: 400 }
    );
  }

  try {
    const result = await extractBetsFromImage({
      bytes,
      mime,
      filename,
    });

    if (!result.rows.length) {
      return NextResponse.json(
        { error: "Inga spel kunde läsas från bilden." },
        { status: 422 }
      );
    }

    const payload: ImportFromImageResponse = result;
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ImportVisionError) {
      const missingKey = /ANTHROPIC_API_KEY/.test(error.message);
      return NextResponse.json(
        {
          error: missingKey
            ? "AI-import är inte konfigurerad."
            : error.message || "Kunde inte tolka bilden.",
        },
        { status: missingKey ? 503 : 502 }
      );
    }
    console.error("import/from-image", error);
    return NextResponse.json(
      { error: "Kunde inte tolka bilden." },
      { status: 502 }
    );
  }
}
