/** Kort URL-säker slug (nanoid-liknande, 8 tecken). */
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function randomSheetSlug(length = 8): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function sheetSharePath(slug: string) {
  return `/s/${slug}`;
}

export function sheetShareUrl(slug: string, origin?: string) {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${sheetSharePath(slug)}`;
}
