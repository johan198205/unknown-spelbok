/** Fallback när fixtures-cachen saknar logo_url men har team-id. */
export function teamLogoUrl(
  logo: string | null | undefined,
  teamId: number | null | undefined,
  sport?: string | null
) {
  if (logo) return logo;
  if (teamId == null) return null;
  const hockey = (sport || "").toLowerCase().includes("hockey");
  return `https://media.api-sports.io/${hockey ? "hockey" : "football"}/teams/${teamId}.png`;
}
