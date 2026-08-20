const BUCKET = "bookmaker-logos";
/** Äldre uppladdningar ligger kvar i bucketen `logos`. */
const LEGACY_BUCKET = "logos";

/**
 * Bygger public URL från en Storage-path, eller returnerar full URL orörd.
 * Accepterar även legacy fulla URLs som redan sparats i `logo_url`.
 */
export function getBookmakerLogoUrl(
  logoPath: string | null | undefined
): string | null {
  if (!logoPath) return null;
  const trimmed = logoPath.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;

  const path = trimmed.replace(/^\//, "");
  // Explicit bucket-prefix (t.ex. "logos/foo.png") → behåll bucketen
  if (path.startsWith(`${BUCKET}/`) || path.startsWith(`${LEGACY_BUCKET}/`)) {
    return `${base}/storage/v1/object/public/${path}`;
  }
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Första bokstaven för platshållare när bookmaker_id saknas. */
export function bookmakerInitial(name: string | null | undefined) {
  const letter = (name || "").trim().charAt(0);
  return letter ? letter.toUpperCase() : "?";
}
