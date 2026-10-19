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
import { getT } from "@/lib/texts/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Tolkar en skärmdump/kupong med Claude Vision och returnerar rader +
 * kanonisk mappning. Klienten går sedan vidare till /preview och /commit
 * — bilden sparas aldrig.
 */
export async function POST(request: Request) {
  const [supabase, t] = await Promise.all([createClient(), getT()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t("import.api.notLoggedIn") }, { status: 401 });
  }

  const minute = rateLimit(`import-image:${user.id}`, 3, 60_000);
  if (!minute.allowed) {
    return NextResponse.json(
      { error: t("import.api.imageRateLimited") },
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
        error: t("import.api.imageDailyLimit", { max: DAILY_IMAGE_IMPORT_LIMIT }),
      },
      { status: 429, headers: { "Retry-After": String(daily.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: t("import.request.broken") }, { status: 400 });
  }

  const mime = typeof body.mime === "string" ? body.mime.trim() : "";
  if (!isAllowedImageMime(mime)) {
    return NextResponse.json(
      { error: t("import.image.wrongType") },
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
    return NextResponse.json({ error: t("import.api.imageMissing") }, { status: 400 });
  }

  // Tillåt data-URL-prefix om klienten skickar det.
  const rawB64 = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  let bytes: Buffer;
  try {
    bytes = Buffer.from(rawB64, "base64");
  } catch {
    return NextResponse.json({ error: t("import.api.imageInvalid") }, { status: 400 });
  }

  if (!bytes.length) {
    return NextResponse.json({ error: t("import.api.imageEmpty") }, { status: 400 });
  }
  if (bytes.length > MAX_IMPORT_IMAGE_BYTES) {
    return NextResponse.json(
      { error: t("import.image.tooLarge") },
      { status: 400 }
    );
  }

  try {
    const result = await extractBetsFromImage({
      bytes,
      mime,
      filename,
      t,
    });

    if (!result.rows.length) {
      return NextResponse.json(
        { error: t("import.vision.noticeNoBets") },
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
            ? t("import.api.aiNotConfigured")
            : error.message || t("import.image.failed"),
        },
        { status: missingKey ? 503 : 502 }
      );
    }
    console.error("import/from-image", error);
    return NextResponse.json(
      { error: t("import.image.failed") },
      { status: 502 }
    );
  }
}
