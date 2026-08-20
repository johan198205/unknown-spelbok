function isHockey(sport?: string | null) {
  return (sport || "").toLowerCase().includes("hockey");
}

/** Fallback när fixtures-cachen saknar logo_url men har team-id. */
export function teamLogoUrl(
  logo: string | null | undefined,
  teamId: number | null | undefined,
  sport?: string | null
) {
  if (logo) return logo;
  if (teamId == null) return null;
  return `https://media.api-sports.io/${isHockey(sport) ? "hockey" : "football"}/teams/${teamId}.png`;
}

/** Fallback när fixtures-cachen saknar league_logo men har league_id. */
export function leagueLogoUrl(
  logo: string | null | undefined,
  leagueId: number | null | undefined,
  sport?: string | null
) {
  if (logo) return logo;
  if (leagueId == null) return null;
  return `https://media.api-sports.io/${isHockey(sport) ? "hockey" : "football"}/leagues/${leagueId}.png`;
}

/** Första bokstaven i lagnamn (platshållare när logo saknas). */
export function teamInitial(name: string | null | undefined) {
  const letter = (name || "").trim().charAt(0);
  return letter ? letter.toUpperCase() : "?";
}

/**
 * Deterministiska tvåbokstavs-initialer från liganamn.
 * "Allsvenskan" → "AL", "Champions League" → "CL".
 * Aldrig sportkod (FB) — samma liga ger alltid samma initialer.
 */
export function leagueInitials(name: string | null | undefined) {
  const parts = (name || "")
    .trim()
    .replace(/[^\wÅÄÖåäö\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Logga för en bet-rad: sparad kolumn, annars via kopplad fixture. */
export function betLeagueLogo(bet: {
  league_logo?: string | null;
  league_id?: number | null;
  sport?: string | null;
  fixtures?: {
    league_logo?: string | null;
    league_id?: number | null;
    sport?: string | null;
  } | null;
}) {
  return leagueLogoUrl(
    bet.league_logo ?? bet.fixtures?.league_logo,
    bet.league_id ?? bet.fixtures?.league_id,
    bet.sport ?? bet.fixtures?.sport
  );
}

/** Delar "Hemma – Borta" / "Hemma - Borta" för manuella matcher. */
export function parseMatchSides(match: string) {
  const parts = match.split(/\s+[–−-]\s+/);
  if (parts.length < 2) return null;
  const home = parts[0]?.trim();
  const away = parts.slice(1).join(" – ").trim();
  if (!home || !away) return null;
  return { home, away };
}
